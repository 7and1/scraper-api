-- =============================================================================
-- SCRAPER API DATABASE SCHEMA
-- Cloudflare D1 (SQLite)
-- =============================================================================

PRAGMA foreign_keys = ON;

-- =============================================================================
-- USERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  github_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  quota_limit INTEGER DEFAULT 100,
  quota_count INTEGER DEFAULT 0,
  quota_reset_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  last_login_at INTEGER,
  deleted_at INTEGER
);

-- =============================================================================
-- API KEYS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash TEXT UNIQUE NOT NULL,
  key_prefix TEXT NOT NULL,
  name TEXT DEFAULT 'Default',
  description TEXT,
  is_active INTEGER DEFAULT 1 CHECK (is_active IN (0, 1)),
  last_used_at INTEGER,
  usage_count INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  expires_at INTEGER,
  UNIQUE(user_id, name)
);

-- =============================================================================
-- SESSIONS TABLE (Auth.js)
-- =============================================================================

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  session_token TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- =============================================================================
-- AUTH LOGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS auth_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'login',
      'logout',
      'login_failed',
      'key_created',
      'key_revoked',
      'key_used',
      'password_reset',
      'email_changed'
    )
  ),
  ip_address TEXT,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  metadata TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- =============================================================================
-- REQUEST LOGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS request_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  request_id TEXT UNIQUE NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  api_key_id TEXT REFERENCES api_keys(id) ON DELETE SET NULL,
  method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
  path TEXT NOT NULL,
  target_url TEXT,
  render_mode TEXT CHECK (render_mode IN ('light', 'heavy')),
  status_code INTEGER,
  error_code TEXT,
  response_size INTEGER,
  duration_ms INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  cf_ray TEXT,
  cf_colo TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- =============================================================================
-- RATE LIMIT BUCKETS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bucket_minute INTEGER NOT NULL,
  request_count INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  UNIQUE(user_id, bucket_minute)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = 1;
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON auth_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_event_type ON auth_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON auth_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_auth_logs_ip ON auth_logs(ip_address);

CREATE INDEX IF NOT EXISTS idx_request_logs_request_id ON request_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_user_id ON request_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_request_logs_status ON request_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_request_logs_path ON request_logs(path);

CREATE INDEX IF NOT EXISTS idx_rate_limit_user_bucket ON rate_limit_buckets(user_id, bucket_minute);

-- =============================================================================
-- VIEWS
-- =============================================================================

CREATE VIEW IF NOT EXISTS v_daily_usage AS
SELECT
  user_id,
  date(created_at / 1000, 'unixepoch') AS usage_date,
  COUNT(*) AS request_count,
  SUM(CASE WHEN status_code < 400 THEN 1 ELSE 0 END) AS success_count,
  SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS error_count,
  AVG(duration_ms) AS avg_duration_ms,
  SUM(CASE WHEN render_mode = 'heavy' THEN 1 ELSE 0 END) AS heavy_count,
  SUM(CASE WHEN render_mode = 'light' THEN 1 ELSE 0 END) AS light_count
FROM request_logs
GROUP BY user_id, usage_date;

CREATE VIEW IF NOT EXISTS v_active_users AS
SELECT
  u.*,
  (SELECT COUNT(*) FROM api_keys WHERE user_id = u.id AND is_active = 1) AS active_keys,
  (SELECT MAX(created_at) FROM request_logs WHERE user_id = u.id) AS last_request_at
FROM users u
WHERE u.deleted_at IS NULL;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER IF NOT EXISTS tr_users_updated_at
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  UPDATE users SET updated_at = strftime('%s', 'now') * 1000 WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS tr_api_key_usage
AFTER INSERT ON request_logs
FOR EACH ROW
WHEN NEW.api_key_id IS NOT NULL
BEGIN
  UPDATE api_keys
  SET usage_count = usage_count + 1, last_used_at = strftime('%s', 'now') * 1000
  WHERE id = NEW.api_key_id;
END;

