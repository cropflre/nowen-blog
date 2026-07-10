import type { SiteSettings } from '@blog/shared';

/**
 * 首次启动时写入数据库的站点默认配置。
 * 环境变量仅作为初始化默认值；后台保存后以数据库配置为准。
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
  footerText: process.env.SITE_FOOTER_TEXT ?? null,
  defaultSeoTitle: process.env.SITE_DEFAULT_SEO_TITLE ?? null,
  defaultSeoDescription: process.env.SITE_DEFAULT_SEO_DESCRIPTION ?? null,
  defaultOgImage: process.env.SITE_DEFAULT_OG_IMAGE ?? null,
  commentsEnabled: process.env.SITE_COMMENTS_ENABLED !== 'false',
};
