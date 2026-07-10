import { resolveTxt } from 'node:dns/promises';
import { parseArgs } from './lib.mjs';

const args = parseArgs();
const apiKey = args['api-key'] || process.env.RESEND_API_KEY;
const from = args.from || process.env.NEWSLETTER_FROM_EMAIL;
const sendTo = args.to || process.env.EMAIL_SMOKE_TO;
const replyTo = args['reply-to'] || process.env.NEWSLETTER_REPLY_TO;

if (!apiKey) throw new Error('缺少 RESEND_API_KEY。');
if (!from) throw new Error('缺少 NEWSLETTER_FROM_EMAIL。');

function extractEmail(value) {
  const match = String(value).match(/<([^<>]+)>\s*$/);
  const email = (match?.[1] || value).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('NEWSLETTER_FROM_EMAIL 格式不正确。');
  }
  return email;
}

async function resend(path, init = {}) {
  const response = await fetch(`https://api.resend.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!response.ok) {
    throw new Error(`Resend ${path} 返回 ${response.status}：${body?.message || body?.error || text.slice(0, 300)}`);
  }
  return body;
}

const senderEmail = extractEmail(from);
const domain = senderEmail.split('@')[1];
const domainsPayload = await resend('/domains');
const domains = Array.isArray(domainsPayload?.data)
  ? domainsPayload.data
  : Array.isArray(domainsPayload)
    ? domainsPayload
    : [];
const matched = domains.find((item) => String(item?.name || '').toLowerCase() === domain);
if (!matched) throw new Error(`Resend 中未找到发件域名 ${domain}。`);

const status = String(matched.status || '').toLowerCase();
if (status !== 'verified') {
  throw new Error(`发件域名 ${domain} 当前状态为 ${status || 'unknown'}，尚未完成发送验证。`);
}

let dmarc = [];
let dmarcWarning = null;
try {
  dmarc = (await resolveTxt(`_dmarc.${domain}`)).map((parts) => parts.join(''));
  if (!dmarc.some((value) => /^v=DMARC1;/i.test(value))) {
    dmarcWarning = '检测到 TXT，但没有有效的 v=DMARC1 记录。';
  }
} catch (error) {
  dmarcWarning = `未检测到 _dmarc.${domain}：${error instanceof Error ? error.message : String(error)}`;
}

let delivery = null;
if (sendTo) {
  const recipient = extractEmail(sendTo);
  const id = `blog20-${Date.now().toString(36)}`;
  const payload = {
    from,
    to: [recipient],
    subject: `[BLOG-20] 邮件发送验收 ${id}`,
    html: `<div style="font-family:system-ui,sans-serif;line-height:1.7"><h1>NOWEN Blog 邮件验收</h1><p>Resend 域名验证与真实投递测试已发起。</p><p>验收编号：<strong>${id}</strong></p></div>`,
  };
  if (replyTo) payload.reply_to = replyTo;
  const sent = await resend('/emails', { method: 'POST', body: JSON.stringify(payload) });
  delivery = { recipient, providerId: sent?.id || null, acceptanceId: id };
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checkedAt: new Date().toISOString(),
      senderEmail,
      domain,
      resendStatus: status,
      dmarc,
      dmarcWarning,
      delivery,
    },
    null,
    2,
  ),
);
