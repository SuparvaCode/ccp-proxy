-- FCC Database Schema

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('cloud', 'local')),
  base_url TEXT,
  api_key_encrypted TEXT,
  enabled INTEGER DEFAULT 1,
  extra_config TEXT DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS model_routes (
  id TEXT PRIMARY KEY,
  claude_variant TEXT NOT NULL,  -- opus | sonnet | haiku | default | custom_name
  provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL,        -- provider-specific model ID
  priority INTEGER DEFAULT 0,
  enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usage_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  provider_id TEXT,
  model_id TEXT,
  claude_variant TEXT,
  endpoint TEXT,             -- messages | responses | count_tokens
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  status INTEGER DEFAULT 200,
  error_message TEXT,
  request_id TEXT,
  stream INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_timestamp ON usage_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_logs_provider ON usage_logs(provider_id);

CREATE TABLE IF NOT EXISTS provider_models_cache (
  provider_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  model_name TEXT,
  description TEXT,
  context_length INTEGER,
  capabilities TEXT DEFAULT '[]',
  cached_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (provider_id, model_id)
);
