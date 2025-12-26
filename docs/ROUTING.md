# ROUTING.md - Routing & API Design

**Project**: Scraper API MVP
**Version**: 1.0.0
**Last Updated**: 2025-12-25

---

## 1. Frontend Routes (Next.js App Router)

### Route Structure

```
/                           # Landing page (marketing)
/pricing                    # Pricing page
/docs                       # Documentation
/login                      # Login page (GitHub OAuth)
/signup                     # Signup redirect to login

/dashboard                  # Main dashboard
/dashboard/usage            # Usage statistics
/api-keys                   # API key management
/playground                 # API testing playground
/settings                   # User settings
/settings/profile           # Profile settings
/settings/billing           # Billing settings (future)
```

### Route Groups

```typescript
// app/(marketing)/layout.tsx - Public pages
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </>
  );
}

// app/(auth)/layout.tsx - Authentication pages
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {children}
    </div>
  );
}

// app/(dashboard)/layout.tsx - Protected dashboard
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={session.user} />
      <div className="flex">
        <DashboardNav />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
```

### Route Protection Middleware

```typescript
// middleware.ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // Protected routes
  const protectedPaths = [
    "/dashboard",
    "/playground",
    "/settings",
    "/api-keys",
  ];

  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  if (isProtected && !session?.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect logged-in users from auth pages
  if (session?.user && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/playground/:path*",
    "/settings/:path*",
    "/api-keys/:path*",
    "/login",
    "/signup",
  ],
};
```

---

## 2. API Endpoints (Cloudflare Worker)

### Endpoint Overview

| Method   | Endpoint                    | Auth     | Description          |
| -------- | --------------------------- | -------- | -------------------- |
| `GET`    | `/health`                   | None     | Health check         |
| `POST`   | `/api/v1/scrape`            | API Key  | Scrape a webpage     |
| `POST`   | `/api/v1/screenshot`        | API Key  | Take a screenshot    |
| `GET`    | `/api/v1/user/usage`        | API Key  | Get usage stats      |
| `GET`    | `/api/v1/user/api-keys`     | Session  | List API keys        |
| `POST`   | `/api/v1/user/api-keys`     | Session  | Create API key       |
| `DELETE` | `/api/v1/user/api-keys/:id` | Session  | Revoke API key       |
| `GET`    | `/api/v1/user/requests`     | Session  | Get request logs     |
| `POST`   | `/internal/auth/sync`       | Internal | Sync user from OAuth |

### Router Implementation

```typescript
// apps/api/src/router.ts

import { Hono } from "hono";
import type { Env, Variables } from "./types";

// Handlers
import { healthHandler } from "./handlers/health";
import { scrapeHandler } from "./handlers/scrape";
import { screenshotHandler } from "./handlers/screenshot";
import {
  getUserUsage,
  getApiKeys,
  createApiKey,
  revokeApiKey,
  getRequestLogs,
} from "./handlers/user";
import { syncUser } from "./handlers/internal";

// Middleware
import { corsMiddleware } from "./middleware/cors";
import { requestIdMiddleware } from "./middleware/request-id";
import { errorHandler } from "./middleware/error-handler";
import { apiKeyAuthMiddleware } from "./middleware/auth";
import { sessionAuthMiddleware } from "./middleware/session-auth";
import { internalAuthMiddleware } from "./middleware/internal-auth";
import { rateLimitMiddleware } from "./middleware/rate-limit";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Global middleware
app.use("*", requestIdMiddleware);
app.use("*", errorHandler);
app.use("*", corsMiddleware);

// Health check (public)
app.get("/health", healthHandler);

// API v1 - API Key authenticated
const apiV1 = new Hono<{ Bindings: Env; Variables: Variables }>();
apiV1.use("*", apiKeyAuthMiddleware);
apiV1.use("*", rateLimitMiddleware);
apiV1.post("/scrape", scrapeHandler);
apiV1.post("/screenshot", screenshotHandler);

// User endpoints - can use API Key or Session
apiV1.get("/user/usage", getUserUsage);

app.route("/api/v1", apiV1);

// User management - Session authenticated only
const userApi = new Hono<{ Bindings: Env; Variables: Variables }>();
userApi.use("*", sessionAuthMiddleware);
userApi.get("/api-keys", getApiKeys);
userApi.post("/api-keys", createApiKey);
userApi.delete("/api-keys/:id", revokeApiKey);
userApi.get("/requests", getRequestLogs);

app.route("/api/v1/user", userApi);

// Internal endpoints
const internalApi = new Hono<{ Bindings: Env; Variables: Variables }>();
internalApi.use("*", internalAuthMiddleware);
internalApi.post("/auth/sync", syncUser);

app.route("/internal", internalApi);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `Endpoint ${c.req.method} ${c.req.path} not found`,
        request_id: c.get("requestId"),
      },
    },
    404,
  );
});

export default app;
```

