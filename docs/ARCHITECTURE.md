# ARCHITECTURE.md - Technical Architecture

**Project**: Scraper API MVP
**Version**: 1.0.0
**Last Updated**: 2025-12-25

---

## 1. System Architecture Diagram

```
                                    SCRAPER API ARCHITECTURE
                                    ========================

    +------------------+          +----------------------+          +------------------+
    |                  |   HTTPS  |                      |  Binding |                  |
    |   Browser/App    +--------->+   Cloudflare Pages   +--------->+   API Worker     |
    |   (Client)       |          |   (Next.js 14)       |          |   (Hono)         |
    |                  |          |                      |          |                  |
    +------------------+          +----------+-----------+          +--------+---------+
                                             |                               |
                                             |                               |
                                  +----------v-----------+                   |
                                  |                      |                   |
                                  |   Auth.js (v5)       |                   |
                                  |   GitHub OAuth       |                   |
                                  |                      |                   |
                                  +----------+-----------+                   |
                                             |                               |
                                             |                               |
                                  +----------v-----------+          +--------v---------+
                                  |                      |          |                  |
                                  |   Cloudflare D1      <----------+   SSRF Filter    |
                                  |   (SQLite Edge)      |          |                  |
                                  |                      |          +--------+---------+
                                  |   - users            |                   |
                                  |   - api_keys         |                   |
                                  |   - auth_logs        |          +--------v---------+
                                  |   - request_logs     |          |                  |
                                  |                      |          |   Scraper Engine |
                                  +----------------------+          |                  |
                                                                    |   - Light (fetch)|
                                                                    |   - Heavy (Pptr) |
                                                                    |                  |
                                                                    +--------+---------+
                                                                             |
                                                        +--------------------+--------------------+
                                                        |                                         |
                                              +---------v----------+                   +----------v---------+
                                              |                    |                   |                    |
                                              |   Cheerio          |                   |   Browser Rendering|
                                              |   (Static HTML)    |                   |   (Puppeteer)      |
                                              |                    |                   |                    |
                                              +--------------------+                   +--------------------+


    SECURITY LAYERS
    ===============

    +------------------+     +------------------+     +------------------+     +------------------+
    |                  |     |                  |     |                  |     |                  |
    |   CORS           +---->+   Auth           +---->+   Rate Limit     +---->+   SSRF           |
    |   Middleware     |     |   Middleware     |     |   Middleware     |     |   Validation     |
    |                  |     |                  |     |                  |     |                  |
    +------------------+     +------------------+     +------------------+     +------------------+
```

---

## 2. Data Flow Diagrams

### 2.1 Authentication Flow

```
    User                    Next.js                  Auth.js                 GitHub                   D1
      |                        |                        |                       |                      |
      |   1. Click Login       |                        |                       |                      |
      +----------------------->|                        |                       |                      |
      |                        |                        |                       |                      |
      |                        |   2. Redirect to OAuth |                       |                      |
      |                        +----------------------->|                       |                      |
      |                        |                        |                       |                      |
      |                        |                        |   3. GitHub Auth URL  |                      |
      |<--------------------------------------------------------------------- --+                      |
      |                        |                        |                       |                      |
      |   4. Authorize App     |                        |                       |                      |
      +------------------------------------------------------------------- ---->|                      |
      |                        |                        |                       |                      |
      |                        |                        |   5. Callback + Code  |                      |
      |                        |                        |<----------------------+                      |
      |                        |                        |                       |                      |
      |                        |                        |   6. Exchange Token   |                      |
      |                        |                        +---------------------->|                      |
      |                        |                        |                       |                      |
      |                        |                        |   7. User Profile     |                      |
      |                        |                        |<----------------------+                      |
      |                        |                        |                       |                      |
      |                        |                        |   8. Upsert User      |                      |
      |                        |                        +--------------------------------------------->|
      |                        |                        |                       |                      |
      |                        |                        |   9. Generate API Key |                      |
      |                        |                        +--------------------------------------------->|
      |                        |                        |                       |                      |
      |                        |   10. Set Session      |                       |                      |
      |                        |<-----------------------+                       |                      |
      |                        |                        |                       |                      |
      |   11. Redirect to      |                        |                       |                      |
      |       Dashboard        |                        |                       |                      |
      |<-----------------------+                        |                       |                      |
```

