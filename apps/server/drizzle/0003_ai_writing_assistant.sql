CREATE TABLE IF NOT EXISTS ai_settings (
  id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0,
  provider TEXT NOT NULL DEFAULT 'openai',
  api_url TEXT NOT NULL DEFAULT 'https://api.openai.com/v1',
  api_key TEXT,
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  system_prompt TEXT,
  updated_at TEXT NOT NULL
);
