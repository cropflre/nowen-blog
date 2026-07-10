import type { SiteSettings } from '@blog/shared';
import { siteSettings as defaultSettings } from '../../config/site';
import { sqlite } from '../../db/client';
import { nowIso } from '../../lib/format';
import type { SiteSettingsInput } from './settings.schema';

interface SiteSettingsRow {
  siteTitle: string;
  siteDescription: string;
  slogan: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  authorName: string;
  githubUrl: string | null;
  twitterUrl: string | null;
  email: string | null;
  rssEnabled: number;
  themeColor: string;
  icp: string | null;
  footerText: string | null;
  defaultSeoTitle: string | null;
  defaultSeoDescription: string | null;
  defaultOgImage: string | null;
  commentsEnabled: number;
  updatedAt: string;
}

export interface AdminSiteSettings extends SiteSettings {
  updatedAt: string;
}

const SELECT_SETTINGS = `
  SELECT site_title AS siteTitle,
         site_description AS siteDescription,
         slogan,
         logo_url AS logoUrl,
         favicon_url AS faviconUrl,
         author_name AS authorName,
         github_url AS githubUrl,
         twitter_url AS twitterUrl,
         email,
         rss_enabled AS rssEnabled,
         theme_color AS themeColor,
         icp,
         footer_text AS footerText,
         default_seo_title AS defaultSeoTitle,
         default_seo_description AS defaultSeoDescription,
         default_og_image AS defaultOgImage,
         comments_enabled AS commentsEnabled,
         updated_at AS updatedAt
  FROM site_settings
  WHERE id = 'site'
  LIMIT 1
`;

function toSettings(row: SiteSettingsRow): AdminSiteSettings {
  return {
    siteTitle: row.siteTitle,
    siteDescription: row.siteDescription,
    slogan: row.slogan,
    logoUrl: row.logoUrl,
    faviconUrl: row.faviconUrl,
    authorName: row.authorName,
    social: {
      github: row.githubUrl,
      twitter: row.twitterUrl,
      email: row.email,
      rss: Boolean(row.rssEnabled),
    },
    themeColor: row.themeColor,
    icp: row.icp,
    footerText: row.footerText,
    defaultSeoTitle: row.defaultSeoTitle,
    defaultSeoDescription: row.defaultSeoDescription,
    defaultOgImage: row.defaultOgImage,
    commentsEnabled: Boolean(row.commentsEnabled),
    updatedAt: row.updatedAt,
  };
}

export function ensureSiteSettings(): void {
  const existing = sqlite.prepare("SELECT 1 FROM site_settings WHERE id = 'site' LIMIT 1").get();
  if (existing) return;

  const now = nowIso();
  sqlite
    .prepare(
      `INSERT INTO site_settings (
        id, site_title, site_description, slogan, logo_url, favicon_url,
        author_name, github_url, twitter_url, email, rss_enabled, theme_color,
        icp, footer_text, default_seo_title, default_seo_description,
        default_og_image, comments_enabled, updated_at
      ) VALUES ('site', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      defaultSettings.siteTitle,
      defaultSettings.siteDescription,
      defaultSettings.slogan,
      defaultSettings.logoUrl,
      defaultSettings.faviconUrl,
      defaultSettings.authorName,
      defaultSettings.social.github,
      defaultSettings.social.twitter,
      defaultSettings.social.email,
      defaultSettings.social.rss ? 1 : 0,
      defaultSettings.themeColor,
      defaultSettings.icp,
      defaultSettings.footerText,
      defaultSettings.defaultSeoTitle,
      defaultSettings.defaultSeoDescription,
      defaultSettings.defaultOgImage,
      defaultSettings.commentsEnabled ? 1 : 0,
      now,
    );
}

export function getAdminSiteSettings(): AdminSiteSettings {
  ensureSiteSettings();
  const row = sqlite.prepare(SELECT_SETTINGS).get() as SiteSettingsRow | undefined;
  if (!row) throw new Error('站点设置初始化失败');
  return toSettings(row);
}

export function getSiteSettings(): SiteSettings {
  const { updatedAt: _updatedAt, ...settings } = getAdminSiteSettings();
  return settings;
}

export function updateSiteSettings(input: SiteSettingsInput): AdminSiteSettings {
  ensureSiteSettings();
  const updatedAt = nowIso();
  sqlite
    .prepare(
      `UPDATE site_settings SET
        site_title = ?,
        site_description = ?,
        slogan = ?,
        logo_url = ?,
        favicon_url = ?,
        author_name = ?,
        github_url = ?,
        twitter_url = ?,
        email = ?,
        rss_enabled = ?,
        theme_color = ?,
        icp = ?,
        footer_text = ?,
        default_seo_title = ?,
        default_seo_description = ?,
        default_og_image = ?,
        comments_enabled = ?,
        updated_at = ?
      WHERE id = 'site'`,
    )
    .run(
      input.siteTitle,
      input.siteDescription,
      input.slogan,
      input.logoUrl,
      input.faviconUrl,
      input.authorName,
      input.social.github,
      input.social.twitter,
      input.social.email,
      input.social.rss ? 1 : 0,
      input.themeColor,
      input.icp,
      input.footerText,
      input.defaultSeoTitle,
      input.defaultSeoDescription,
      input.defaultOgImage,
      input.commentsEnabled ? 1 : 0,
      updatedAt,
    );
  return getAdminSiteSettings();
}