### 2.2 API Request Flow

```
    Client                  API Worker              Auth Middleware          Quota Service              D1
      |                        |                        |                        |                      |
      |   1. API Request       |                        |                        |                      |
      |   X-API-Key: sk_xxx    |                        |                        |                      |
      +----------------------->|                        |                        |                      |
      |                        |                        |                        |                      |
      |                        |   2. Hash API Key      |                        |                      |
      |                        +----------------------->|                        |                      |
      |                        |                        |                        |                      |
      |                        |                        |   3. Lookup by Hash    |                      |
      |                        |                        +----------------------------------------------->|
      |                        |                        |                        |                      |
      |                        |                        |   4. User Record       |                      |
      |                        |                        |<-----------------------------------------------+
      |                        |                        |                        |                      |
      |                        |   5. User Context      |                        |                      |
      |                        |<-----------------------+                        |                      |
      |                        |                        |                        |                      |
      |                        |   6. Check & Increment Quota (Atomic)           |                      |
      |                        +------------------------------------------------>|                      |
      |                        |                        |                        |                      |
      |                        |                        |                        |   7. UPDATE...       |
      |                        |                        |                        |   RETURNING          |
      |                        |                        |                        +--------------------->|
      |                        |                        |                        |                      |
      |                        |                        |                        |   8. New Count       |
      |                        |                        |                        |<---------------------+
      |                        |                        |                        |                      |
      |                        |   9. Quota OK/Exceeded |                        |                      |
      |                        |<------------------------------------------------+                      |
      |                        |                        |                        |                      |
      |                        |   10. Process Request (if quota OK)             |                      |
      |                        |                        |                        |                      |
      |   11. Response         |                        |                        |                      |
      |<-----------------------+                        |                        |                      |
```

### 2.3 Scraping Flow

```
    API Worker              SSRF Filter             Scraper Light           Scraper Heavy            Target
      |                        |                        |                        |                      |
      |   1. Validate URL      |                        |                        |                      |
      +----------------------->|                        |                        |                      |
      |                        |                        |                        |                      |
      |                        |   2. Check Protocol    |                        |                      |
      |                        |   Check Host           |                        |                      |
      |                        |   Check IP Range       |                        |                      |
      |                        |                        |                        |                      |
      |   3. URL Valid/Invalid |                        |                        |                      |
      |<-----------------------+                        |                        |                      |
      |                        |                        |                        |                      |
      |   If render=false:     |                        |                        |                      |
      |   4a. Fetch with Cheerio                        |                        |                      |
      +------------------------------------------------>|                        |                      |
      |                        |                        |                        |                      |
      |                        |                        |   5a. HTTP GET         |                      |
      |                        |                        +--------------------------------------------->|
      |                        |                        |                        |                      |
      |                        |                        |   6a. HTML Response    |                      |
      |                        |                        |<---------------------------------------------+
      |                        |                        |                        |                      |
      |   7a. Parsed Content   |                        |                        |                      |
      |<------------------------------------------------+                        |                      |
      |                        |                        |                        |                      |
      |   If render=true:      |                        |                        |                      |
      |   4b. Launch Browser   |                        |                        |                      |
      +------------------------------------------------------------------------>|                      |
      |                        |                        |                        |                      |
      |                        |                        |                        |   5b. Navigate       |
      |                        |                        |                        +--------------------->|
      |                        |                        |                        |                      |
      |                        |                        |                        |   6b. Rendered HTML  |
      |                        |                        |                        |<---------------------+
      |                        |                        |                        |                      |
      |   7b. Full Content     |                        |                        |                      |
      |<------------------------------------------------------------------------+                      |
```

---

## 3. API Design (OpenAPI Spec)

