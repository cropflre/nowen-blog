import { sql } from 'drizzle-orm';
import { db, sqlite } from './client';
import { seedIfEmpty } from './seed';
import { ensureSearchIndex } from '../modules/search/search.service';

const CREATE_TABLES = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  avatar_url TEXT,
  bio TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT,
  content_md TEXT NOT NULL,
  content_html TEXT,
  cover_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  visibility TEXT NOT NULL DEFAULT 'public',
  is_featured INTEGER NOT NULL DEFAULT 0,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  reading_time INTEGER NOT NULL DEFAULT 0,
  word_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  seo_title TEXT,
  seo_description TEXT,
  canonical_url TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  author_id TEXT NOT NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  color TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  filename TEXT,
  storage_key TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  alt TEXT,
  content_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS post_categories (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  parent_id TEXT,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  author_website TEXT,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  ip_hash TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  approved_at TEXT,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

CREATE INDEX IF NOT EXISTS idx_posts_status_published ON posts(status, published_at);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_featured ON posts(is_featured);
`;
// 注意：posts.id 为 TEXT 主键，没有可用作 content_rowid 的整型列，
// 因此不采用 external content 方案，而是独立存储索引内容。
// id 列标记为 UNINDEXED（仅用于回查文章，不参与全文匹配）。
const CREATE_FTS =
  "CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(" +
  "  id UNINDEXED," +
  "  title," +
  "  summary," +
  "  content_md," +
  "  tokenize = 'unicode61'" +
  ")";

let initialized = false;

export function initDb(): void {
  if (initialized) return;
  sqlite.exec(CREATE_TABLES);
  sqlite.exec(CREATE_FTS);
  // 触发一次轻量查询，确保连接可用
  db.run(sql`SELECT 1`);
  seedIfEmpty();
  // 兜底：索引为空时从存量已发布文章重建（避免存量数据搜不到）
  ensureSearchIndex();
  initialized = true;
}
