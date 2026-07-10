import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env';
import { sqlite } from '../../db/client';
import { nowIso, randomId } from '../../lib/format';
import { getSiteSettings } from '../settings/settings.service';
import type { SubscriberListInput } from './newsletter.schema';

interface SubscriberRow {
  id: string;
  email: string;
  status: 'active' | 'unsubscribed';
  source: string;
  subscribedAt: string;
  unsubscribedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CampaignRow {
  id: string;
  postId: string | null;
  postTitle: string | null;
  subject: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  status: string;
  providerMessage: string | null;
  createdAt: string;
  sentAt: string | null;
}

interface PublishedPostRow {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
}

const SUBSCRIBER_SELECT = `
  SELECT id,
         email,
         status,
         source,
         subscribed_at AS subscribedAt,
         unsubscribed_at AS unsubscribedAt,
         created_at AS createdAt,
         updated_at AS updatedAt
  FROM newsletter_subscribers
`;

const recentSubscriptions = new Map<string, number[]>();
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 5;

function assertRateLimit(clientKey: string): void {
  const now = Date.now();
  const recent = (recentSubscriptions.get(clientKey) ?? []).filter((time) => now - time < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) throw new Error('订阅操作过于频繁，请稍后再试');
  recent.push(now);
  recentSubscriptions.set(clientKey, recent);
}

function signingSecret(): string {
  if (env.sessionSecret) return env.sessionSecret;
  if (env.nodeEnv === 'production') throw new Error('生产环境必须配置 SESSION_SECRET');
  return 'dev-newsletter-secret-change-me';
}

export function createUnsubscribeToken(email: string): string {
  const payload = Buffer.from(email.toLowerCase(), 'utf8').toString('base64url');
  const signature = createHmac('sha256', signingSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function emailFromToken(token: string): string | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = createHmac('sha256', signingSecret()).update(payload).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const email = Buffer.from(payload, 'base64url').toString('utf8').trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  } catch {
    return null;
  }
}

export function subscribe(email: string, source: string, clientKey: string): { ok: true; message: string } {
  assertRateLimit(clientKey);
  const normalized = email.trim().toLowerCase();
  const now = nowIso();
  const existing = sqlite
    .prepare('SELECT id, status FROM newsletter_subscribers WHERE email = ? LIMIT 1')
    .get(normalized) as { id: string; status: string } | undefined;

  if (existing) {
    if (existing.status !== 'active') {
      sqlite
        .prepare(
          `UPDATE newsletter_subscribers
           SET status = 'active', source = ?, subscribed_at = ?, unsubscribed_at = NULL, updated_at = ?
           WHERE id = ?`,
        )
        .run(source, now, now, existing.id);
    }
    return { ok: true, message: '订阅成功，后续文章更新会发送到你的邮箱。' };
  }

  sqlite
    .prepare(
      `INSERT INTO newsletter_subscribers (
        id, email, status, source, subscribed_at, unsubscribed_at, created_at, updated_at
      ) VALUES (?, ?, 'active', ?, ?, NULL, ?, ?)`,
    )
    .run(randomId('sub_'), normalized, source, now, now, now);
  return { ok: true, message: '订阅成功，后续文章更新会发送到你的邮箱。' };
}

export function unsubscribeByToken(token: string): { ok: true; message: string } {
  const email = emailFromToken(token);
  if (!email) throw new Error('退订链接无效或已损坏');
  const now = nowIso();
  sqlite
    .prepare(
      `UPDATE newsletter_subscribers
       SET status = 'unsubscribed', unsubscribed_at = ?, updated_at = ?
       WHERE email = ?`,
    )
    .run(now, now, email);
  return { ok: true, message: '已停止向该邮箱发送文章更新。' };
}

export function listSubscribers(input: SubscriberListInput): {
  items: SubscriberRow[];
  total: number;
  page: number;
  pageSize: number;
  stats: { active: number; unsubscribed: number; total: number };
  campaigns: CampaignRow[];
  providerConfigured: boolean;
} {
  const where = input.status === 'all' ? '' : 'WHERE status = ?';
  const args = input.status === 'all' ? [] : [input.status];
  const total = (
    sqlite.prepare(`SELECT COUNT(*) AS total FROM newsletter_subscribers ${where}`).get(...args) as {
      total: number;
    }
  ).total;
  const offset = (input.page - 1) * input.pageSize;
  const items = sqlite
    .prepare(`${SUBSCRIBER_SELECT} ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...args, input.pageSize, offset) as SubscriberRow[];
  const statsRows = sqlite
    .prepare('SELECT status, COUNT(*) AS total FROM newsletter_subscribers GROUP BY status')
    .all() as Array<{ status: string; total: number }>;
  const stats = { active: 0, unsubscribed: 0, total: 0 };
  for (const row of statsRows) {
    if (row.status === 'active') stats.active = row.total;
    if (row.status === 'unsubscribed') stats.unsubscribed = row.total;
    stats.total += row.total;
  }
  const campaigns = sqlite
    .prepare(
      `SELECT c.id,
              c.post_id AS postId,
              p.title AS postTitle,
              c.subject,
              c.recipient_count AS recipientCount,
              c.sent_count AS sentCount,
              c.failed_count AS failedCount,
              c.status,
              c.provider_message AS providerMessage,
              c.created_at AS createdAt,
              c.sent_at AS sentAt
       FROM newsletter_campaigns c
       LEFT JOIN posts p ON p.id = c.post_id
       ORDER BY c.created_at DESC
       LIMIT 20`,
    )
    .all() as CampaignRow[];
  return {
    items,
    total,
    page: input.page,
    pageSize: input.pageSize,
    stats,
    campaigns,
    providerConfigured: Boolean(env.resendApiKey && env.newsletterFromEmail),
  };
}

export function setSubscriberStatus(id: string, status: 'active' | 'unsubscribed'): SubscriberRow | null {
  const now = nowIso();
  const result = sqlite
    .prepare(
      `UPDATE newsletter_subscribers
       SET status = ?, subscribed_at = CASE WHEN ? = 'active' THEN ? ELSE subscribed_at END,
           unsubscribed_at = CASE WHEN ? = 'unsubscribed' THEN ? ELSE NULL END,
           updated_at = ?
       WHERE id = ?`,
    )
    .run(status, status, now, status, now, now, id);
  if (!result.changes) return null;
  return sqlite.prepare(`${SUBSCRIBER_SELECT} WHERE id = ? LIMIT 1`).get(id) as SubscriberRow;
}

export function deleteSubscriber(id: string): boolean {
  return sqlite.prepare('DELETE FROM newsletter_subscribers WHERE id = ?').run(id).changes > 0;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function absoluteUrl(path: string): string {
  return new URL(path, env.baseUrl.endsWith('/') ? env.baseUrl : `${env.baseUrl}/`).toString();
}

function emailHtml(post: PublishedPostRow, email: string): string {
  const settings = getSiteSettings();
  const postUrl = absoluteUrl(`/posts/${encodeURIComponent(post.slug)}`);
  const unsubscribeUrl = absoluteUrl(`/unsubscribe?token=${encodeURIComponent(createUnsubscribeToken(email))}`);
  const summary = escapeHtml(post.summary || '一篇新的文章已经发布，欢迎阅读。');
  return `<!doctype html>
<html lang="zh-CN">
  <body style="margin:0;background:#f6f7fb;color:#171923;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
    <div style="max-width:640px;margin:0 auto;padding:40px 20px">
      <div style="background:#ffffff;border:1px solid #e8eaf0;border-radius:18px;padding:32px">
        <p style="margin:0 0 18px;color:${escapeHtml(settings.themeColor)};font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(settings.siteTitle)}</p>
        <h1 style="margin:0;font-size:28px;line-height:1.35">${escapeHtml(post.title)}</h1>
        <p style="margin:18px 0 28px;color:#5f6673;font-size:16px;line-height:1.8">${summary}</p>
        <a href="${escapeHtml(postUrl)}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:${escapeHtml(settings.themeColor)};color:#ffffff;text-decoration:none;font-weight:700">阅读文章</a>
      </div>
      <p style="margin:20px 0 0;text-align:center;color:#8a909b;font-size:12px;line-height:1.7">
        你收到此邮件是因为订阅了 ${escapeHtml(settings.siteTitle)}。<br>
        <a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b7280">停止接收文章更新</a>
      </p>
    </div>
  </body>
</html>`;
}

async function sendWithResend(email: string, subject: string, post: PublishedPostRow): Promise<void> {
  if (!env.resendApiKey || !env.newsletterFromEmail) throw new Error('邮件服务未配置');
  const token = encodeURIComponent(createUnsubscribeToken(email));
  const oneClickUrl = absoluteUrl(`/api/newsletter/unsubscribe-one-click?token=${token}`);
  const body: Record<string, unknown> = {
    from: env.newsletterFromEmail,
    to: [email],
    subject,
    html: emailHtml(post, email),
    headers: {
      'List-Unsubscribe': `<${oneClickUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
  if (env.newsletterReplyTo) body.reply_to = env.newsletterReplyTo;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const payload = (await response.json()) as { message?: string; error?: string };
      detail = payload.message || payload.error || detail;
    } catch {
      // ignore malformed provider payload
    }
    throw new Error(detail);
  }
}

export async function sendPostNewsletter(postId: string, customSubject?: string): Promise<CampaignRow> {
  if (!env.resendApiKey || !env.newsletterFromEmail) {
    throw new Error('邮件服务未配置，请设置 RESEND_API_KEY 和 NEWSLETTER_FROM_EMAIL');
  }
  const post = sqlite
    .prepare(
      `SELECT id, title, slug, summary
       FROM posts
       WHERE id = ? AND status = 'published' AND visibility = 'public'
       LIMIT 1`,
    )
    .get(postId) as PublishedPostRow | undefined;
  if (!post) throw new Error('只能发送已发布且公开的文章');

  const recipients = sqlite
    .prepare("SELECT email FROM newsletter_subscribers WHERE status = 'active' ORDER BY created_at ASC LIMIT 1000")
    .all() as Array<{ email: string }>;
  const campaignId = randomId('camp_');
  const subject = customSubject || `新文章：${post.title}`;
  const createdAt = nowIso();
  sqlite
    .prepare(
      `INSERT INTO newsletter_campaigns (
        id, post_id, subject, recipient_count, sent_count, failed_count,
        status, provider_message, created_at, sent_at
      ) VALUES (?, ?, ?, ?, 0, 0, 'sending', NULL, ?, NULL)`,
    )
    .run(campaignId, post.id, subject, recipients.length, createdAt);

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  for (let index = 0; index < recipients.length; index += 5) {
    const batch = recipients.slice(index, index + 5);
    const results = await Promise.allSettled(
      batch.map(async ({ email }) => {
        await sendWithResend(email, subject, post);
      }),
    );
    for (const result of results) {
      if (result.status === 'fulfilled') sent += 1;
      else {
        failed += 1;
        if (errors.length < 5) {
          errors.push(result.reason instanceof Error ? result.reason.message : '未知发送错误');
        }
      }
    }
  }

  const status = failed === 0 ? 'completed' : sent === 0 ? 'failed' : 'partial';
  const sentAt = nowIso();
  sqlite
    .prepare(
      `UPDATE newsletter_campaigns
       SET sent_count = ?, failed_count = ?, status = ?, provider_message = ?, sent_at = ?
       WHERE id = ?`,
    )
    .run(sent, failed, status, errors.length ? errors.join('；') : null, sentAt, campaignId);

  return sqlite
    .prepare(
      `SELECT c.id,
              c.post_id AS postId,
              p.title AS postTitle,
              c.subject,
              c.recipient_count AS recipientCount,
              c.sent_count AS sentCount,
              c.failed_count AS failedCount,
              c.status,
              c.provider_message AS providerMessage,
              c.created_at AS createdAt,
              c.sent_at AS sentAt
       FROM newsletter_campaigns c
       LEFT JOIN posts p ON p.id = c.post_id
       WHERE c.id = ?`,
    )
    .get(campaignId) as CampaignRow;
}
