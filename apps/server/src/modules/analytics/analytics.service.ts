import { createHmac } from 'node:crypto';
import { env } from '../../config/env';
import { sqlite } from '../../db/client';
import { nowIso, randomId } from '../../lib/format';

const VIEW_DEDUPE_MS = 30 * 60 * 1000;
const ANALYTICS_KEY = env.sessionSecret ?? 'nowen-blog-anonymous-analytics';
const BOT_PATTERN = /bot|crawler|spider|slurp|preview|lighthouse|headless|facebookexternalhit|whatsapp|telegram/i;

export interface RecordPostViewInput {
  slug: string;
  visitorId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
}

export interface RecordPostViewResult {
  counted: boolean;
  viewCount: number;
}

export interface DashboardStats {
  summary: {
    totalViews: number;
    trackedViews: number;
    uniqueVisitors: number;
    viewsToday: number;
    viewsLast7Days: number;
    publishedPosts: number;
    draftPosts: number;
    pendingComments: number;
    approvedComments: number;
  };
  trend: Array<{ date: string; views: number; visitors: number }>;
  topPosts: Array<{
    id: string;
    title: string;
    slug: string;
    viewCount: number;
    trackedViews: number;
    uniqueVisitors: number;
    lastViewedAt: string | null;
  }>;
  trackingStartedAt: string | null;
  generatedAt: string;
}

function hashAnonymousValue(value: string): string {
  return createHmac('sha256', ANALYTICS_KEY).update(value).digest('hex');
}

function normalizeVisitorSource(visitorId: string | null | undefined, ip: string, userAgent: string): string {
  const normalized = visitorId?.trim();
  if (normalized && normalized.length >= 8 && normalized.length <= 128) {
    return `browser:${normalized}`;
  }
  return `fallback:${ip}|${userAgent}`;
}

function startOfUtcDay(daysAgo = 0): Date {
  const value = new Date();
  value.setUTCHours(0, 0, 0, 0);
  value.setUTCDate(value.getUTCDate() - daysAgo);
  return value;
}

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/**
 * 记录一次真实文章访问。
 * - 文章详情读取本身不计数，避免预渲染、后台调用和爬虫误增；
 * - 同一匿名访客 30 分钟内重复打开同一文章只计一次；
 * - 仅保存 HMAC 哈希，不保存原始 IP 和浏览器访客 ID。
 */
