import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  index,
  uniqueIndex,
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

/** 单行 AI 写作助手配置，API Key 仅通过管理员接口写入且读取时掩码。 */
export const aiSettings = sqliteTable('ai_settings', {
  id: text('id').primaryKey(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  provider: text('provider').notNull().default('openai'),
  apiUrl: text('api_url').notNull().default('https://api.openai.com/v1'),
  apiKey: text('api_key'),
  model: text('model').notNull().default('gpt-4o-mini'),
  systemPrompt: text('system_prompt'),
  updatedAt: text('updated_at').notNull(),
});

export const posts = sqliteTable(
  'posts',
  {
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
  },
  (table) => ({
    statusPublishedIdx: index('idx_posts_status_published').on(table.status, table.publishedAt),
    statusScheduledIdx: index('idx_posts_status_scheduled').on(table.status, table.scheduledAt),
    slugIdx: index('idx_posts_slug').on(table.slug),
    featuredIdx: index('idx_posts_featured').on(table.isFeatured),
  }),
);

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

export const comments = sqliteTable(
  'comments',
  {
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
  },
  (table) => ({
    postIdx: index('idx_comments_post_id').on(table.postId),
    statusIdx: index('idx_comments_status').on(table.status),
    createdAtIdx: index('idx_comments_created_at').on(table.createdAt),
  }),
);

/** 匿名访问明细。只保存哈希标识，不保存原始 IP 或浏览器访客 ID。 */
export const postViews = sqliteTable(
  'post_views',
  {
    id: text('id').primaryKey(),
    postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
    visitorHash: text('visitor_hash').notNull(),
    ipHash: text('ip_hash'),
    userAgent: text('user_agent'),
    referrer: text('referrer'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    postCreatedIdx: index('idx_post_views_post_created').on(table.postId, table.createdAt),
    visitorCreatedIdx: index('idx_post_views_visitor_created').on(table.visitorHash, table.createdAt),
    createdAtIdx: index('idx_post_views_created_at').on(table.createdAt),
  }),
);

/** 手动保存、发布、归档和恢复时生成的不可变版本快照。 */
export const postVersions = sqliteTable(
  'post_versions',
  {
    id: text('id').primaryKey(),
    postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    snapshotJson: text('snapshot_json').notNull(),
    reason: text('reason').notNull(),
    createdBy: text('created_by').references(() => users.id),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    postVersionUnique: uniqueIndex('uq_post_versions_post_version').on(table.postId, table.version),
    postVersionIdx: index('idx_post_versions_post_version').on(table.postId, table.version),
  }),
);

/** 编辑中的自动草稿，与正式文章分离，避免自动保存直接修改线上内容。 */
export const postAutosaves = sqliteTable('post_autosaves', {
  postId: text('post_id').primaryKey().references(() => posts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  payloadJson: text('payload_json').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/** 作品集项目，既支持手动维护，也支持 GitHub 元数据同步。 */
export const projects = sqliteTable(
  'projects',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    coverUrl: text('cover_url'),
    repositoryUrl: text('repository_url'),
    homepageUrl: text('homepage_url'),
    language: text('language'),
    topicsJson: text('topics_json').notNull().default('[]'),
    stars: integer('stars').notNull().default(0),
    forks: integer('forks').notNull().default(0),
    source: text('source').notNull().default('manual'),
    githubFullName: text('github_full_name'),
    githubPushedAt: text('github_pushed_at'),
    syncedAt: text('synced_at'),
    isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),
    isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    githubFullNameUnique: uniqueIndex('uq_projects_github_full_name').on(table.githubFullName),
    publicSortIdx: index('idx_projects_public_sort').on(
      table.isPublished,
      table.isFeatured,
      table.sortOrder,
      table.updatedAt,
    ),
  }),
);

/** 邮件订阅者。退订令牌由邮箱和服务端密钥签名生成，不保存明文令牌。 */
export const newsletterSubscribers = sqliteTable(
  'newsletter_subscribers',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    status: text('status').notNull().default('active'),
    source: text('source').notNull().default('homepage'),
    subscribedAt: text('subscribed_at').notNull(),
    unsubscribedAt: text('unsubscribed_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    statusCreatedIdx: index('idx_newsletter_subscribers_status_created').on(
      table.status,
      table.createdAt,
    ),
  }),
);

/** 已发送的文章订阅通知，用于审计发送数量和失败情况。 */
export const newsletterCampaigns = sqliteTable(
  'newsletter_campaigns',
  {
    id: text('id').primaryKey(),
    postId: text('post_id').references(() => posts.id, { onDelete: 'set null' }),
    subject: text('subject').notNull(),
    recipientCount: integer('recipient_count').notNull().default(0),
    sentCount: integer('sent_count').notNull().default(0),
    failedCount: integer('failed_count').notNull().default(0),
    status: text('status').notNull().default('pending'),
    providerMessage: text('provider_message'),
    createdAt: text('created_at').notNull(),
    sentAt: text('sent_at'),
  },
  (table) => ({
    createdAtIdx: index('idx_newsletter_campaigns_created').on(table.createdAt),
  }),
);

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
  (table) => ({ pk: primaryKey({ columns: [table.postId, table.categoryId] }) }),
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
  (table) => ({ pk: primaryKey({ columns: [table.postId, table.tagId] }) }),
);

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  categoryLinks: many(postCategories),
  tagLinks: many(postTags),
  views: many(postViews),
  newsletterCampaigns: many(newsletterCampaigns),
}));

export const postViewsRelations = relations(postViews, ({ one }) => ({
  post: one(posts, { fields: [postViews.postId], references: [posts.id] }),
}));

export const newsletterCampaignsRelations = relations(newsletterCampaigns, ({ one }) => ({
  post: one(posts, { fields: [newsletterCampaigns.postId], references: [posts.id] }),
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
