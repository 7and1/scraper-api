# DATABASE.md - Database Design

**Project**: Scraper API MVP
**Version**: 1.0.0
**Last Updated**: 2025-12-25

---

## 1. Complete D1 Schema

```sql
-- =============================================================================
-- SCRAPER API DATABASE SCHEMA
-- Cloudflare D1 (SQLite)
-- =============================================================================

-- Enable foreign key enforcement
PRAGMA foreign_keys = ON;

-- =============================================================================
-- USERS TABLE
-- =============================================================================
-- Core user information from GitHub OAuth
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    -- Primary key (UUID v4)
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

    -- GitHub OAuth data
    github_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,

    -- Subscription tier
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),

    -- Quota management (atomic updates required)
    quota_limit INTEGER DEFAULT 100,      -- Requests per day
    quota_count INTEGER DEFAULT 0,        -- Current usage
    quota_reset_at INTEGER DEFAULT (strftime('%s', 'now') * 1000), -- Epoch ms

    -- Timestamps (stored as epoch milliseconds)
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    last_login_at INTEGER,

    -- Soft delete support
    deleted_at INTEGER
);

-- =============================================================================
-- API KEYS TABLE
-- =============================================================================
-- API keys for authentication (hashed, never plaintext)
-- =============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
    -- Primary key
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

    -- Owner reference
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Key storage (SHA-256 hash only - NEVER store plaintext)
    key_hash TEXT UNIQUE NOT NULL,
    key_prefix TEXT NOT NULL,  -- First 11 chars (sk_xxxxxxxx) for display

    -- Metadata
    name TEXT DEFAULT 'Default',
    description TEXT,

    -- Status flags
    is_active INTEGER DEFAULT 1 CHECK (is_active IN (0, 1)),

    -- Usage tracking
    last_used_at INTEGER,
    usage_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    expires_at INTEGER,  -- NULL = never expires

    -- Constraints
    UNIQUE(user_id, name)
);

-- =============================================================================
-- SESSIONS TABLE
-- =============================================================================
-- Auth.js session management
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
-- Security audit trail for authentication events
-- =============================================================================

CREATE TABLE IF NOT EXISTS auth_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

    -- User reference (nullable for failed attempts)
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,

    -- Event details
    event_type TEXT NOT NULL CHECK (event_type IN (
        'login',
        'logout',
        'login_failed',
        'key_created',
        'key_revoked',
        'key_used',
        'password_reset',
        'email_changed'
    )),

    -- Request metadata
    ip_address TEXT,
    user_agent TEXT,
    country TEXT,
    city TEXT,

    -- Additional context (JSON string)
    metadata TEXT,

    -- Timestamp
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- =============================================================================
-- REQUEST LOGS TABLE
-- =============================================================================
-- API request logging for debugging and analytics
-- =============================================================================

CREATE TABLE IF NOT EXISTS request_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

    -- Request identification
    request_id TEXT UNIQUE NOT NULL,

    -- User context
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    api_key_id TEXT REFERENCES api_keys(id) ON DELETE SET NULL,

    -- Request details
    method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
    path TEXT NOT NULL,
    target_url TEXT,
    render_mode TEXT CHECK (render_mode IN ('light', 'heavy')),

    -- Response details
    status_code INTEGER,
    error_code TEXT,
    response_size INTEGER,  -- Bytes
    duration_ms INTEGER,

    -- Request metadata
    ip_address TEXT,
    user_agent TEXT,
    cf_ray TEXT,  -- Cloudflare Ray ID
    cf_colo TEXT, -- Cloudflare colo code

    -- Timestamp
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- =============================================================================
-- RATE LIMIT BUCKETS TABLE
-- =============================================================================
-- Per-minute rate limiting (if needed beyond quota)
-- =============================================================================

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
    id TEXT PRIMARY KEY,  -- Composite: user_id:bucket_minute
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bucket_minute INTEGER NOT NULL,  -- Unix minute
    request_count INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    UNIQUE(user_id, bucket_minute)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- API keys indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = 1;
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Auth logs indexes
CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON auth_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_event_type ON auth_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON auth_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_auth_logs_ip ON auth_logs(ip_address);

-- Request logs indexes
CREATE INDEX IF NOT EXISTS idx_request_logs_request_id ON request_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_user_id ON request_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_request_logs_status ON request_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_request_logs_path ON request_logs(path);

-- Rate limit indexes
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_bucket ON rate_limit_buckets(user_id, bucket_minute);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Daily usage summary per user
CREATE VIEW IF NOT EXISTS v_daily_usage AS
SELECT
    user_id,
    date(created_at/1000, 'unixepoch') as usage_date,
    COUNT(*) as request_count,
    SUM(CASE WHEN status_code < 400 THEN 1 ELSE 0 END) as success_count,
    SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count,
    AVG(duration_ms) as avg_duration_ms,
    SUM(CASE WHEN render_mode = 'heavy' THEN 1 ELSE 0 END) as heavy_count,
    SUM(CASE WHEN render_mode = 'light' THEN 1 ELSE 0 END) as light_count
FROM request_logs
GROUP BY user_id, usage_date;

-- Active users view
CREATE VIEW IF NOT EXISTS v_active_users AS
SELECT
    u.*,
    (SELECT COUNT(*) FROM api_keys WHERE user_id = u.id AND is_active = 1) as active_keys,
    (SELECT MAX(created_at) FROM request_logs WHERE user_id = u.id) as last_request_at
FROM users u
WHERE u.deleted_at IS NULL;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update users.updated_at on modification
CREATE TRIGGER IF NOT EXISTS tr_users_updated_at
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = strftime('%s', 'now') * 1000 WHERE id = NEW.id;
END;

-- Increment API key usage count on use
CREATE TRIGGER IF NOT EXISTS tr_api_key_usage
AFTER INSERT ON request_logs
FOR EACH ROW
WHEN NEW.api_key_id IS NOT NULL
BEGIN
    UPDATE api_keys
    SET usage_count = usage_count + 1, last_used_at = strftime('%s', 'now') * 1000
    WHERE id = NEW.api_key_id;
END;
```

