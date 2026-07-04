// ═══════════════════════════════════════════════════════════════
//   ██████╗ ██████╗██████╗ 
//  ██╔════╝██╔════╝██╔══██╗   Claude Code Proxy (CCP)
//  ██║     ██║     ██████╔╝   Powered by SuparvaCodes
//  ██║     ██║     ██╔═══╝ 
//  ╚██████╗╚██████╗██║        Copyright (c) 2026 Suparva
//   ╚═════╝ ╚═════╝╚═╝ 
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@libsql/client';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'ccp.db');

let _db = null;

export async function initDb() {
  fs.mkdirSync(DB_DIR, { recursive: true });

  _db = createClient({ url: `file:${DB_PATH}` });

  // Create schema
  await _db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      base_url TEXT,
      api_key_encrypted TEXT,
      enabled INTEGER DEFAULT 1,
      extra_config TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS model_routes (
      id TEXT PRIMARY KEY,
      claude_variant TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      model_id TEXT NOT NULL,
      priority INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS usage_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT DEFAULT (datetime('now')),
      provider_id TEXT,
      model_id TEXT,
      claude_variant TEXT,
      endpoint TEXT,
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
      cached_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (provider_id, model_id)
    );
  `);

  // Seed default settings
  await _db.executeMultiple(`
    INSERT OR IGNORE INTO settings (key, value) VALUES ('auth_token', '"super"');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('log_level', '"info"');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('max_log_entries', '10000');
  `);

  // Prime the in-memory auth token from DB
  const tokenRow = await _db.execute("SELECT value FROM settings WHERE key='auth_token'");
  if (tokenRow.rows[0]) {
    try { _authTokenCache = JSON.parse(tokenRow.rows[0].value); } catch { _authTokenCache = tokenRow.rows[0].value; }
  }

  await seedProviders();
  console.log('[DB] Initialized at', DB_PATH);
  return _db;
}

export function getDb() {
  if (!_db) throw new Error('DB not initialized. Call initDb() first.');
  return _db;
}

// ─── Encryption ──────────────────────────────────────────────────────────────
function getSecret() {
  const s = process.env.CCP_ENCRYPTION_SECRET || 'ccp_default_secret_change_me_32c';
  return crypto.createHash('sha256').update(s).digest();
}

export function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getSecret(), iv);
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + enc.toString('hex');
}

export function decrypt(encrypted) {
  if (!encrypted) return null;
  try {
    const [ivHex, encHex] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const enc = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', getSecret(), iv);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  } catch { return null; }
}

// ─── Sync-style wrappers (using cached results) ──────────────────────────────
// Since @libsql/client is async, we cache results for sync-style access

let _providersCache = [];
let _routesCache = [];
let _authTokenCache = process.env.CCP_AUTH_TOKEN || 'super';

export function getAuthToken() { return _authTokenCache; }
export function setAuthToken(t) { _authTokenCache = t; }

async function refreshCaches() {
  const db = getDb();
  const [providers, routes] = await Promise.all([
    db.execute('SELECT id, name, type, base_url, api_key_encrypted, enabled, extra_config, created_at, updated_at FROM providers ORDER BY name'),
    db.execute('SELECT * FROM model_routes ORDER BY priority DESC'),
  ]);
  _providersCache = providers.rows.map(r => {
    const has_key = !!(r.api_key_encrypted && r.api_key_encrypted.trim().length > 0);
    const p = { ...r };
    delete p.api_key_encrypted; // don't leak in public provider list cache
    return {
      ...p,
      extra_config: safeJson(r.extra_config),
      has_api_key: has_key,
    };
  });
  _routesCache = routes.rows.map(r => ({ ...r }));
}

// ─── Provider CRUD ───────────────────────────────────────────────────────────
export function getProviders() {
  return _providersCache;
}

export async function getProviderWithKey(id) {
  const db = getDb();
  const result = await db.execute({ sql: 'SELECT * FROM providers WHERE id = ?', args: [id] });
  const p = result.rows[0];
  if (!p) return null;
  return {
    ...p,
    api_key: decrypt(p.api_key_encrypted),
    extra_config: safeJson(p.extra_config),
  };
}

export async function upsertProvider(data) {
  const db = getDb();
  const { id } = data;
  if (!id) throw new Error('Provider id is required');

  // Fetch the existing row so we can fill in any missing fields from the form
  const existingRes = await db.execute({ sql: 'SELECT * FROM providers WHERE id = ?', args: [id] });
  const existing = existingRes.rows[0];

  // Merge: data wins over existing, existing wins over hard defaults
  const name        = nn(data.name)        ?? nn(existing?.name)        ?? id;
  const type        = nn(data.type)        ?? nn(existing?.type)        ?? 'cloud';
  const base_url    = nn(data.base_url)    ?? nn(existing?.base_url)    ?? null;
  const enabled     = data.enabled !== undefined && data.enabled !== null ? (data.enabled ? 1 : 0) : (existing?.enabled ?? 1);
  const extra_config = JSON.stringify(data.extra_config ?? safeJson(existing?.extra_config));
  const encKey      = data.api_key ? encrypt(data.api_key)
                    : (existing ? null : null); // null = keep existing via COALESCE

  if (existing) {
    await db.execute({
      sql: `UPDATE providers
            SET name=?, type=?, base_url=?,
                api_key_encrypted=COALESCE(?,api_key_encrypted),
                enabled=?, extra_config=?, updated_at=datetime('now')
            WHERE id=?`,
      args: [name, type, base_url, encKey, enabled, extra_config, id],
    });
  } else {
    await db.execute({
      sql: `INSERT INTO providers (id, name, type, base_url, api_key_encrypted, enabled, extra_config)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, name, type, base_url, encKey, enabled, extra_config],
    });
  }
  await refreshCaches();
  return _providersCache.find(p => p.id === id);
}