---

## 3. API Endpoint Specifications

### 3.1 Health Check

```typescript
// GET /health

// Response 200
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "checks": {
    "database": "ok"
  },
  "version": "1.0.0"
}

// Response 503 (degraded)
{
  "status": "degraded",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "checks": {
    "database": "error"
  },
  "version": "1.0.0"
}
```

### 3.2 Scrape Endpoint

```typescript
// POST /api/v1/scrape
// Headers: X-API-Key: sk_xxxxxxxx

// Request Body
{
  "url": "https://example.com",      // required
  "render": false,                    // optional, default: false
  "selector": "article.content",      // optional, CSS selector
  "wait_for": "#dynamic-content",     // optional, requires render=true
  "timeout": 30000                    // optional, max 30000ms
}

// Response 200
{
  "success": true,
  "data": {
    "content": "<html>...",
    "title": "Example Domain",
    "url": "https://example.com/",
    "timestamp": "2025-01-01T00:00:00.000Z"
  },
  "meta": {
    "request_id": "req_abc123def456",
    "duration_ms": 245,
    "render_mode": "light"
  }
}

// Response 400 (validation error)
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Request validation failed",
    "request_id": "req_abc123def456",
    "details": {
      "errors": [
        {
          "path": ["url"],
          "message": "Invalid URL format"
        }
      ]
    }
  }
}

// Response 429 (quota exceeded)
{
  "success": false,
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Daily quota of 100 requests exceeded. Resets at 2025-01-02T00:00:00.000Z.",
    "request_id": "req_abc123def456",
    "details": {
      "limit": 100,
      "current": 100,
      "reset_at": 1735776000000
    }
  }
}
```

### 3.3 Screenshot Endpoint

```typescript
// POST /api/v1/screenshot
// Headers: X-API-Key: sk_xxxxxxxx

// Request Body
{
  "url": "https://example.com",       // required
  "width": 1280,                       // optional, default: 1280
  "height": 720,                       // optional, default: 720
  "full_page": false,                  // optional, default: false
  "format": "png",                     // optional: png, jpeg, webp
  "timeout": 30000                     // optional, max 30000ms
}

// Response 200
// Content-Type: image/png (or jpeg/webp)
// Body: Binary image data

// Response Headers
X-Request-ID: req_abc123def456
Cache-Control: public, max-age=3600
```

### 3.4 User Usage

```typescript
// GET /api/v1/user/usage
// Headers: X-API-Key: sk_xxxxxxxx

// Response 200
{
  "success": true,
  "data": {
    "used": 45,
    "limit": 100,
    "remaining": 55,
    "reset_at": "2025-01-02T00:00:00.000Z"
  },
  "meta": {
    "request_id": "req_abc123def456"
  }
}
```

### 3.5 API Keys Management

```typescript
// GET /api/v1/user/api-keys
// Auth: Session cookie

// Response 200
{
  "success": true,
  "data": [
    {
      "id": "key_abc123",
      "key_prefix": "sk_abc1234",
      "name": "Production",
      "created_at": "2025-01-01T00:00:00.000Z",
      "last_used_at": "2025-01-01T12:00:00.000Z"
    }
  ],
  "meta": {
    "request_id": "req_abc123def456"
  }
}

// POST /api/v1/user/api-keys
// Auth: Session cookie

// Request Body
{
  "name": "Development"
}

// Response 201
{
  "success": true,
  "data": {
    "id": "key_xyz789",
    "key": "sk_0123456789abcdef...",  // ONLY returned on creation
    "key_prefix": "sk_0123456",
    "name": "Development"
  },
  "meta": {
    "request_id": "req_abc123def456"
  }
}

// DELETE /api/v1/user/api-keys/:id
// Auth: Session cookie

// Response 200
{
  "success": true,
  "data": {
    "revoked": true
  },
  "meta": {
    "request_id": "req_abc123def456"
  }
}
```

### 3.6 Request Logs

```typescript
// GET /api/v1/user/requests?limit=10
// Auth: Session cookie

// Response 200
{
  "success": true,
  "data": [
    {
      "request_id": "req_abc123",
      "method": "POST",
      "path": "/api/v1/scrape",
      "target_url": "https://example.com",
      "render_mode": "light",
      "status_code": 200,
      "duration_ms": 245,
      "created_at": "2025-01-01T12:00:00.000Z"
    }
  ],
  "meta": {
    "request_id": "req_xyz789",
    "total": 45
  }
}
```

