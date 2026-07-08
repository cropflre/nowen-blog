import { z } from 'zod';

export const postStatusSchema = z.enum(['draft', 'published', 'archived']);

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  color: z.string().nullable(),
  sortOrder: z.number(),
});

export const tagSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  color: z.string().nullable(),
});

export const authorSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatarUrl: z.string().nullable(),
  bio: z.string().nullable(),
});

export const postSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  summary: z.string().nullable(),
  coverUrl: z.string().nullable(),
  status: postStatusSchema,
  isFeatured: z.boolean(),
  isPinned: z.boolean(),
  readingTime: z.number(),
  viewCount: z.number(),
  likeCount: z.number(),
  publishedAt: z.string().nullable(),
  updatedAt: z.string(),
  author: authorSchema,
  categories: z.array(categorySchema),
  tags: z.array(tagSchema),
});

export const postDetailSchema = postSummarySchema.extend({
  contentMd: z.string(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  canonicalUrl: z.string().nullable(),
  createdAt: z.string(),
});

export const archiveSchema = z.object({
  year: z.number(),
  total: z.number(),
  months: z.array(
    z.object({
      month: z.number(),
      total: z.number(),
      posts: z.array(postSummarySchema),
    }),
  ),
});

export const siteSettingsSchema = z.object({
  siteTitle: z.string(),
  siteDescription: z.string(),
  slogan: z.string(),
  logoUrl: z.string().nullable(),
  faviconUrl: z.string().nullable(),
  authorName: z.string(),
  social: z.object({
    github: z.string().nullable(),
    twitter: z.string().nullable(),
    email: z.string().nullable(),
    rss: z.boolean(),
  }),
  themeColor: z.string(),
  icp: z.string().nullable(),
});

export const searchResultSchema = z.object({
  query: z.string(),
  items: z.array(postSummarySchema),
  total: z.number(),
});

export const paginatedSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  });
