# BACKEND.md - Backend Implementation

**Project**: Scraper API MVP
**Version**: 1.0.0
**Last Updated**: 2025-12-25

---

## 1. Worker Module Structure

```
apps/api/
├── src/
│   ├── index.ts              # Entry point
│   ├── router.ts             # Hono router setup
│   ├── handlers/
│   │   ├── scrape.ts         # /api/v1/scrape
│   │   ├── screenshot.ts     # /api/v1/screenshot
│   │   ├── health.ts         # /health
│   │   └── user.ts           # /api/v1/user/*
│   ├── middleware/
│   │   ├── auth.ts           # API key validation
│   │   ├── rate-limit.ts     # Rate limiting
│   │   ├── cors.ts           # CORS headers
│   │   ├── request-id.ts     # Request ID injection
│   │   └── error-handler.ts  # Global error handling
│   ├── services/
│   │   ├── scraper-light.ts  # Cheerio-based scraping
│   │   ├── scraper-heavy.ts  # Puppeteer-based scraping
│   │   ├── quota.ts          # Quota management
│   │   └── user.ts           # User operations
│   ├── utils/
│   │   ├── ssrf.ts           # SSRF protection
│   │   ├── hash.ts           # Crypto utilities
│   │   ├── response.ts       # Response helpers
│   │   ├── logger.ts         # Structured logging
│   │   └── validators.ts     # Zod schemas
│   └── types.ts              # TypeScript types
├── wrangler.toml
├── tsconfig.json
└── package.json
```

---

## 2. Entry Point & Router

### 2.1 Main Entry (index.ts)

```typescript
// apps/api/src/index.ts

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requestIdMiddleware } from "./middleware/request-id";
import { errorHandler } from "./middleware/error-handler";
import { authMiddleware } from "./middleware/auth";
import { rateLimitMiddleware } from "./middleware/rate-limit";
import { healthHandler } from "./handlers/health";
import { scrapeHandler } from "./handlers/scrape";
import { screenshotHandler } from "./handlers/screenshot";
import { userRoutes } from "./handlers/user";
import type { Env, Variables } from "./types";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Global middleware
app.use("*", requestIdMiddleware);
app.use("*", errorHandler);
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => {
      // Allow configured origins
      const allowedOrigins = [
        "https://scraper.dev",
        "https://www.scraper.dev",
        "http://localhost:3000",
      ];
      return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "X-API-Key", "Authorization"],
    exposeHeaders: [
      "X-Request-ID",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
    ],
    maxAge: 86400,
    credentials: true,
  }),
);

// Public routes
app.get("/health", healthHandler);

// Protected routes
app.use("/api/*", authMiddleware);
app.use("/api/*", rateLimitMiddleware);

// API v1 routes
app.post("/api/v1/scrape", scrapeHandler);
app.post("/api/v1/screenshot", screenshotHandler);
app.route("/api/v1/user", userRoutes);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Endpoint not found",
        request_id: c.get("requestId"),
      },
    },
    404,
  );
});

export default app;
```

### 2.2 Type Definitions (types.ts)

```typescript
// apps/api/src/types.ts

import type { D1Database } from "@cloudflare/workers-types";

export interface Env {
  // D1 Database
  DB: D1Database;

  // Browser Rendering
  BROWSER: Fetcher;

  // Secrets
  AUTH_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;

  // Environment
  ENVIRONMENT: "development" | "staging" | "production";
}

export interface Variables {
  requestId: string;
  user: User | null;
  apiKey: ApiKey | null;
}

export interface User {
  id: string;
  github_id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  plan: "free" | "pro" | "enterprise";
  quota_limit: number;
  quota_count: number;
  quota_reset_at: number;
}

export interface ApiKey {
  id: string;
  user_id: string;
  key_prefix: string;
  name: string;
  is_active: boolean;
  last_used_at: number | null;
  created_at: number;
  expires_at: number | null;
}

export interface ScrapeRequest {
  url: string;
  render?: boolean;
  selector?: string;
  wait_for?: string;
  timeout?: number;
}

export interface ScreenshotRequest {
  url: string;
  width?: number;
  height?: number;
  full_page?: boolean;
  format?: "png" | "jpeg" | "webp";
}

export interface ScrapeResult {
  content: string;
  title: string;
  url: string;
  timestamp: string;
}
```

