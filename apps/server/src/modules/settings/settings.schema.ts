import { z } from 'zod';

const nullableText = (max: number) =>
  z.union([z.string().trim().max(max), z.null()]).transform((value) => value || null);

const nullableUrl = z
  .union([z.string().trim().max(500), z.null()])
  .refine(
    (value) =>
      value === null ||
      value === '' ||
      value.startsWith('/') ||
      value.startsWith('http://') ||
      value.startsWith('https://'),
    '地址必须是 http(s) URL 或站内绝对路径',
  )
  .transform((value) => value || null);

const nullableEmail = z
  .union([z.string().trim().email('邮箱格式不正确'), z.literal(''), z.null()])
  .transform((value) => value || null);

export const siteSettingsSchema = z.object({
  siteTitle: z.string().trim().min(1, '站点标题不能为空').max(80),
  siteDescription: z.string().trim().min(1, '站点描述不能为空').max(300),
  slogan: z.string().trim().min(1, '站点标语不能为空').max(120),
  logoUrl: nullableUrl,
  faviconUrl: nullableUrl,
  authorName: z.string().trim().min(1, '作者名称不能为空').max(80),
  social: z.object({
    twitter: nullableUrl,
    email: nullableEmail,
    rss: z.boolean(),
  }),
  themeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, '主题色必须是六位十六进制颜色'),
  icp: nullableText(120),
  footerText: nullableText(300),
  defaultSeoTitle: nullableText(80),
  defaultSeoDescription: nullableText(300),
  defaultOgImage: nullableUrl,
  commentsEnabled: z.boolean(),
});

export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;
