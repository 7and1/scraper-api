# Scraper API

A production-ready web scraping API built with Cloudflare Workers, D1 Database, Puppeteer, and Next.js 14.

## Features

- **Lightweight Scraping**: Fast HTML-only scraping using Cheerio
- **Heavyweight Scraping**: JavaScript rendering using Cloudflare Browser Rendering
- **Screenshots**: Capture viewports or full pages in PNG, JPEG, or WebP formats
- **SSRF Protection**: Comprehensive security controls to prevent server-side request forgery
- **Rate Limiting**: Built-in quota management per user
- **API Key Management**: Secure API key generation and revocation
- **Dashboard**: Beautiful Next.js dashboard for managing keys and viewing usage
- **OAuth Authentication**: GitHub OAuth via Auth.js

## Architecture

```
scraper-api/
├── apps/
│   ├── api/          # Cloudflare Worker (backend API)
│   │   ├── src/
│   │   │   ├── handlers/    # API route handlers
│   │   │   ├── middleware/  # Auth, CORS, rate limit
│   │   │   ├── services/    # Scraper, quota, user
│   │   │   ├── utils/       # SSRF, hash, response
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   └── wrangler.toml
│   └── web/          # Next.js 14 App Router (dashboard)
│       ├── app/              # Next.js app directory
│       │   ├── (auth)/       # Auth pages
│       │   ├── (dashboard)/  # Dashboard pages
│       │   ├── (marketing)/  # Landing, pricing, docs
│       │   └── api/          # BFF API routes
│       ├── components/       # React components
│       ├── hooks/            # Custom hooks
│       └── lib/              # Utilities
└── packages/
    └── db/           # Database schema
        └── schema.sql
```

## Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 10.0.0
- **Cloudflare account** with Workers and D1 enabled
- **GitHub OAuth App** (for authentication)

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd scraper-api
pnpm install
```

### 2. Set Up Cloudflare D1 Database

```bash
# Create a D1 database
wrangler d1 create scraper-api-db

# Note the database_id and update wrangler.toml
# Run the schema migration
wrangler d1 execute scraper-api-db --file=packages/db/schema.sql --local
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Edit `apps/web/.env.local` with your values:

```bash
# Auth.js / NextAuth
AUTH_SECRET=generate-a-32-character-random-string
AUTH_URL=http://localhost:3000

# GitHub OAuth App
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# API
NEXT_PUBLIC_API_URL=http://localhost:8787
API_URL=http://localhost:8787
INTERNAL_API_SECRET=dev-internal-secret-change-in-production

# Optional (SEO)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Set Up Cloudflare Secrets

```bash
# Set secrets for production
wrangler secret put AUTH_SECRET
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put INTERNAL_API_SECRET
```

### 5. Run Development Servers

```bash
# Start both API and web in parallel
pnpm dev

# Or start individually:
pnpm --filter @scraper-api/api dev    # Worker on :8787
pnpm --filter @scraper-api/web dev    # Next.js on :3000
```

### 6. Create Your Database

```bash
# Apply schema to local database
wrangler d1 execute scraper-api-db --local --file=packages/db/schema.sql

# Apply to remote production database
wrangler d1 execute scraper-api-db --remote --file=packages/db/schema.sql
```

## API Endpoints

### POST /api/v1/scrape

Extract HTML content from a URL.

**Headers:**

- `X-API-Key`: Your API key
- `Authorization`: `Bearer sk_...` (alternative)

**Body:**

```json
{
  "url": "https://example.com",
  "render": false,
  "selector": "article.content",
  "wait_for": "#dynamic-content",
  "timeout": 30000
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "content": "<html>...</html>",
    "title": "Example Domain",
    "url": "https://example.com/",
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "meta": {
    "request_id": "req_1234567890_abc123",
    "duration_ms": 1234,
    "render_mode": "light"
  }
}
```

### POST /api/v1/screenshot

Take a screenshot of a URL.

**Headers:**

- `X-API-Key`: Your API key

**Body:**

```json
{
  "url": "https://example.com",
  "width": 1280,
  "height": 720,
  "full_page": true,
  "format": "png",
  "timeout": 30000
}
```

**Response:** Binary image data

### GET /api/v1/user/usage

Get current quota usage.

**Response:**

```json
{
  "success": true,
  "data": {
    "used": 50,
    "limit": 100,
    "remaining": 50,
    "reset_at": "2024-01-02T00:00:00.000Z"
  }
}
```

## Development

### Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm --filter @scraper-api/api test:coverage

# Run specific test file
pnpm --filter @scraper-api/api test -- src/tests/unit/ssrf.test.ts
```

### Type Checking

```bash
pnpm typecheck
```

### Linting

```bash
pnpm lint
```

### Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @scraper-api/web build
```

## Deployment

### Deploy API (Cloudflare Workers)

```bash
# Deploy to production
pnpm --filter @scraper-api/api deploy

# Deploy to staging
wrangler deploy --env staging

# Deploy to development
wrangler deploy --env development
```

### Deploy Web (Cloudflare Pages)

```bash
# Build and deploy via GitHub Actions
git push origin main

# Or manually deploy
pnpm --filter @scraper-api/web build
npx wrangler pages deploy .next
```

## Security

### SSRF Protection

The API includes comprehensive SSRF protection that blocks:

- Private IP addresses (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
- Loopback addresses (127.x.x.x, localhost)
- Link-local addresses (169.254.x.x)
- Cloud metadata services (169.254.169.254)
- Dangerous ports (22, 23, 25, 53, etc.)
- Non-HTTP protocols (file://, ftp://, etc.)

### API Key Security

- Keys are hashed using SHA-256 before storage
- Keys are only shown once at creation time
- Keys can be revoked at any time
- Keys support expiration dates

### Rate Limiting

- Each user has a daily quota
- Quota resets at midnight UTC
- Quota info included in response headers:
  - `X-RateLimit-Limit`: Total quota
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Unix timestamp of reset

## Troubleshooting

### Browser Rendering Issues

If you see "BROWSER_UNAVAILABLE" errors:

1. Ensure Browser Rendering is enabled in your Cloudflare account
2. Check that the BROWSER binding is configured in wrangler.toml
3. Verify you're on a Cloudflare Workers Paid plan

### Database Connection Issues

```bash
# Check database binding
wrangler d1 list

# Verify schema applied
wrangler d1 execute scraper-api-db --command "SELECT name FROM sqlite_master WHERE type='table';" --remote
```

### Local Development Issues

```bash
# Clear cache and reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules
rm pnpm-lock.yaml
pnpm install
```

## Documentation

Project design and implementation details live in `docs/`:

- `docs/BLUEPRINT.md` - Project overview and goals
- `docs/ARCHITECTURE.md` - System architecture
- `docs/BACKEND.md` - API implementation details
- `docs/FRONTEND.md` - Dashboard implementation details
- `docs/COMPONENTS.md` - UI component catalog
- `docs/DATABASE.md` - Database schema
- `docs/SEO-CONTENT.md` - SEO and content strategy

## License

MIT