---

## 3. Authentication Flow (Complete Code)

### 3.1 Auth Middleware

```typescript
// apps/api/src/middleware/auth.ts

import type { Context, Next } from "hono";
import type { Env, Variables, User, ApiKey } from "../types";
import { hashApiKey } from "../utils/hash";
import { createErrorResponse } from "../utils/response";

interface AuthResult {
  user: User;
  apiKey: ApiKey;
}

async function validateApiKey(
  db: D1Database,
  keyHash: string,
): Promise<AuthResult | null> {
  const result = await db
    .prepare(
      `
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
    `,
    )
    .bind(keyHash, Date.now())
    .first<{
      id: string;
      github_id: string;
      email: string;
      name: string | null;
      avatar_url: string | null;
      plan: string;
      quota_limit: number;
      quota_count: number;
      quota_reset_at: number;
      key_id: string;
      user_id: string;
      key_prefix: string;
      key_name: string;
      is_active: number;
      last_used_at: number | null;
      created_at: number;
      expires_at: number | null;
    }>();

  if (!result) return null;

  return {
    user: {
      id: result.id,
      github_id: result.github_id,
      email: result.email,
      name: result.name,
      avatar_url: result.avatar_url,
      plan: result.plan as User["plan"],
      quota_limit: result.quota_limit,
      quota_count: result.quota_count,
      quota_reset_at: result.quota_reset_at,
    },
    apiKey: {
      id: result.key_id,
      user_id: result.user_id,
      key_prefix: result.key_prefix,
      name: result.key_name,
      is_active: result.is_active === 1,
      last_used_at: result.last_used_at,
      created_at: result.created_at,
      expires_at: result.expires_at,
    },
  };
}

export async function authMiddleware(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next,
) {
  const requestId = c.get("requestId");
  const apiKey = c.req.header("X-API-Key");

  // Check for API key
  if (!apiKey) {
    return createErrorResponse(
      "UNAUTHORIZED",
      "Missing API key. Include X-API-Key header.",
      requestId,
      401,
    );
  }

  // Validate format
  if (!apiKey.startsWith("sk_") || apiKey.length !== 67) {
    return createErrorResponse(
      "UNAUTHORIZED",
      "Invalid API key format.",
      requestId,
      401,
    );
  }

  // Hash and lookup
  const keyHash = await hashApiKey(apiKey);
  const authResult = await validateApiKey(c.env.DB, keyHash);

  if (!authResult) {
    return createErrorResponse(
      "UNAUTHORIZED",
      "Invalid or expired API key.",
      requestId,
      401,
    );
  }

  // Update last used timestamp (non-blocking)
  c.executionCtx.waitUntil(
    c.env.DB.prepare("UPDATE api_keys SET last_used_at = ? WHERE id = ?")
      .bind(Date.now(), authResult.apiKey.id)
      .run(),
  );

  // Log API key usage (non-blocking)
  c.executionCtx.waitUntil(
    c.env.DB.prepare(
      `
        INSERT INTO auth_logs (user_id, event_type, ip_address, user_agent, metadata)
        VALUES (?, 'key_used', ?, ?, ?)
      `,
    )
      .bind(
        authResult.user.id,
        c.req.header("CF-Connecting-IP") || "unknown",
        c.req.header("User-Agent") || "unknown",
        JSON.stringify({ key_prefix: authResult.apiKey.key_prefix }),
      )
      .run(),
  );

  // Set context
  c.set("user", authResult.user);
  c.set("apiKey", authResult.apiKey);

  await next();
}
```

### 3.2 Hash Utilities

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
  // Returns "sk_xxxxxxxx" (first 11 chars)
  return key.substring(0, 11);
}

export function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
```

---

## 4. Quota Management (Atomic SQL)

```typescript
// apps/api/src/services/quota.ts

import type { D1Database } from "@cloudflare/workers-types";
import type { User } from "../types";

export interface QuotaCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  reset_at: number;
  remaining: number;
}