/** Coerce undefined → null so libsql never gets undefined args */
function nn(v) { return v === undefined ? null : v; }

export async function deleteProvider(id) {
  await getDb().execute({ sql: 'DELETE FROM providers WHERE id = ?', args: [id] });
  await refreshCaches();
}

// ─── Model Routes ─────────────────────────────────────────────────────────────
export function getModelRoutes() {
  return _routesCache;
}

export async function upsertModelRoute(data) {
  const { id, claude_variant, provider_id, model_id, priority, enabled } = data;
  const rid = id || crypto.randomUUID();
  await getDb().execute({
    sql: `INSERT INTO model_routes (id, claude_variant, provider_id, model_id, priority, enabled)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            claude_variant=excluded.claude_variant, provider_id=excluded.provider_id,
            model_id=excluded.model_id, priority=excluded.priority, enabled=excluded.enabled,
            updated_at=datetime('now')`,
    args: [rid, claude_variant, provider_id, model_id, priority ?? 0, enabled ?? 1],
  });
  await refreshCaches();
  return rid;
}

export async function deleteModelRoute(id) {
  await getDb().execute({ sql: 'DELETE FROM model_routes WHERE id = ?', args: [id] });
  await refreshCaches();
}

// ─── Usage Logs ─────────────────────────────────────────────────────────────
export async function insertLog(entry) {
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO usage_logs (id, provider_id, model_id, claude_variant, endpoint,
            input_tokens, output_tokens, total_tokens, latency_ms, status, error_message, request_id, stream)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      crypto.randomUUID(), entry.provider_id || null, entry.model_id || null,
      entry.claude_variant || null, entry.endpoint || null,
      entry.input_tokens || 0, entry.output_tokens || 0,
      (entry.input_tokens || 0) + (entry.output_tokens || 0),
      entry.latency_ms || 0, entry.status || 200,
      entry.error_message || null, entry.request_id || null, entry.stream ? 1 : 0,
    ],
  });

  // Prune old logs
  const maxRes = await db.execute("SELECT value FROM settings WHERE key='max_log_entries'");
  const maxEntries = maxRes.rows[0] ? parseInt(JSON.parse(maxRes.rows[0].value)) : 10000;
  await db.execute({
    sql: `DELETE FROM usage_logs WHERE id NOT IN (
            SELECT id FROM usage_logs ORDER BY timestamp DESC LIMIT ?
          )`,
    args: [maxEntries],
  });
}

export async function getLogs({ provider_id, limit = 200, offset = 0, from, to } = {}) {
  let sql = 'SELECT * FROM usage_logs WHERE 1=1';
  const args = [];
  if (provider_id) { sql += ' AND provider_id = ?'; args.push(provider_id); }
  if (from) { sql += ' AND timestamp >= ?'; args.push(from); }
  if (to) { sql += ' AND timestamp <= ?'; args.push(to); }
  sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
  args.push(limit, offset);
  const result = await getDb().execute({ sql, args });
  return result.rows;
}

export async function getUsageStats({ provider_id, days = 7 } = {}) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  let sql = `
    SELECT date(timestamp) as date, provider_id,
      COUNT(*) as requests,
      SUM(input_tokens) as input_tokens,
      SUM(output_tokens) as output_tokens,
      SUM(total_tokens) as total_tokens,
      AVG(latency_ms) as avg_latency,
      SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as errors
    FROM usage_logs WHERE timestamp >= ?
  `;
  const args = [since];
  if (provider_id) { sql += ' AND provider_id = ?'; args.push(provider_id); }
  sql += ' GROUP BY date(timestamp), provider_id ORDER BY date ASC';
  const result = await getDb().execute({ sql, args });
  return result.rows;
}

export async function getModelStats() {
  const db = getDb();
  const res = await db.execute(`
    SELECT model_id, provider_id,
      COUNT(*) as requests,
      SUM(total_tokens) as total_tokens
    FROM usage_logs
    WHERE model_id IS NOT NULL AND model_id != ''
    GROUP BY model_id, provider_id
    ORDER BY total_tokens DESC, requests DESC
    LIMIT 5
  `);
  return res.rows;
}

