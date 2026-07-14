UPDATE doc_spaces
SET repository_full_name = NULL,
    source_mode = 'cms',
    docs_root = '';
--> statement-breakpoint
UPDATE documents
SET source_type = CASE WHEN source_type = 'ai' THEN 'ai' ELSE 'cms' END,
    source_path = NULL,
    source_sha = NULL,
    edit_url = NULL;
--> statement-breakpoint
UPDATE projects
SET repository_url = NULL,
    source = 'manual',
    github_full_name = NULL,
    github_pushed_at = NULL,
    synced_at = NULL,
    stars = 0,
    forks = 0;
--> statement-breakpoint
INSERT OR IGNORE INTO ai_settings (
  id, enabled, provider, api_url, api_key, model, system_prompt, updated_at
) VALUES (
  'default', 0, 'openai', 'https://api.openai.com/v1', NULL, 'gpt-4o-mini', NULL,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);
--> statement-breakpoint
DROP INDEX IF EXISTS uq_doc_spaces_repository_full_name;
--> statement-breakpoint
DROP INDEX IF EXISTS uq_projects_github_full_name;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS ai_agent_runs (
  id TEXT PRIMARY KEY,
  help_center_id TEXT NOT NULL REFERENCES doc_spaces(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning',
  summary TEXT,
  error TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS ai_agent_steps (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES ai_agent_runs(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  detail TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(run_id, step_order)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS ai_agent_changes (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES ai_agent_runs(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
  parent_title TEXT,
  title TEXT NOT NULL,
  description TEXT,
  content_md TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  applied_at TEXT
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_ai_agent_runs_center_created
  ON ai_agent_runs(help_center_id, created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_ai_agent_runs_status
  ON ai_agent_runs(status, updated_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_ai_agent_steps_run_order
  ON ai_agent_steps(run_id, step_order);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_ai_agent_changes_run_order
  ON ai_agent_changes(run_id, sort_order, created_at);