```yaml
openapi: 3.1.0
info:
  title: Scraper API
  version: 1.0.0
  description: Web scraping API with light and heavy rendering options

servers:
  - url: https://api.scraper.dev
    description: Production
  - url: http://localhost:8787
    description: Development

components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
      description: API key in format sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

  schemas:
    ScrapeRequest:
      type: object
      required:
        - url
      properties:
        url:
          type: string
          format: uri
          description: Target URL to scrape
          example: https://example.com
        render:
          type: boolean
          default: false
          description: Enable JavaScript rendering
        selector:
          type: string
          description: CSS selector to extract specific elements
          example: "article.content"
        wait_for:
          type: string
          description: CSS selector to wait for (render=true only)
          example: "#dynamic-content"
        timeout:
          type: integer
          default: 30000
          minimum: 1000
          maximum: 30000
          description: Request timeout in milliseconds

    ScrapeResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            content:
              type: string
              description: HTML content or extracted text
            title:
              type: string
            url:
              type: string
            timestamp:
              type: string
              format: date-time
        meta:
          type: object
          properties:
            request_id:
              type: string
            duration_ms:
              type: integer
            render_mode:
              type: string
              enum: [light, heavy]

    ScreenshotRequest:
      type: object
      required:
        - url
      properties:
        url:
          type: string
          format: uri
        width:
          type: integer
          default: 1280
          minimum: 320
          maximum: 1920
        height:
          type: integer
          default: 720
          minimum: 240
          maximum: 1080
        full_page:
          type: boolean
          default: false
        format:
          type: string
          enum: [png, jpeg, webp]
          default: png

    ErrorResponse:
      type: object
      properties:
        success:
          type: boolean
          example: false
        error:
          type: object
          properties:
            code:
              type: string
              example: QUOTA_EXCEEDED
            message:
              type: string
              example: Daily quota exceeded. Resets at midnight UTC.
            request_id:
              type: string
              example: req_abc123

security:
  - ApiKeyAuth: []

paths:
  /health:
    get:
      summary: Health check
      security: []
      responses:
        "200":
          description: Service healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: ok
                  timestamp:
                    type: string
                    format: date-time

  /api/v1/scrape:
    post:
      summary: Scrape a webpage
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ScrapeRequest"
      responses:
        "200":
          description: Successful scrape
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ScrapeResponse"
        "400":
          description: Invalid request
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
        "401":
          description: Invalid or missing API key
        "429":
          description: Rate limit or quota exceeded
        "500":
          description: Internal server error

  /api/v1/screenshot:
    post:
      summary: Take a screenshot
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ScreenshotRequest"
      responses:
        "200":
          description: Screenshot captured
          content:
            image/png:
              schema:
                type: string
                format: binary
            image/jpeg:
              schema:
                type: string
                format: binary
        "400":
          description: Invalid request
        "401":
          description: Invalid or missing API key
        "429":
          description: Rate limit or quota exceeded
```

---

## 4. Database Schema (Complete SQL)

```sql
-- Scraper API Database Schema
-- Cloudflare D1 (SQLite)

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    github_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,

    -- Subscription
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),

    -- Quota management
    quota_limit INTEGER DEFAULT 100,
    quota_count INTEGER DEFAULT 0,
    quota_reset_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),

    -- Timestamps
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    last_login_at INTEGER
);

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Key storage (SHA-256 hash, never plaintext)
    key_hash TEXT UNIQUE NOT NULL,
    key_prefix TEXT NOT NULL, -- First 8 chars for display: sk_xxxxxxxx

    -- Metadata
    name TEXT DEFAULT 'Default',

    -- Status
    is_active INTEGER DEFAULT 1,
    last_used_at INTEGER,

    -- Timestamps
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    expires_at INTEGER, -- NULL = never expires

    UNIQUE(user_id, name)
);

-- Auth logs table (for security auditing)
CREATE TABLE IF NOT EXISTS auth_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,

    -- Event details
    event_type TEXT NOT NULL CHECK (event_type IN ('login', 'logout', 'key_created', 'key_revoked', 'key_used')),
    ip_address TEXT,
    user_agent TEXT,

    -- Additional context
    metadata TEXT, -- JSON string

    -- Timestamp
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- Request logs table (for debugging and analytics)
CREATE TABLE IF NOT EXISTS request_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    request_id TEXT UNIQUE NOT NULL,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    api_key_id TEXT REFERENCES api_keys(id) ON DELETE SET NULL,

    -- Request details
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    target_url TEXT,
    render_mode TEXT CHECK (render_mode IN ('light', 'heavy')),

    -- Response details
    status_code INTEGER,
    error_code TEXT,
    duration_ms INTEGER,

    -- Metadata
    ip_address TEXT,
    user_agent TEXT,
    cf_ray TEXT, -- Cloudflare Ray ID

    -- Timestamp
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- Sessions table (for Auth.js)
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    session_token TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = 1;
CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON auth_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created ON auth_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_request_logs_user_id ON request_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_request_id ON request_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_created ON request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
```

