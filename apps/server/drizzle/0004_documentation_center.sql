CREATE TABLE IF NOT EXISTS doc_spaces (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_url TEXT,
  default_version_id TEXT,
  repository_full_name TEXT,
  source_mode TEXT NOT NULL DEFAULT 'cms',
  docs_root TEXT NOT NULL DEFAULT 'docs',
  is_published INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS doc_versions (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES doc_spaces(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  label TEXT NOT NULL,
  source_ref TEXT,
  status TEXT NOT NULL DEFAULT 'published',
  is_default INTEGER NOT NULL DEFAULT 0,
  is_deprecated INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(space_id, version)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES doc_spaces(id) ON DELETE CASCADE,
  version_id TEXT NOT NULL REFERENCES doc_versions(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  path TEXT NOT NULL,
  description TEXT,
  content_md TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  visibility TEXT NOT NULL DEFAULT 'public',
  sort_order INTEGER NOT NULL DEFAULT 0,
  depth INTEGER NOT NULL DEFAULT 0,
  source_type TEXT NOT NULL DEFAULT 'cms',
  source_path TEXT,
  source_sha TEXT,
  edit_url TEXT,
  seo_title TEXT,
  seo_description TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(version_id, path)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS document_revisions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'save',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  UNIQUE(document_id, version)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS document_redirects (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES doc_spaces(id) ON DELETE CASCADE,
  version_id TEXT REFERENCES doc_versions(id) ON DELETE CASCADE,
  from_path TEXT NOT NULL,
  to_path TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 301,
  created_at TEXT NOT NULL,
  UNIQUE(space_id, version_id, from_path)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS document_feedback (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  helpful INTEGER NOT NULL,
  reason TEXT,
  comment TEXT,
  visitor_hash TEXT,
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_doc_spaces_public_sort
  ON doc_spaces(is_published, sort_order, updated_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_doc_versions_space_sort
  ON doc_versions(space_id, is_default, sort_order, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_documents_tree
  ON documents(space_id, version_id, parent_id, sort_order);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_documents_public
  ON documents(space_id, version_id, status, visibility, sort_order);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_documents_updated
  ON documents(updated_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_document_revisions_document
  ON document_revisions(document_id, version DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_document_feedback_document
  ON document_feedback(document_id, created_at DESC);
--> statement-breakpoint
CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
  title,
  description,
  content_md,
  content='documents',
  content_rowid='rowid'
);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS documents_fts_insert AFTER INSERT ON documents BEGIN
  INSERT INTO documents_fts(rowid, title, description, content_md)
  VALUES (new.rowid, new.title, COALESCE(new.description, ''), new.content_md);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS documents_fts_delete AFTER DELETE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, title, description, content_md)
  VALUES ('delete', old.rowid, old.title, COALESCE(old.description, ''), old.content_md);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS documents_fts_update AFTER UPDATE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, title, description, content_md)
  VALUES ('delete', old.rowid, old.title, COALESCE(old.description, ''), old.content_md);
  INSERT INTO documents_fts(rowid, title, description, content_md)
  VALUES (new.rowid, new.title, COALESCE(new.description, ''), new.content_md);
END;
--> statement-breakpoint
INSERT INTO documents_fts(documents_fts) VALUES ('rebuild');