---

## 4. Service Binding Configuration

### Next.js to Worker Binding

```typescript
// apps/web/app/api/proxy/[...path]/route.ts
// Proxy requests from Next.js to Worker via Service Binding

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxyToWorker(request, params.path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxyToWorker(request, params.path);
}

async function proxyToWorker(request: NextRequest, path: string[]) {
  const apiPath = "/" + path.join("/");
  const apiUrl = `${process.env.API_WORKER_URL}${apiPath}`;

  // Forward the request
  const response = await fetch(apiUrl, {
    method: request.method,
    headers: {
      "Content-Type": "application/json",
      // Forward session for user endpoints
      Cookie: request.headers.get("cookie") || "",
    },
    body: request.method !== "GET" ? await request.text() : undefined,
  });

  // Return the response
  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("Content-Type") || "application/json",
    },
  });
}
```

### wrangler.toml Service Binding

```toml
# apps/api/wrangler.toml

name = "scraper-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "scraper-api-db"
database_id = "your-database-id"

# Browser Rendering
[browser]
binding = "BROWSER"

# Environment variables (non-secret)
[vars]
ENVIRONMENT = "production"

# For Pages service binding (optional)
# [[services]]
# binding = "API"
# service = "scraper-api"
```

---

## 5. CORS Configuration

```typescript
// apps/api/src/middleware/cors.ts

import { cors } from "hono/cors";
import type { Context, Next } from "hono";
import type { Env } from "../types";

const ALLOWED_ORIGINS = [
  "https://scraper.dev",
  "https://www.scraper.dev",
  "https://app.scraper.dev",
];

const DEV_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:8787",
  "http://127.0.0.1:3000",
];

export function corsMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const allowedOrigins =
    c.env.ENVIRONMENT === "production"
      ? ALLOWED_ORIGINS
      : [...ALLOWED_ORIGINS, ...DEV_ORIGINS];

  return cors({
    origin: (origin) => {
      if (!origin) return ALLOWED_ORIGINS[0];
      return allowedOrigins.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "X-API-Key",
      "Authorization",
      "X-Request-ID",
    ],
    exposeHeaders: [
      "X-Request-ID",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
    ],
    maxAge: 86400,
    credentials: true,
  })(c, next);
}
```

---

## 6. Authentication Middleware

### API Key Authentication

```typescript
// apps/api/src/middleware/auth.ts

import type { Context, Next } from "hono";
import type { Env, Variables, User, ApiKey } from "../types";
import { hashApiKey } from "../utils/hash";
import { createErrorResponse } from "../utils/response";

export async function apiKeyAuthMiddleware(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next,
) {
  const requestId = c.get("requestId");
  const apiKey = c.req.header("X-API-Key");

  if (!apiKey) {
    return createErrorResponse(
      "UNAUTHORIZED",
      "Missing API key. Include X-API-Key header.",
      requestId,
      401,
    );
  }

  // Validate format: sk_ + 64 hex chars = 67 chars total
  if (!apiKey.startsWith("sk_") || apiKey.length !== 67) {
    return createErrorResponse(
      "UNAUTHORIZED",
      "Invalid API key format. Keys should start with sk_ followed by 64 characters.",
      requestId,
      401,
    );
  }

  const keyHash = await hashApiKey(apiKey);

  const result = await c.env.DB.prepare(
    `
      SELECT
        u.id, u.email, u.name, u.plan, u.quota_limit, u.quota_count, u.quota_reset_at,
        k.id as key_id, k.key_prefix, k.name as key_name
      FROM api_keys k
      JOIN users u ON k.user_id = u.id
      WHERE k.key_hash = ?
        AND k.is_active = 1
        AND u.deleted_at IS NULL
        AND (k.expires_at IS NULL OR k.expires_at > ?)
    `,
  )
    .bind(keyHash, Date.now())
    .first();

  if (!result) {
    return createErrorResponse(
      "UNAUTHORIZED",
      "Invalid or expired API key.",
      requestId,
      401,
    );
  }

  // Set user context
  c.set("user", {
    id: result.id as string,
    email: result.email as string,
    name: result.name as string,
    plan: result.plan as User["plan"],
    quota_limit: result.quota_limit as number,
    quota_count: result.quota_count as number,
    quota_reset_at: result.quota_reset_at as number,
  });

  c.set("apiKey", {
    id: result.key_id as string,
    key_prefix: result.key_prefix as string,
    name: result.key_name as string,
  });

  // Update last used (non-blocking)
  c.executionCtx.waitUntil(
    c.env.DB.prepare("UPDATE api_keys SET last_used_at = ? WHERE id = ?")
      .bind(Date.now(), result.key_id)
      .run(),
  );

  await next();
}
```