---

## 5. Security Architecture

### 5.1 Defense Layers

```
Layer 1: Network (Cloudflare)
├── DDoS Protection (automatic)
├── WAF Rules (managed)
├── Bot Detection (JS challenge)
└── SSL/TLS Termination

Layer 2: Application (Worker)
├── CORS Policy (whitelist origins)
├── Rate Limiting (per IP + per key)
├── Request Validation (Zod schemas)
└── Content-Type Enforcement

Layer 3: Authentication
├── API Key Hashing (SHA-256)
├── Session Management (Auth.js)
├── OAuth 2.0 (GitHub only)
└── Key Rotation Support

Layer 4: Authorization
├── Quota Enforcement (atomic SQL)
├── Resource Access Control
├── Plan-Based Limits
└── IP Allowlisting (enterprise)

Layer 5: Data Protection
├── No PII in Logs
├── Encrypted at Rest (D1)
├── Secure Headers
└── SSRF Prevention
```

### 5.2 SSRF Protection Implementation

```typescript
// apps/api/src/utils/ssrf.ts

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  "metadata.google.internal",
  "169.254.169.254", // AWS/GCP metadata
  "metadata.google.com",
  "kubernetes.default.svc",
]);

const BLOCKED_PORTS = new Set([
  22, // SSH
  23, // Telnet
  25, // SMTP
  3306, // MySQL
  5432, // PostgreSQL
  6379, // Redis
  27017, // MongoDB
]);

const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
  /^fc00:/i,
  /^fd00:/i,
  /^fe80:/i,
];

export interface SSRFValidationResult {
  valid: boolean;
  error?: string;
  normalizedUrl?: string;
}

export function validateUrl(input: string): SSRFValidationResult {
  // Must be a string
  if (typeof input !== "string" || input.trim() === "") {
    return { valid: false, error: "URL must be a non-empty string" };
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  // Protocol check
  if (!["http:", "https:"].includes(url.protocol)) {
    return {
      valid: false,
      error: `Protocol ${url.protocol} not allowed. Use http or https.`,
    };
  }

  // Hostname check
  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(hostname)) {
    return { valid: false, error: "Access to this host is not allowed" };
  }

  // Port check
  const port = url.port
    ? parseInt(url.port)
    : url.protocol === "https:"
      ? 443
      : 80;
  if (BLOCKED_PORTS.has(port)) {
    return { valid: false, error: `Port ${port} is not allowed` };
  }

  // Private IP check
  for (const range of PRIVATE_IP_RANGES) {
    if (range.test(hostname)) {
      return {
        valid: false,
        error: "Access to private IP ranges is not allowed",
      };
    }
  }

  // Check for IP address in hostname (additional validation)
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(hostname)) {
    const parts = hostname.split(".").map(Number);
    // Additional octet validation
    if (parts.some((p) => p > 255)) {
      return { valid: false, error: "Invalid IP address" };
    }
  }

  return {
    valid: true,
    normalizedUrl: url.toString(),
  };
}

// DNS rebinding protection - resolve and revalidate
export async function validateUrlWithDNS(
  input: string,
): Promise<SSRFValidationResult> {
  const basicResult = validateUrl(input);
  if (!basicResult.valid) {
    return basicResult;
  }

  // In production, you would resolve DNS and check the IP
  // For Workers, we rely on Cloudflare's built-in protection
  // plus the basic validation above

  return basicResult;
}
```

### 5.3 API Key Hashing

```typescript
// apps/api/src/utils/hash.ts

export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const key = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sk_${key}`;
}

