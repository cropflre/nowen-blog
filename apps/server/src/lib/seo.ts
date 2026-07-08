import { env } from '../config/env';

/** 转义 XML 特殊字符，避免破坏 XML 结构。 */
export function escapeXml(s: string | null | undefined): string {
  return (s ?? '').replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&apos;';
      default:
        return c;
    }
  });
}

/** 基于 BASE_URL 生成绝对地址。 */
export function absoluteUrl(path: string): string {
  const base = env.baseUrl.replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

/** 格式化为 RSS 所需的 RFC822 时间（UTC）。 */
export function formatRssDate(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  return isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
}

/** 格式化为 Sitemap 所需的 W3C 日期（YYYY-MM-DD）。 */
export function formatSitemapDate(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  return isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}

/** 去除 Markdown 标记，保留纯文本（用于 RSS description 兜底）。 */
export function stripMarkdown(md: string | null | undefined): string {
  if (!md) return '';
  return md
    .replace(/```[\s\S]*?```/g, ' ') // 代码块
    .replace(/`([^`]+)`/g, '$1') // 行内代码
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // 图片
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // 链接保留文字
    .replace(/^#{1,6}\s+/gm, '') // 标题符号
    .replace(/[*_~>#]/g, ' ') // 强调/引用等符号
    .replace(/\s+/g, ' ')
    .trim();
}

/** 截断文本并补省略号。 */
export function truncateText(text: string, max = 200): string {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