// ─── Model Cache ─────────────────────────────────────────────────────────────
export async function cacheModels(provider_id, models) {
  const db = getDb();
  await db.execute({ sql: 'DELETE FROM provider_models_cache WHERE provider_id = ?', args: [provider_id] });
  for (const m of models) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO provider_models_cache (provider_id, model_id, model_name, description, context_length, capabilities)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [provider_id, m.id, m.name || m.id, m.description || null, m.context_length || null, JSON.stringify(m.capabilities || [])],
    });
  }
}

export async function getCachedModels(provider_id) {
  const result = await getDb().execute({
    sql: 'SELECT * FROM provider_models_cache WHERE provider_id = ? ORDER BY model_id',
    args: [provider_id],
  });
  return result.rows.map(m => ({ ...m, capabilities: safeJson(m.capabilities) }));
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export async function getSettings() {
  const result = await getDb().execute('SELECT key, value FROM settings');
  const cfg = {};
  for (const r of result.rows) {
    try { cfg[r.key] = JSON.parse(r.value); } catch { cfg[r.key] = r.value; }
  }
  return cfg;
}

export async function updateConfig(key, value) {
  await getDb().execute({
    sql: `INSERT INTO settings (key, value) VALUES (?, ?)
          ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')`,
    args: [key, JSON.stringify(value)],
  });
  // Keep auth token in-memory cache in sync
  if (key === 'auth_token') {
    _authTokenCache = value;
  }
}

export async function getSummaryStat() {
  const db = getDb();
  const [totalReq, totalTok, avgLat, errCount, activeProv, routeCount] = await Promise.all([
    db.execute('SELECT COUNT(*) as n FROM usage_logs'),
    db.execute('SELECT SUM(total_tokens) as n FROM usage_logs'),
    db.execute('SELECT AVG(latency_ms) as n FROM usage_logs WHERE latency_ms > 0'),
    db.execute('SELECT COUNT(*) as n FROM usage_logs WHERE status >= 400'),
    db.execute('SELECT COUNT(*) as n FROM providers WHERE enabled = 1'),
    db.execute('SELECT COUNT(*) as n FROM model_routes WHERE enabled = 1'),
  ]);
  return {
    total_requests: totalReq.rows[0]?.n || 0,
    total_tokens: totalTok.rows[0]?.n || 0,
    avg_latency_ms: Math.round(avgLat.rows[0]?.n || 0),
    error_count: errCount.rows[0]?.n || 0,
    active_providers: activeProv.rows[0]?.n || 0,
    active_routes: routeCount.rows[0]?.n || 0,
  };
}

export async function clearLogs() {
  await getDb().execute('DELETE FROM usage_logs');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function safeJson(v) {
  try { return JSON.parse(v); } catch { return {}; }
}

async function seedProviders() {
  const db = getDb();
  const PROVIDERS = [
    { id: 'google', name: 'Google AI Studio', type: 'cloud', base_url: 'https://generativelanguage.googleapis.com' },
    { id: 'deepseek', name: 'DeepSeek', type: 'cloud', base_url: 'https://api.deepseek.com' },
    { id: 'openrouter', name: 'OpenRouter', type: 'cloud', base_url: 'https://openrouter.ai/api' },
    { id: 'groq', name: 'Groq', type: 'cloud', base_url: 'https://api.groq.com/openai' },
    { id: 'mistral', name: 'Mistral AI', type: 'cloud', base_url: 'https://api.mistral.ai' },
    { id: 'codestral', name: 'Mistral Codestral', type: 'cloud', base_url: 'https://codestral.mistral.ai' },
    { id: 'cerebras', name: 'Cerebras', type: 'cloud', base_url: 'https://api.cerebras.ai/v1' },
    { id: 'fireworks', name: 'Fireworks AI', type: 'cloud', base_url: 'https://api.fireworks.ai/inference' },
    { id: 'nvidia', name: 'NVIDIA NIM', type: 'cloud', base_url: 'https://integrate.api.nvidia.com' },
    { id: 'together', name: 'Together AI', type: 'cloud', base_url: 'https://api.together.xyz' },
    { id: 'xai', name: 'xAI (Grok)', type: 'cloud', base_url: 'https://api.x.ai' },
    { id: 'cohere', name: 'Cohere', type: 'cloud', base_url: 'https://api.cohere.ai' },
    { id: 'ollama', name: 'Ollama', type: 'local', base_url: 'http://localhost:11434' },
    { id: 'lmstudio', name: 'LM Studio', type: 'local', base_url: 'http://localhost:1234' },
    { id: 'llamacpp', name: 'llama.cpp', type: 'local', base_url: 'http://localhost:8080' },
  ];
  for (const p of PROVIDERS) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO providers (id, name, type, base_url, enabled) VALUES (?, ?, ?, ?, 0)',
      args: [p.id, p.name, p.type, p.base_url],
    });
  }
  await refreshCaches();
}

// Export refreshCaches for use after mutations
export { refreshCaches };