export function recordPostView(input: RecordPostViewInput): RecordPostViewResult | null {
  const post = sqlite
    .prepare(
      "SELECT id, view_count AS viewCount FROM posts WHERE slug = ? AND status = 'published' AND visibility = 'public' LIMIT 1",
    )
    .get(input.slug) as { id: string; viewCount: number } | undefined;

  if (!post) return null;

  const userAgent = (input.userAgent ?? '').slice(0, 500);
  if (BOT_PATTERN.test(userAgent)) {
    return { counted: false, viewCount: Number(post.viewCount) };
  }

  const ip = (input.ip ?? 'unknown').trim().slice(0, 128) || 'unknown';
  const visitorHash = hashAnonymousValue(normalizeVisitorSource(input.visitorId, ip, userAgent));
  const ipHash = ip === 'unknown' ? null : hashAnonymousValue(`ip:${ip}`);
  const referrer = input.referrer?.trim().slice(0, 500) || null;
  const createdAt = nowIso();
  const dedupeSince = new Date(Date.now() - VIEW_DEDUPE_MS).toISOString();

  const duplicate = sqlite
    .prepare(
      'SELECT 1 FROM post_views WHERE post_id = ? AND visitor_hash = ? AND created_at >= ? LIMIT 1',
    )
    .get(post.id, visitorHash, dedupeSince);

  if (duplicate) {
    return { counted: false, viewCount: Number(post.viewCount) };
  }

  const insertAndIncrement = sqlite.transaction(() => {
    sqlite
      .prepare(
        `INSERT INTO post_views
          (id, post_id, visitor_hash, ip_hash, user_agent, referrer, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(randomId('pv_'), post.id, visitorHash, ipHash, userAgent || null, referrer, createdAt);
    sqlite.prepare('UPDATE posts SET view_count = view_count + 1 WHERE id = ?').run(post.id);
    const updated = sqlite.prepare('SELECT view_count AS viewCount FROM posts WHERE id = ?').get(post.id) as {
      viewCount: number;
    };
    return Number(updated.viewCount);
  });

  return { counted: true, viewCount: insertAndIncrement() };
}

export function getDashboardStats(): DashboardStats {
  const today = startOfUtcDay(0).toISOString();
  const sevenDaysAgo = startOfUtcDay(6).toISOString();
  const trendStart = startOfUtcDay(13);

  const summary = sqlite
    .prepare(
      `SELECT
        COALESCE((SELECT SUM(view_count) FROM posts), 0) AS totalViews,
        (SELECT COUNT(*) FROM post_views) AS trackedViews,
        (SELECT COUNT(DISTINCT visitor_hash) FROM post_views) AS uniqueVisitors,
        (SELECT COUNT(*) FROM post_views WHERE created_at >= ?) AS viewsToday,
        (SELECT COUNT(*) FROM post_views WHERE created_at >= ?) AS viewsLast7Days,
        (SELECT COUNT(*) FROM posts WHERE status = 'published') AS publishedPosts,
        (SELECT COUNT(*) FROM posts WHERE status = 'draft') AS draftPosts,
        (SELECT COUNT(*) FROM comments WHERE status = 'pending' AND deleted_at IS NULL) AS pendingComments,
        (SELECT COUNT(*) FROM comments WHERE status = 'approved' AND deleted_at IS NULL) AS approvedComments`,
    )
    .get(today, sevenDaysAgo) as DashboardStats['summary'];

  const trendRows = sqlite
    .prepare(
      `SELECT substr(created_at, 1, 10) AS date,
              COUNT(*) AS views,
              COUNT(DISTINCT visitor_hash) AS visitors
       FROM post_views
       WHERE created_at >= ?
       GROUP BY substr(created_at, 1, 10)
       ORDER BY date ASC`,
    )
    .all(trendStart.toISOString()) as Array<{ date: string; views: number; visitors: number }>;

  const trendByDate = new Map(trendRows.map((item) => [item.date, item]));
  const trend = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(trendStart);
    date.setUTCDate(date.getUTCDate() + index);
    const key = dateKey(date);
    const item = trendByDate.get(key);
    return {
      date: key,
      views: Number(item?.views ?? 0),
      visitors: Number(item?.visitors ?? 0),
    };
  });

  const topPosts = sqlite
    .prepare(
      `SELECT p.id,
              p.title,
              p.slug,
              p.view_count AS viewCount,
              COUNT(pv.id) AS trackedViews,
              COUNT(DISTINCT pv.visitor_hash) AS uniqueVisitors,
              MAX(pv.created_at) AS lastViewedAt
       FROM posts p
       LEFT JOIN post_views pv ON pv.post_id = p.id
       WHERE p.status = 'published'
       GROUP BY p.id, p.title, p.slug, p.view_count, p.published_at
       ORDER BY p.view_count DESC, p.published_at DESC
       LIMIT 8`,
    )
    .all() as DashboardStats['topPosts'];

  const tracking = sqlite
    .prepare('SELECT MIN(created_at) AS trackingStartedAt FROM post_views')
    .get() as { trackingStartedAt: string | null };

  return {
    summary: {
      totalViews: Number(summary.totalViews),
      trackedViews: Number(summary.trackedViews),
      uniqueVisitors: Number(summary.uniqueVisitors),
      viewsToday: Number(summary.viewsToday),
      viewsLast7Days: Number(summary.viewsLast7Days),
      publishedPosts: Number(summary.publishedPosts),
      draftPosts: Number(summary.draftPosts),
      pendingComments: Number(summary.pendingComments),
      approvedComments: Number(summary.approvedComments),
    },
    trend: trend.map((item) => ({
      date: item.date,
      views: Number(item.views),
      visitors: Number(item.visitors),
    })),
    topPosts: topPosts.map((item) => ({
      ...item,
      viewCount: Number(item.viewCount),
      trackedViews: Number(item.trackedViews),
      uniqueVisitors: Number(item.uniqueVisitors),
    })),
    trackingStartedAt: tracking.trackingStartedAt,
    generatedAt: nowIso(),
  };
}