---

## 2. Index Strategy

### Primary Access Patterns

| Query Pattern             | Table        | Index                       | Expected QPS |
| ------------------------- | ------------ | --------------------------- | ------------ |
| Auth by API key hash      | api_keys     | idx_api_keys_hash           | High         |
| User lookup by GitHub ID  | users        | idx_users_github_id         | Medium       |
| Session validation        | sessions     | idx_sessions_token          | High         |
| Request log by request_id | request_logs | idx_request_logs_request_id | Low          |
| User's recent requests    | request_logs | idx_request_logs_user_id    | Medium       |
| Auth audit by user        | auth_logs    | idx_auth_logs_user_id       | Low          |

### Index Performance Notes

```sql
-- The most critical index for authentication performance
-- This is called on EVERY API request
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- Partial index for active keys only (smaller, faster)
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = 1;

-- Composite index for quota checks (user lookup + quota data)
-- Already covered by PRIMARY KEY, no additional index needed

-- Request logs are write-heavy, limit indexes
-- Only index what's needed for debugging
CREATE INDEX idx_request_logs_request_id ON request_logs(request_id);
```

---

## 3. Migration Scripts

### Migration 001: Initial Schema

```sql
-- migrations/001_initial.sql
-- Applied: 2025-01-01

-- This is the complete schema from section 1
-- See above for full CREATE statements
```

### Migration 002: Add Usage Analytics