export function getKeyPrefix(key: string): string {
  return key.substring(0, 11); // "sk_" + first 8 chars
}
```

---

## 6. Error Handling Strategy

### 6.1 Error Codes

| Code              | HTTP Status | Description                            |
| ----------------- | ----------- | -------------------------------------- |
| `INVALID_REQUEST` | 400         | Request body validation failed         |
| `INVALID_URL`     | 400         | Target URL is malformed                |
| `SSRF_BLOCKED`    | 400         | URL blocked by SSRF protection         |
| `UNAUTHORIZED`    | 401         | Missing or invalid API key             |
| `FORBIDDEN`       | 403         | Valid key but insufficient permissions |
| `NOT_FOUND`       | 404         | Endpoint not found                     |
| `QUOTA_EXCEEDED`  | 429         | Daily quota limit reached              |
| `RATE_LIMITED`    | 429         | Too many requests per minute           |
| `SCRAPE_FAILED`   | 502         | Target website returned error          |
| `SCRAPE_TIMEOUT`  | 504         | Request timed out                      |
| `INTERNAL_ERROR`  | 500         | Unexpected server error                |

### 6.2 Error Response Format

```typescript
// apps/api/src/utils/response.ts

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    request_id: string;
    details?: Record<string, unknown>;
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  requestId: string,
  status: number,
  details?: Record<string, unknown>,
): Response {
  const body: ApiError = {
    success: false,
    error: {
      code,
      message,
      request_id: requestId,
      ...(details && { details }),
    },
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": requestId,
    },
  });
}

export function createSuccessResponse<T>(
  data: T,
  requestId: string,
  meta?: Record<string, unknown>,
): Response {
  const body = {
    success: true,
    data,
    meta: {
      request_id: requestId,
      ...meta,
    },
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": requestId,
    },
  });
}
```

---

## 7. Caching Strategy

### 7.1 Cache Layers

```
Request Flow with Caching:

Client Request
      |
      v
+-----+------+
| CF Cache   |  <-- Static assets (1 year)
| (CDN Edge) |  <-- API responses (optional, per-user)
+-----+------+
      |
      v (cache miss)
+-----+------+
| Worker KV  |  <-- Rate limit counters (1 min TTL)
| (Global)   |  <-- Session data (1 hour TTL)
+-----+------+
      |
      v
+-----+------+
| D1 Database|  <-- User data
| (Regional) |  <-- API keys
+------------+
```

### 7.2 Cache Headers

```typescript
// apps/api/src/utils/cache.ts

export const CACHE_HEADERS = {
  // No caching for API responses with user data
  noStore: {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
  },

  // Short cache for rate limit info
  shortCache: {
    "Cache-Control": "private, max-age=60",
  },

  // Static assets
  longCache: {
    "Cache-Control": "public, max-age=31536000, immutable",
  },

  // Health endpoint
  healthCache: {
    "Cache-Control": "no-cache, max-age=0",
  },
};
```

---

## 8. Monitoring & Observability

### 8.1 Request ID Generation

```typescript
// apps/api/src/utils/request-id.ts

export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.getRandomValues(new Uint8Array(8));
  const randomStr = Array.from(random)
    .map((b) => b.toString(36))
    .join("")
    .substring(0, 8);
  return `req_${timestamp}_${randomStr}`;
}
```

### 8.2 Structured Logging

```typescript
// apps/api/src/utils/logger.ts

export interface LogEntry {
  level: "debug" | "info" | "warn" | "error";
  request_id: string;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export function createLogger(requestId: string) {
  const log = (
    level: LogEntry["level"],
    message: string,
    data?: Record<string, unknown>,
  ) => {
    const entry: LogEntry = {
      level,
      request_id: requestId,
      message,
      timestamp: new Date().toISOString(),
      ...(data && { data }),
    };

    // Console for local development
    console[level === "error" ? "error" : "log"](JSON.stringify(entry));

    // In production, you might write to D1 or external service
    return entry;
  };

  return {
    debug: (msg: string, data?: Record<string, unknown>) =>
      log("debug", msg, data),
    info: (msg: string, data?: Record<string, unknown>) =>
      log("info", msg, data),
    warn: (msg: string, data?: Record<string, unknown>) =>
      log("warn", msg, data),
    error: (msg: string, data?: Record<string, unknown>) =>
      log("error", msg, data),
  };
}
```

---

## Document Cross-References

- Database details: [DATABASE.md](./DATABASE.md)
- API implementation: [BACKEND.md](./BACKEND.md)
- Frontend integration: [FRONTEND.md](./FRONTEND.md)
- Deployment setup: [DEPLOYMENT.md](./DEPLOYMENT.md)
- Routing configuration: [ROUTING.md](./ROUTING.md)

---

_Architecture Version 1.0.0 - Created 2025-12-25_
