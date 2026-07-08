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