```sql
-- migrations/002_usage_analytics.sql
-- Applied: TBD

-- Add response size tracking
ALTER TABLE request_logs ADD COLUMN response_size INTEGER;

-- Add Cloudflare colo tracking
ALTER TABLE request_logs ADD COLUMN cf_colo TEXT;

-- Create hourly aggregation table for dashboard charts
CREATE TABLE IF NOT EXISTS usage_hourly (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hour_bucket INTEGER NOT NULL,  -- Unix hour
    request_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    avg_duration_ms INTEGER DEFAULT 0,
    heavy_count INTEGER DEFAULT 0,
    light_count INTEGER DEFAULT 0,
    UNIQUE(user_id, hour_bucket)
);

CREATE INDEX idx_usage_hourly_user_hour ON usage_hourly(user_id, hour_bucket);
```

### Migration 003: Add Team Support

```sql
-- migrations/003_teams.sql
-- Applied: TBD (Post-MVP)

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id TEXT NOT NULL REFERENCES users(id),
    plan TEXT DEFAULT 'team' CHECK (plan IN ('team', 'enterprise')),
    quota_limit INTEGER DEFAULT 1000,
    quota_count INTEGER DEFAULT 0,
    quota_reset_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- Team memberships
CREATE TABLE IF NOT EXISTS team_members (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    UNIQUE(team_id, user_id)
);

-- Add team reference to API keys
ALTER TABLE api_keys ADD COLUMN team_id TEXT REFERENCES teams(id) ON DELETE CASCADE;
```

---

## 4. Seed Data

```sql
-- seed.sql
-- Development and testing seed data

-- Insert test user
INSERT INTO users (id, github_id, email, name, avatar_url, plan, quota_limit)
VALUES (
    'test-user-001',
    '12345678',
    'test@example.com',
    'Test User',
    'https://avatars.githubusercontent.com/u/12345678',
    'free',
    100
);

-- Insert test API key (hash of a test key placeholder)
-- In production, generate a real key and hash it using: await hashApiKey(generateApiKey())
INSERT INTO api_keys (id, user_id, key_hash, key_prefix, name)
VALUES (
    'test-key-001',
    'test-user-001',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'sk_test_xyz',
    'Development Key'
);

-- Insert sample request logs
INSERT INTO request_logs (request_id, user_id, api_key_id, method, path, target_url, render_mode, status_code, duration_ms)
VALUES
    ('req_sample_001', 'test-user-001', 'test-key-001', 'POST', '/api/v1/scrape', 'https://example.com', 'light', 200, 245),
    ('req_sample_002', 'test-user-001', 'test-key-001', 'POST', '/api/v1/scrape', 'https://example.org', 'heavy', 200, 3420),
    ('req_sample_003', 'test-user-001', 'test-key-001', 'POST', '/api/v1/screenshot', 'https://example.net', 'heavy', 200, 4521);

-- Insert sample auth logs
INSERT INTO auth_logs (user_id, event_type, ip_address, user_agent)
VALUES
    ('test-user-001', 'login', '127.0.0.1', 'Mozilla/5.0 Test Browser'),
    ('test-user-001', 'key_created', '127.0.0.1', 'Mozilla/5.0 Test Browser');
```

---

## 5. Backup Procedures

### Daily Backup Script

```bash
#!/bin/bash
# backup-d1.sh
# Run daily via cron or GitHub Actions

set -e

BACKUP_DIR="/backups/d1"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="scraper-api-db"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Export database using wrangler
echo "Starting D1 backup..."
wrangler d1 export "$DB_NAME" --output="$BACKUP_DIR/backup_$DATE.sql"

# Compress the backup
gzip "$BACKUP_DIR/backup_$DATE.sql"

# Upload to R2 (optional)
# wrangler r2 object put "backups/d1/backup_$DATE.sql.gz" --file="$BACKUP_DIR/backup_$DATE.sql.gz"

# Clean up old backups (keep last 30 days)
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

### Restore Procedure

```bash
#!/bin/bash
# restore-d1.sh
# Restore from a backup file

set -e

BACKUP_FILE=$1
DB_NAME="scraper-api-db"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: restore-d1.sh <backup_file.sql.gz>"
    exit 1
fi