### Session Authentication

```typescript
// apps/api/src/middleware/session-auth.ts

import type { Context, Next } from "hono";
import type { Env, Variables } from "../types";
import { createErrorResponse } from "../utils/response";

export async function sessionAuthMiddleware(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next,
) {
  const requestId = c.get("requestId");

  // Get session token from cookie
  const cookies = c.req.header("Cookie") || "";
  const sessionToken = extractSessionToken(cookies);

  if (!sessionToken) {
    return createErrorResponse(
      "UNAUTHORIZED",
      "Session required. Please log in.",
      requestId,
      401,
    );
  }

  // Validate session
  const session = await c.env.DB.prepare(
    `
      SELECT s.*, u.*
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token = ?
        AND s.expires_at > ?
        AND u.deleted_at IS NULL
    `,
  )
    .bind(sessionToken, Date.now())
    .first();

  if (!session) {
    return createErrorResponse(
      "UNAUTHORIZED",
      "Invalid or expired session. Please log in again.",
      requestId,
      401,
    );
  }

  c.set("user", {
    id: session.user_id as string,
    email: session.email as string,
    name: session.name as string,
    plan: session.plan as string,
    quota_limit: session.quota_limit as number,
    quota_count: session.quota_count as number,
    quota_reset_at: session.quota_reset_at as number,
  });

  await next();
}

function extractSessionToken(cookies: string): string | null {
  const match = cookies.match(/authjs\.session-token=([^;]+)/);
  return match ? match[1] : null;
}
```

### Internal Authentication

```typescript
// apps/api/src/middleware/internal-auth.ts

import type { Context, Next } from "hono";
import type { Env, Variables } from "../types";
import { createErrorResponse } from "../utils/response";

export async function internalAuthMiddleware(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next,
) {
  const requestId = c.get("requestId");
  const secret = c.req.header("X-Internal-Secret");

  if (!secret || secret !== c.env.INTERNAL_API_SECRET) {
    return createErrorResponse(
      "FORBIDDEN",
      "Internal endpoint access denied.",
      requestId,
      403,
    );
  }

  await next();
}
```

---

## 7. Rate Limit Headers

```typescript
// Response headers for rate-limited endpoints

// Success response headers
X-RateLimit-Limit: 100          // Daily limit
X-RateLimit-Remaining: 55       // Remaining requests
X-RateLimit-Reset: 1735776000   // Unix timestamp of reset

// When quota exceeded
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1735776000
Retry-After: 3600

{
  "success": false,
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Daily quota exceeded. Resets in 1 hour.",
    "request_id": "req_abc123"
  }
}
```

---

## 8. Error Response Standards

### Error Codes Reference

| Code                 | HTTP Status | Description                             |
| -------------------- | ----------- | --------------------------------------- |
| `INVALID_REQUEST`    | 400         | Request body validation failed          |
| `INVALID_URL`        | 400         | Target URL is malformed                 |
| `SSRF_BLOCKED`       | 400         | URL blocked by SSRF protection          |
| `SELECTOR_NOT_FOUND` | 400         | CSS selector matched no elements        |
| `UNAUTHORIZED`       | 401         | Missing or invalid authentication       |
| `FORBIDDEN`          | 403         | Valid auth but insufficient permissions |
| `NOT_FOUND`          | 404         | Endpoint or resource not found          |
| `QUOTA_EXCEEDED`     | 429         | Daily quota limit reached               |
| `RATE_LIMITED`       | 429         | Too many requests per minute            |
| `SCRAPE_FAILED`      | 502         | Target website returned error           |
| `SCREENSHOT_FAILED`  | 502         | Screenshot capture failed               |
| `SCRAPE_TIMEOUT`     | 504         | Request timed out                       |
| `INTERNAL_ERROR`     | 500         | Unexpected server error                 |

### Standard Error Response

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string; // Machine-readable error code
    message: string; // Human-readable message
    request_id: string; // For debugging/support
    details?: {
      // Optional additional context
      errors?: Array<{
        path: string[];
        message: string;
      }>;
      [key: string]: unknown;
    };
  };
}
```

---

## Document Cross-References

- API implementation: [BACKEND.md](./BACKEND.md)
- Frontend implementation: [FRONTEND.md](./FRONTEND.md)
- Architecture overview: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Deployment setup: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

_Routing Version 1.0.0 - Created 2025-12-25_
