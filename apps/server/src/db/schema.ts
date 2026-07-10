import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('admin'),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/** 单行站点设置表，固定使用 id=site。 */
export const siteSettings = sqliteTable('site_settings', {
  id: text('id').primaryKey(),
  siteTitle: text('site_title').notNull(),
  siteDescription: text('site_description').notNull(),
  slogan: text('slogan').notNull(),
  logoUrl: text('logo_url'),
  faviconUrl: text('favicon_url'),
  authorName: text('author_name').notNull(),
  githubUrl: text('github_url'),
  twitterUrl: text('twitter_url'),
  email: text('email'),
  rssEnabled: integer('rss_enabled', { mode: 'boolean' }).notNull().default(true),
  themeColor: text('theme_color').notNull().default('#6366f1'),
  icp: text('icp'),
  footerText: text('footer_text'),
  defaultSeoTitle: text('default_seo_title'),
  defaultSeoDescription: text('default_seo_description'),
  defaultOgImage: text('default_og_image'),
  commentsEnabled: integer('comments_enabled', { mode: 'boolean' }).notNull().default(true),
  updatedAt: text('updated_at').notNull(),
});

export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  summary: text('summary'),
  contentMd: text('content_md').notNull(),
  contentHtml: text('content_html'),
  coverUrl: text('cover_url'),
  status: text('status').notNull().default('draft'),
  visibility: text('visibility').notNull().default('public'),
  isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),
  isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
  readingTime: integer('reading_time').notNull().default(0),
  wordCount: integer('word_count').notNull().default(0),
  viewCount: integer('view_count').notNull().default(0),
  likeCount: integer('like_count').notNull().default(0),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  canonicalUrl: text('canonical_url'),
  scheduledAt: text('scheduled_at'),
  publishedAt: text('published_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  authorId: text('author_id').notNull().references(() => users.id),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  color: text('color'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  color: text('color'),
  createdAt: text('created_at').notNull(),
});

export const assets = sqliteTable('assets', {
  id: text('id').primaryKey(),
  filename: text('filename'),
  storageKey: text('storage_key').notNull().unique(),
  url: text('url').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  width: integer('width'),
  height: integer('height'),
  alt: text('alt'),
  contentHash: text('content_hash'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  parentId: text('parent_id'),
  authorName: text('author_name').notNull(),
  authorEmail: text('author_email').notNull(),
  authorWebsite: text('author_website'),
  content: text('content').notNull(),
  status: text('status').notNull().default('pending'),
  ipHash: text('ip_hash'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  approvedAt: text('approved_at'),
  deletedAt: text('deleted_at'),
});

/** 匿名访问明细。只保存哈希标识，不保存原始 IP 或浏览器访客 ID。 */
export const postViews = sqliteTable('post_views', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  visitorHash: text('visitor_hash').notNull(),
  ipHash: text('ip_hash'),
  userAgent: text('user_agent'),
  referrer: text('referrer'),
  createdAt: text('created_at').notNull(),
});

/** 手动保存、发布、归档和恢复时生成的不可变版本快照。 */
export const postVersions = sqliteTable('post_versions', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  snapshotJson: text('snapshot_json').notNull(),
  reason: text('reason').notNull(),
  createdBy: text('created_by').references(() => users.id),
  createdAt: text('created_at').notNull(),
});

/** 编辑中的自动草稿，与正式文章分离，避免自动保存直接修改线上内容。 */
export const postAutosaves = sqliteTable('post_autosaves', {
  postId: text('post_id').primaryKey().references(() => posts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  payloadJson: text('payload_json').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const postCategories = sqliteTable(
  'post_categories',
  {
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.postId, t.categoryId] }) }),
);

export const postTags = sqliteTable(
  'post_tags',
  {
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.postId, t.tagId] }) }),
);

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  categoryLinks: many(postCategories),
  tagLinks: many(postTags),
  views: many(postViews),
}));

export const postViewsRelations = relations(postViews, ({ one }) => ({
  post: one(posts, { fields: [postViews.postId], references: [posts.id] }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  postLinks: many(postCategories),
}));

export const postCategoriesRelations = relations(postCategories, ({ one }) => ({
  post: one(posts, { fields: [postCategories.postId], references: [posts.id] }),
  category: one(categories, {
    fields: [postCategories.categoryId],
    references: [categories.id],
  }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  postLinks: many(postTags),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, { fields: [postTags.postId], references: [posts.id] }),
  tag: one(tags, { fields: [postTags.tagId], references: [tags.id] }),
}));