# Decompress if needed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -k "$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE%.gz}"
fi

echo "WARNING: This will overwrite all data in $DB_NAME"
read -p "Are you sure? (y/N) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Restoring from $BACKUP_FILE..."
    wrangler d1 execute "$DB_NAME" --file="$BACKUP_FILE"
    echo "Restore completed"
else
    echo "Restore cancelled"
fi
```

### GitHub Actions Backup Workflow

```yaml
# .github/workflows/backup-d1.yml
name: D1 Database Backup

on:
  schedule:
    - cron: "0 2 * * *" # Daily at 2 AM UTC
  workflow_dispatch: # Manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install wrangler
        run: npm install -g wrangler

      - name: Authenticate with Cloudflare
        run: echo "${{ secrets.CLOUDFLARE_API_TOKEN }}" | wrangler login --from-stdin

      - name: Export database
        run: |
          mkdir -p backups
          wrangler d1 export scraper-api-db --output=backups/backup_$(date +%Y%m%d).sql

      - name: Upload to R2
        run: |
          gzip backups/backup_$(date +%Y%m%d).sql
          wrangler r2 object put backups/d1/backup_$(date +%Y%m%d).sql.gz \
            --file=backups/backup_$(date +%Y%m%d).sql.gz

      - name: Cleanup old backups
        run: |
          # Keep last 30 days of backups in R2
          wrangler r2 object list backups/d1/ | \
            jq -r '.objects[] | select(.uploaded < (now - 2592000)) | .key' | \
            xargs -I {} wrangler r2 object delete {}
```

---

## 6. Query Patterns

### Authentication Query

```typescript
// Most critical query - called on every request
const AUTH_QUERY = `
  SELECT
    u.id, u.github_id, u.email, u.name, u.avatar_url, u.plan,
    u.quota_limit, u.quota_count, u.quota_reset_at,
    k.id as key_id, k.user_id, k.key_prefix, k.name as key_name,
    k.is_active, k.last_used_at, k.created_at, k.expires_at
  FROM api_keys k
  JOIN users u ON k.user_id = u.id
  WHERE k.key_hash = ?
    AND k.is_active = 1
    AND (k.expires_at IS NULL OR k.expires_at > ?)
`;

// Usage
const result = await db.prepare(AUTH_QUERY).bind(keyHash, Date.now()).first();
```

### Atomic Quota Update

```typescript
// CRITICAL: Must be atomic to prevent race conditions
const QUOTA_UPDATE = `
  UPDATE users
  SET
    quota_count = CASE
      WHEN date(quota_reset_at/1000, 'unixepoch') < date('now') THEN 1
      ELSE quota_count + 1
    END,
    quota_reset_at = CASE
      WHEN date(quota_reset_at/1000, 'unixepoch') < date('now') THEN strftime('%s', 'now') * 1000
      ELSE quota_reset_at
    END,
    updated_at = strftime('%s', 'now') * 1000
  WHERE id = ?
    AND (
      date(quota_reset_at/1000, 'unixepoch') < date('now')
      OR quota_count < ?
    )
  RETURNING quota_count, quota_reset_at
`;

// Usage
const result = await db.prepare(QUOTA_UPDATE).bind(userId, quotaLimit).first();

if (!result) {
  // Quota exceeded
}
```

### User Stats Query

```typescript
const USER_STATS = `
  SELECT
    u.quota_count as used,
    u.quota_limit as limit,
    u.quota_limit - u.quota_count as remaining,
    u.quota_reset_at as reset_at,
    (SELECT COUNT(*) FROM request_logs WHERE user_id = u.id AND created_at > ?) as requests_24h,
    (SELECT AVG(duration_ms) FROM request_logs WHERE user_id = u.id AND created_at > ?) as avg_duration
  FROM users u
  WHERE u.id = ?
`;

// Usage (last 24 hours)
const yesterday = Date.now() - 86400000;
const stats = await db
  .prepare(USER_STATS)
  .bind(yesterday, yesterday, userId)
  .first();
