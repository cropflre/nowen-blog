CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  cover_url TEXT,
  repository_url TEXT,
  homepage_url TEXT,
  language TEXT,
  topics_json TEXT NOT NULL DEFAULT '[]',
  stars INTEGER NOT NULL DEFAULT 0,
  forks INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  github_full_name TEXT,
  github_pushed_at TEXT,
  synced_at TEXT,
  is_featured INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS uq_projects_github_full_name
  ON projects(github_full_name)
  WHERE github_full_name IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_projects_public_sort
  ON projects(is_published, is_featured, sort_order, updated_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  source TEXT NOT NULL DEFAULT 'homepage',
  subscribed_at TEXT NOT NULL,
  unsubscribed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status_created
  ON newsletter_subscribers(status, created_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id TEXT PRIMARY KEY,
  post_id TEXT REFERENCES posts(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  provider_message TEXT,
  created_at TEXT NOT NULL,
  sent_at TEXT
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_created
  ON newsletter_campaigns(created_at);
