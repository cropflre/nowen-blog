import type { SiteSettings } from '@blog/shared';

/**
 * 站点默认配置。后期可迁移到数据库 settings 表，
 * 并通过 /api/admin/settings 在后台编辑（见 BLOG 后续阶段）。
 */
export const siteSettings: SiteSettings = {
  siteTitle: process.env.SITE_TITLE ?? 'NOWEN Blog',
  siteDescription:
    process.env.SITE_DESCRIPTION ?? '一个内容优先、视觉高级的个人技术博客。',
  slogan: process.env.SITE_SLOGAN ?? 'Write. Build. Share.',
  logoUrl: process.env.SITE_LOGO_URL ?? null,
  faviconUrl: process.env.SITE_FAVICON_URL ?? null,
  authorName: process.env.SITE_AUTHOR ?? 'NOWEN',
  social: {
    github: process.env.SITE_GITHUB ?? 'https://github.com/cropflre',
    twitter: process.env.SITE_TWITTER ?? null,
    email: process.env.SITE_EMAIL ?? null,
    rss: true,
  },
  themeColor: process.env.SITE_THEME_COLOR ?? '#6366f1',
  icp: process.env.SITE_ICP ?? null,
};