```

### Recent Requests Query

```typescript
const RECENT_REQUESTS = `
  SELECT
    request_id,
    method,
    path,
    target_url,
    render_mode,
    status_code,
    error_code,
    duration_ms,
    created_at
  FROM request_logs
  WHERE user_id = ?
  ORDER BY created_at DESC
  LIMIT ?
`;

// Usage
const requests = await db.prepare(RECENT_REQUESTS).bind(userId, limit).all();
```

### Create API Key

```typescript
const CREATE_KEY = `
  INSERT INTO api_keys (id, user_id, key_hash, key_prefix, name)
  VALUES (?, ?, ?, ?, ?)
  RETURNING id, key_prefix, name, created_at
`;

// Usage
const keyId = crypto.randomUUID();
const result = await db
  .prepare(CREATE_KEY)
  .bind(keyId, userId, keyHash, keyPrefix, keyName)
  .first();
```

### Revoke API Key

```typescript
const REVOKE_KEY = `
  UPDATE api_keys
  SET is_active = 0, updated_at = strftime('%s', 'now') * 1000
  WHERE id = ? AND user_id = ?
  RETURNING id
`;

// Usage
const result = await db.prepare(REVOKE_KEY).bind(keyId, userId).first();
```

---

## 7. Performance Considerations

### D1 Limitations

| Limit                      | Value     | Impact                  |
| -------------------------- | --------- | ----------------------- |
| Max database size          | 10 GB     | Plan for data retention |
| Max row size               | 1 MB      | Keep JSON blobs small   |
| Max concurrent connections | 100       | Queue heavy operations  |
| Read latency               | ~10ms     | Excellent for auth      |
| Write latency              | ~50-100ms | Log writes async        |

### Optimization Strategies

1. **Use RETURNING clause** to avoid extra SELECT after INSERT/UPDATE
2. **Batch log writes** using executionCtx.waitUntil()
3. **Use partial indexes** for frequently filtered columns
4. **Avoid SELECT \*** - specify columns needed
5. **Use prepared statements** for repeated queries
6. **Consider KV for rate limits** if D1 latency is too high

### Query Analysis

```typescript
// Use EXPLAIN to analyze query performance
const analysis = await db.prepare("EXPLAIN QUERY PLAN " + YOUR_QUERY).all();

console.log(analysis);
// Look for: SCAN vs SEARCH, index usage, join methods
```

---

## 8. Data Retention Policy

| Table              | Retention     | Cleanup Strategy          |
| ------------------ | ------------- | ------------------------- |
| users              | Forever       | Soft delete only          |
| api_keys           | Forever       | Soft delete (is_active=0) |
| sessions           | Until expired | Cron job cleanup          |
| auth_logs          | 90 days       | Cron job cleanup          |
| request_logs       | 30 days       | Cron job cleanup          |
| rate_limit_buckets | 1 hour        | Automatic expiry          |

### Cleanup Script

```typescript
// Scheduled cleanup (run daily)
async function cleanupOldData(db: D1Database) {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

  // Clean expired sessions
  await db.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now).run();

  // Clean old request logs
  await db
    .prepare("DELETE FROM request_logs WHERE created_at < ?")
    .bind(thirtyDaysAgo)
    .run();

  // Clean old auth logs
  await db
    .prepare("DELETE FROM auth_logs WHERE created_at < ?")
    .bind(ninetyDaysAgo)
    .run();

  // Clean expired rate limit buckets
  const hourAgo = Math.floor(now / 60000) - 60;
  await db
    .prepare("DELETE FROM rate_limit_buckets WHERE bucket_minute < ?")
    .bind(hourAgo)
    .run();
}
```

---

## Document Cross-References

- Architecture overview: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Backend queries: [BACKEND.md](./BACKEND.md)
- Deployment setup: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

_Database Design Version 1.0.0 - Created 2025-12-25_