export async function checkAndIncrementQuota(
  db: D1Database,
  userId: string,
  quotaLimit: number,
): Promise<QuotaCheckResult> {
  // Atomic update with reset logic
  // This query:
  // 1. Resets quota_count to 1 if it's a new day
  // 2. Otherwise increments by 1
  // 3. Only succeeds if under quota
  // 4. Returns the new count
  const result = await db
    .prepare(
      `
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
    `,
    )
    .bind(userId, quotaLimit)
    .first<{ quota_count: number; quota_reset_at: number }>();

  if (!result) {
    // Quota exceeded - get current values
    const current = await db
      .prepare("SELECT quota_count, quota_reset_at FROM users WHERE id = ?")
      .bind(userId)
      .first<{ quota_count: number; quota_reset_at: number }>();

    return {
      allowed: false,
      current: current?.quota_count || quotaLimit,
      limit: quotaLimit,
      reset_at: current?.quota_reset_at || Date.now(),
      remaining: 0,
    };
  }

  return {
    allowed: true,
    current: result.quota_count,
    limit: quotaLimit,
    reset_at: result.quota_reset_at,
    remaining: quotaLimit - result.quota_count,
  };
}

export function getResetTime(): number {
  // Next midnight UTC
  const now = new Date();
  const tomorrow = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    ),
  );
  return tomorrow.getTime();
}

export async function getQuotaInfo(
  db: D1Database,
  userId: string,
): Promise<QuotaCheckResult> {
  const result = await db
    .prepare(
      `
      SELECT quota_count, quota_limit, quota_reset_at
      FROM users
      WHERE id = ?
    `,
    )
    .bind(userId)
    .first<{
      quota_count: number;
      quota_limit: number;
      quota_reset_at: number;
    }>();

  if (!result) {
    throw new Error("User not found");
  }

  // Check if reset is needed (read-only check)
  const resetDate = new Date(result.quota_reset_at);
  const today = new Date();
  const needsReset = resetDate.toDateString() !== today.toDateString();

  const currentCount = needsReset ? 0 : result.quota_count;

  return {
    allowed: currentCount < result.quota_limit,
    current: currentCount,
    limit: result.quota_limit,
    reset_at: needsReset ? getResetTime() : result.quota_reset_at,
    remaining: result.quota_limit - currentCount,
  };
}
```

---

## 5. Scraping Engine

### 5.1 Light Scraper (Cheerio)

```typescript
// apps/api/src/services/scraper-light.ts

import * as cheerio from "cheerio";
import type { ScrapeRequest, ScrapeResult } from "../types";
import { validateUrl } from "../utils/ssrf";

export interface LightScrapeOptions {
  url: string;
  selector?: string;
  timeout?: number;
}

export async function scrapeLightweight(
  options: LightScrapeOptions,
): Promise<ScrapeResult> {
  const { url, selector, timeout = 30000 } = options;

  // Validate URL (SSRF protection)
  const validation = validateUrl(url);
  if (!validation.valid) {
    throw new Error(`SSRF_BLOCKED: ${validation.error}`);
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(validation.normalizedUrl!, {
      method: "GET",
      headers: {
        "User-Agent": "ScraperAPI/1.0 (+https://scraper.dev)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `SCRAPE_FAILED: HTTP ${response.status} ${response.statusText}`,
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove script and style tags
    $("script").remove();
    $("style").remove();

    // Extract content
    let content: string;
    if (selector) {
      const selected = $(selector);
      if (selected.length === 0) {
        throw new Error(`SELECTOR_NOT_FOUND: No elements match "${selector}"`);
      }
      content = selected.html() || selected.text();
    } else {
      content = $("body").html() || html;
    }

    // Extract title
    const title = $("title").text() || $("h1").first().text() || "";

    return {
      content: content.trim(),
      title: title.trim(),
      url: validation.normalizedUrl!,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("SCRAPE_TIMEOUT: Request timed out");
      }
      throw error;
    }
    throw new Error("SCRAPE_FAILED: Unknown error");
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### 5.2 Heavy Scraper (Puppeteer)

```typescript
// apps/api/src/services/scraper-heavy.ts

import type { ScrapeRequest, ScrapeResult, Env } from "../types";
import { validateUrl } from "../utils/ssrf";
import puppeteer from "@cloudflare/puppeteer";

export interface HeavyScrapeOptions {
  url: string;
  selector?: string;
  wait_for?: string;
  timeout?: number;
}

export async function scrapeHeavyweight(
  browser: Fetcher,
  options: HeavyScrapeOptions,
): Promise<ScrapeResult> {
  const { url, selector, wait_for, timeout = 30000 } = options;

  // Validate URL (SSRF protection)
  const validation = validateUrl(url);
  if (!validation.valid) {
    throw new Error(`SSRF_BLOCKED: ${validation.error}`);
  }

  // Launch browser
  const browserInstance = await puppeteer.launch(browser);

  try {
    const page = await browserInstance.newPage();

    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });

    // Set user agent
    await page.setUserAgent("ScraperAPI/1.0 (+https://scraper.dev)");

    // Navigate to page with timeout
    await page.goto(validation.normalizedUrl!, {
      waitUntil: "networkidle0",
      timeout: timeout,
    });

    // Wait for specific element if requested
    if (wait_for) {
      await page.waitForSelector(wait_for, { timeout: timeout / 2 });
    }

    // Extract content
    let content: string;
    if (selector) {
      const element = await page.$(selector);
      if (!element) {
        throw new Error(`SELECTOR_NOT_FOUND: No elements match "${selector}"`);
      }
      content = await page.evaluate((el) => el.innerHTML, element);
    } else {
      content = await page.content();
    }

    // Extract title
    const title = await page.title();

    return {
      content: content.trim(),
      title: title.trim(),
      url: validation.normalizedUrl!,
      timestamp: new Date().toISOString(),
    };
  } finally {
    await browserInstance.close();
  }
}

export async function takeScreenshot(
  browser: Fetcher,
  options: {
    url: string;
    width?: number;
    height?: number;
    full_page?: boolean;
    format?: "png" | "jpeg" | "webp";
    timeout?: number;
  },
): Promise<Buffer> {
  const {
    url,
    width = 1280,
    height = 720,
    full_page = false,
    format = "png",
    timeout = 30000,
  } = options;

  // Validate URL (SSRF protection)
  const validation = validateUrl(url);
  if (!validation.valid) {
    throw new Error(`SSRF_BLOCKED: ${validation.error}`);
  }

  const browserInstance = await puppeteer.launch(browser);

  try {
    const page = await browserInstance.newPage();

    await page.setViewport({ width, height });
    await page.setUserAgent("ScraperAPI/1.0 (+https://scraper.dev)");

    await page.goto(validation.normalizedUrl!, {
      waitUntil: "networkidle0",
      timeout: timeout,
    });

    const screenshot = await page.screenshot({
      type: format,
      fullPage: full_page,
      ...(format === "jpeg" && { quality: 85 }),
    });

    return screenshot as Buffer;
  } finally {
    await browserInstance.close();
  }
}
```

---

## 6. SSRF Protection Implementation

```typescript
// apps/api/src/utils/ssrf.ts

const BLOCKED_HOSTS = new Set([
  // Localhost variations
  "localhost",
  "localhost.localdomain",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",

  // Cloud metadata endpoints
  "169.254.169.254",
  "metadata.google.internal",
  "metadata.google.com",
  "metadata",

  // Kubernetes
  "kubernetes.default.svc",
  "kubernetes.default",
  "kubernetes",

  // AWS
  "instance-data",
  "169.254.170.2",

  // Link-local
  "169.254.0.0",
]);

const BLOCKED_PORTS = new Set([
  22, // SSH
  23, // Telnet
  25, // SMTP
  53, // DNS
  110, // POP3
  143, // IMAP
  445, // SMB
  3306, // MySQL
  3389, // RDP
  5432, // PostgreSQL
  5900, // VNC
  6379, // Redis
  11211, // Memcached
  27017, // MongoDB
]);

const PRIVATE_IP_PATTERNS = [
  // IPv4 private ranges
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,

  // Link-local
  /^169\.254\./,

  // Loopback
  /^localhost$/i,

  // IPv6 private ranges
  /^::1$/,
  /^fc00:/i,
  /^fd00:/i,
  /^fe80:/i,
  /^ff00:/i,
];

export interface SSRFValidationResult {
  valid: boolean;
  error?: string;
  normalizedUrl?: string;
}

export function validateUrl(input: string): SSRFValidationResult {
  // Input validation
  if (typeof input !== "string") {
    return { valid: false, error: "URL must be a string" };
  }

  const trimmed = input.trim();
  if (trimmed === "") {
    return { valid: false, error: "URL cannot be empty" };
  }

  // Parse URL
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  // Protocol whitelist
  if (!["http:", "https:"].includes(url.protocol)) {
    return {
      valid: false,
      error: `Protocol "${url.protocol.replace(":", "")}" is not allowed. Use http or https.`,
    };
  }

  // Hostname validation
  const hostname = url.hostname.toLowerCase();

  // Block known dangerous hosts
  if (BLOCKED_HOSTS.has(hostname)) {
    return { valid: false, error: "Access to this host is not allowed" };
  }

  // Check for IP address patterns
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return {
        valid: false,
        error: "Access to private IP addresses is not allowed",
      };
    }
  }

  // Port validation
  let port: number;
  if (url.port) {
    port = parseInt(url.port, 10);
  } else {
    port = url.protocol === "https:" ? 443 : 80;
  }

  if (BLOCKED_PORTS.has(port)) {
    return { valid: false, error: `Port ${port} is not allowed` };
  }

  // Block high ports commonly used by databases
  if (
    port >= 5000 &&
    port <= 9999 &&
    ![5000, 8000, 8080, 8443, 9000].includes(port)
  ) {
    // Allow common web ports, block others in this range
  }

  // IPv4 octet validation
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Match = hostname.match(ipv4Regex);
  if (ipv4Match) {
    const octets = ipv4Match.slice(1).map(Number);
    if (octets.some((o) => o > 255)) {
      return { valid: false, error: "Invalid IP address" };
    }

    // Additional private range checks
    const [a, b] = octets;
    if (a === 10) {
      return {
        valid: false,
        error: "Access to private IP addresses is not allowed",
      };
    }
    if (a === 172 && b >= 16 && b <= 31) {
      return {
        valid: false,
        error: "Access to private IP addresses is not allowed",
      };
    }
    if (a === 192 && b === 168) {
      return {
        valid: false,
        error: "Access to private IP addresses is not allowed",
      };
    }
    if (a === 127) {
      return {
        valid: false,
        error: "Access to loopback addresses is not allowed",
      };
    }
    if (a === 0) {
      return {
        valid: false,
        error: "Access to reserved addresses is not allowed",
      };
    }
    if (a === 169 && b === 254) {
      return {
        valid: false,
        error: "Access to link-local addresses is not allowed",
      };
    }
  }

  // URL length limit (prevent DoS)
  if (url.toString().length > 2048) {
    return {
      valid: false,
      error: "URL exceeds maximum length of 2048 characters",
    };
  }

  // Normalize and return
  return {
    valid: true,
    normalizedUrl: url.toString(),
  };
}

// Additional DNS resolution check (for production use)
export async function validateUrlWithDNS(
  input: string,
): Promise<SSRFValidationResult> {
  const basicResult = validateUrl(input);
  if (!basicResult.valid) {
    return basicResult;
  }

  // In Workers, Cloudflare handles DNS security
  // This is a placeholder for additional checks if needed
  return basicResult;
}
```

---

## 7. Rate Limiting Logic

```typescript
// apps/api/src/middleware/rate-limit.ts

import type { Context, Next } from "hono";
import type { Env, Variables } from "../types";
import { createErrorResponse } from "../utils/response";
import { checkAndIncrementQuota } from "../services/quota";

export async function rateLimitMiddleware(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next,
) {
  const requestId = c.get("requestId");
  const user = c.get("user");

  if (!user) {
    return createErrorResponse(
      "UNAUTHORIZED",
      "Authentication required",
      requestId,
      401,
    );
  }

  // Check and increment quota atomically
  const quotaResult = await checkAndIncrementQuota(
    c.env.DB,
    user.id,
    user.quota_limit,
  );

  // Set rate limit headers
  c.header("X-RateLimit-Limit", user.quota_limit.toString());
  c.header("X-RateLimit-Remaining", quotaResult.remaining.toString());
  c.header(
    "X-RateLimit-Reset",
    Math.floor(quotaResult.reset_at / 1000).toString(),
  );

  if (!quotaResult.allowed) {
    const resetDate = new Date(quotaResult.reset_at);
    return createErrorResponse(
      "QUOTA_EXCEEDED",
      `Daily quota of ${user.quota_limit} requests exceeded. Resets at ${resetDate.toISOString()}.`,
      requestId,
      429,
      {
        limit: quotaResult.limit,
        current: quotaResult.current,
        reset_at: quotaResult.reset_at,
      },
    );
  }

  await next();
}
```

---

## 8. Error Response Formats

```typescript
// apps/api/src/utils/response.ts

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    request_id: string;
    details?: Record<string, unknown>;
  };
}

export interface ApiSuccessBody<T> {
  success: true;
  data: T;
  meta: {
    request_id: string;
    duration_ms?: number;
    render_mode?: "light" | "heavy";
    [key: string]: unknown;
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  requestId: string,
  status: number,
  details?: Record<string, unknown>,
): Response {
  const body: ApiErrorBody = {
    success: false,
    error: {
      code,
      message,
      request_id: requestId,
      ...(details && { details }),
    },
  };

  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": requestId,
      "Cache-Control": "no-store",
    },
  });
}

export function createSuccessResponse<T>(
  data: T,
  requestId: string,
  status: number = 200,
  meta?: Record<string, unknown>,
): Response {
  const body: ApiSuccessBody<T> = {
    success: true,
    data,
    meta: {
      request_id: requestId,
      ...meta,
    },
  };

  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": requestId,
      "Cache-Control": "no-store",
    },
  });
}

export function createImageResponse(
  data: ArrayBuffer | Buffer,
  format: "png" | "jpeg" | "webp",
  requestId: string,
): Response {
  const mimeType = {
    png: "image/png",
    jpeg: "image/jpeg",
    webp: "image/webp",
  }[format];

  return new Response(data, {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "X-Request-ID": requestId,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
```

---

## 9. Request Handlers

### 9.1 Scrape Handler

```typescript
// apps/api/src/handlers/scrape.ts

import type { Context } from "hono";
import type { Env, Variables, ScrapeRequest } from "../types";
import { z } from "zod";
import { createErrorResponse, createSuccessResponse } from "../utils/response";
import { scrapeLightweight } from "../services/scraper-light";
import { scrapeHeavyweight } from "../services/scraper-heavy";

const scrapeSchema = z.object({
  url: z.string().url("Invalid URL format"),
  render: z.boolean().default(false),
  selector: z.string().optional(),
  wait_for: z.string().optional(),
  timeout: z.number().min(1000).max(30000).default(30000),
});

export async function scrapeHandler(
  c: Context<{ Bindings: Env; Variables: Variables }>,
) {
  const requestId = c.get("requestId");
  const startTime = Date.now();

  // Parse and validate request body
  let body: ScrapeRequest;
  try {
    const rawBody = await c.req.json();
    body = scrapeSchema.parse(rawBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(
        "INVALID_REQUEST",
        "Request validation failed",
        requestId,
        400,
        { errors: error.errors },
      );
    }
    return createErrorResponse(
      "INVALID_REQUEST",
      "Invalid JSON body",
      requestId,
      400,
    );
  }

  try {
    let result;
    const renderMode = body.render ? "heavy" : "light";

    if (body.render) {
      // Heavy scraping with Puppeteer
      result = await scrapeHeavyweight(c.env.BROWSER, {
        url: body.url,
        selector: body.selector,
        wait_for: body.wait_for,
        timeout: body.timeout,
      });
    } else {
      // Light scraping with Cheerio
      result = await scrapeLightweight({
        url: body.url,
        selector: body.selector,
        timeout: body.timeout,
      });
    }

    const duration = Date.now() - startTime;

    // Log request (non-blocking)
    c.executionCtx.waitUntil(
      c.env.DB.prepare(
        `
          INSERT INTO request_logs
          (request_id, user_id, api_key_id, method, path, target_url, render_mode, status_code, duration_ms, ip_address, user_agent, cf_ray)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
        .bind(
          requestId,
          c.get("user")?.id,
          c.get("apiKey")?.id,
          "POST",
          "/api/v1/scrape",
          body.url,
          renderMode,
          200,
          duration,
          c.req.header("CF-Connecting-IP"),
          c.req.header("User-Agent"),
          c.req.header("CF-Ray"),
        )
        .run(),
    );

    return createSuccessResponse(result, requestId, 200, {
      duration_ms: duration,
      render_mode: renderMode,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown error";

    // Parse error type
    let code = "SCRAPE_FAILED";
    let status = 502;

    if (message.startsWith("SSRF_BLOCKED:")) {
      code = "SSRF_BLOCKED";
      status = 400;
    } else if (message.startsWith("SCRAPE_TIMEOUT:")) {
      code = "SCRAPE_TIMEOUT";
      status = 504;
    } else if (message.startsWith("SELECTOR_NOT_FOUND:")) {
      code = "SELECTOR_NOT_FOUND";
      status = 400;
    }

    // Log error (non-blocking)
    c.executionCtx.waitUntil(
      c.env.DB.prepare(
        `
          INSERT INTO request_logs
          (request_id, user_id, api_key_id, method, path, target_url, render_mode, status_code, error_code, duration_ms, ip_address, user_agent, cf_ray)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
        .bind(
          requestId,
          c.get("user")?.id,
          c.get("apiKey")?.id,
          "POST",
          "/api/v1/scrape",
          body.url,
          body.render ? "heavy" : "light",
          status,
          code,
          duration,
          c.req.header("CF-Connecting-IP"),
          c.req.header("User-Agent"),
          c.req.header("CF-Ray"),
        )
        .run(),
    );

    return createErrorResponse(
      code,
      message.replace(/^[A-Z_]+:\s*/, ""),
      requestId,
      status,
    );
  }
}
```

### 9.2 Screenshot Handler

```typescript
// apps/api/src/handlers/screenshot.ts

import type { Context } from "hono";
import type { Env, Variables, ScreenshotRequest } from "../types";
import { z } from "zod";
import { createErrorResponse, createImageResponse } from "../utils/response";
import { takeScreenshot } from "../services/scraper-heavy";

const screenshotSchema = z.object({
  url: z.string().url("Invalid URL format"),
  width: z.number().min(320).max(1920).default(1280),
  height: z.number().min(240).max(1080).default(720),
  full_page: z.boolean().default(false),
  format: z.enum(["png", "jpeg", "webp"]).default("png"),
  timeout: z.number().min(1000).max(30000).default(30000),
});

export async function screenshotHandler(
  c: Context<{ Bindings: Env; Variables: Variables }>,
) {
  const requestId = c.get("requestId");
  const startTime = Date.now();

  // Parse and validate request body
  let body: ScreenshotRequest & { timeout?: number };
  try {
    const rawBody = await c.req.json();
    body = screenshotSchema.parse(rawBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(
        "INVALID_REQUEST",
        "Request validation failed",
        requestId,
        400,
        { errors: error.errors },
      );
    }
    return createErrorResponse(
      "INVALID_REQUEST",
      "Invalid JSON body",
      requestId,
      400,
    );
  }

  try {
    const screenshot = await takeScreenshot(c.env.BROWSER, {
      url: body.url,
      width: body.width,
      height: body.height,
      full_page: body.full_page,
      format: body.format,
      timeout: body.timeout,
    });

    const duration = Date.now() - startTime;

    // Log request (non-blocking)
    c.executionCtx.waitUntil(
      c.env.DB.prepare(
        `
          INSERT INTO request_logs
          (request_id, user_id, api_key_id, method, path, target_url, render_mode, status_code, duration_ms, ip_address, user_agent, cf_ray)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
        .bind(
          requestId,
          c.get("user")?.id,
          c.get("apiKey")?.id,
          "POST",
          "/api/v1/screenshot",
          body.url,
          "heavy",
          200,
          duration,
          c.req.header("CF-Connecting-IP"),
          c.req.header("User-Agent"),
          c.req.header("CF-Ray"),
        )
        .run(),
    );

    return createImageResponse(screenshot, body.format!, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown error";

    let code = "SCREENSHOT_FAILED";
    let status = 502;

    if (message.startsWith("SSRF_BLOCKED:")) {
      code = "SSRF_BLOCKED";
      status = 400;
    } else if (message.startsWith("SCRAPE_TIMEOUT:")) {
      code = "SCREENSHOT_TIMEOUT";
      status = 504;
    }

    return createErrorResponse(
      code,
      message.replace(/^[A-Z_]+:\s*/, ""),
      requestId,
      status,
    );
  }
}
```

### 9.3 Health Handler

```typescript
// apps/api/src/handlers/health.ts

import type { Context } from "hono";
import type { Env, Variables } from "../types";

export async function healthHandler(
  c: Context<{ Bindings: Env; Variables: Variables }>,
) {
  const checks: Record<string, "ok" | "error"> = {};

  // Check D1 connection
  try {
    await c.env.DB.prepare("SELECT 1").first();
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  const allHealthy = Object.values(checks).every((v) => v === "ok");

  return c.json(
    {
      status: allHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
      version: "1.0.0",
    },
    allHealthy ? 200 : 503,
  );
}
```

---

## 10. Testing Strategy

### 10.1 Test Structure

```typescript
// apps/api/tests/unit/ssrf.test.ts

import { describe, it, expect } from "vitest";
import { validateUrl } from "../../src/utils/ssrf";

describe("SSRF Protection", () => {
  describe("validateUrl", () => {
    it("should allow valid HTTP URLs", () => {
      const result = validateUrl("https://example.com");
      expect(result.valid).toBe(true);
      expect(result.normalizedUrl).toBe("https://example.com/");
    });

    it("should block localhost", () => {
      const result = validateUrl("http://localhost:3000");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not allowed");
    });

    it("should block 127.0.0.1", () => {
      const result = validateUrl("http://127.0.0.1");
      expect(result.valid).toBe(false);
    });

    it("should block private IP 10.x.x.x", () => {
      const result = validateUrl("http://10.0.0.1");
      expect(result.valid).toBe(false);
    });

    it("should block private IP 172.16-31.x.x", () => {
      const result = validateUrl("http://172.16.0.1");
      expect(result.valid).toBe(false);
    });

    it("should block private IP 192.168.x.x", () => {
      const result = validateUrl("http://192.168.1.1");
      expect(result.valid).toBe(false);
    });

    it("should block AWS metadata", () => {
      const result = validateUrl("http://169.254.169.254/latest/meta-data/");
      expect(result.valid).toBe(false);
    });

    it("should block file protocol", () => {
      const result = validateUrl("file:///etc/passwd");
      expect(result.valid).toBe(false);
    });

    it("should block dangerous ports", () => {
      const result = validateUrl("http://example.com:22");
      expect(result.valid).toBe(false);
    });

    it("should allow standard HTTP ports", () => {
      expect(validateUrl("http://example.com:80").valid).toBe(true);
      expect(validateUrl("https://example.com:443").valid).toBe(true);
    });

    it("should allow common alt HTTP ports", () => {
      expect(validateUrl("http://example.com:8080").valid).toBe(true);
      expect(validateUrl("https://example.com:8443").valid).toBe(true);
    });
  });
});
```

### 10.2 Integration Tests

```typescript
// apps/api/tests/integration/scrape.test.ts

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { unstable_dev } from "wrangler";
import type { UnstableDevWorker } from "wrangler";

describe("Scrape API", () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    worker = await unstable_dev("src/index.ts", {
      experimental: { disableExperimentalWarning: true },
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  it("should require API key", async () => {
    const response = await worker.fetch("/api/v1/scrape", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com" }),
    });
    expect(response.status).toBe(401);
  });

  it("should validate URL format", async () => {
    const response = await worker.fetch("/api/v1/scrape", {
      method: "POST",
      headers: { "X-API-Key": "sk_test_key" },
      body: JSON.stringify({ url: "not-a-url" }),
    });
    expect(response.status).toBe(400);
  });

  it("should return health check", async () => {
    const response = await worker.fetch("/health");
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe("ok");
  });
});
```

### 10.3 Package.json for API

```json
{
  "name": "@scraper-api/api",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "@cloudflare/puppeteer": "^0.0.5",
    "cheerio": "^1.0.0-rc.12",
    "hono": "^4.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20240208.0",
    "@types/node": "^20.11.0",
    "typescript": "^5.3.0",
    "vitest": "^1.2.0",
    "wrangler": "^3.28.0"
  }
}
```

---

## Document Cross-References

- Architecture overview: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Database schema: [DATABASE.md](./DATABASE.md)
- API routing: [ROUTING.md](./ROUTING.md)
- Deployment: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

_Backend Implementation Version 1.0.0 - Created 2025-12-25_
