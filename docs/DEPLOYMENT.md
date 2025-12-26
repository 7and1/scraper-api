# DEPLOYMENT.md - Deployment Guide

**Project**: Scraper API MVP
**Version**: 1.0.0
**Last Updated**: 2025-12-25

---

## 1. Cloudflare Setup Steps

### 1.1 Prerequisites

```bash
# Install required tools
npm install -g wrangler@latest

# Verify installation
wrangler --version  # Should be 3.x or higher

# Login to Cloudflare
wrangler login
```

### 1.2 Create Cloudflare Account & Enable Paid Plan

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Create account or sign in
3. Navigate to **Workers & Pages**
4. Click **Plans** and select **Workers Paid** ($5/month)
5. Enable **Browser Rendering** add-on (required for Puppeteer)

### 1.3 Create D1 Database

```bash
# Create the database
wrangler d1 create scraper-api-db

# Output will show:
# [[d1_databases]]
# binding = "DB"
# database_name = "scraper-api-db"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# Save the database_id for wrangler.toml
```

### 1.4 Apply Database Schema

```bash
# Navigate to project root
cd /path/to/scraper-api

# Apply schema to production
wrangler d1 execute scraper-api-db --file=packages/db/schema.sql --remote

# Verify tables created
wrangler d1 execute scraper-api-db --command="SELECT name FROM sqlite_master WHERE type='table'" --remote
```

### 1.5 Create Secrets

```bash
# Generate a secure random string for AUTH_SECRET
openssl rand -base64 32

# Set secrets (you'll be prompted to enter values)
wrangler secret put AUTH_SECRET
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put INTERNAL_API_SECRET

# List secrets to verify
wrangler secret list
```

---

## 2. wrangler.toml Configuration

### API Worker Configuration

```toml
# apps/api/wrangler.toml

name = "scraper-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

# Account settings (optional, can be inferred from login)
# account_id = "your-account-id"

# Cloudflare D1 Database
[[d1_databases]]
binding = "DB"
database_name = "scraper-api-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # Replace with actual ID

# Browser Rendering (Puppeteer)
[browser]
binding = "BROWSER"

# Non-sensitive environment variables
[vars]
ENVIRONMENT = "production"
LOG_LEVEL = "info"

# Custom domain routing
# routes = [
#   { pattern = "api.scraper.dev/*", zone_name = "scraper.dev" }
# ]

# Development overrides
[env.development]
name = "scraper-api-dev"
vars = { ENVIRONMENT = "development", LOG_LEVEL = "debug" }

[[env.development.d1_databases]]
binding = "DB"
database_name = "scraper-api-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# Staging environment
[env.staging]
name = "scraper-api-staging"
vars = { ENVIRONMENT = "staging", LOG_LEVEL = "debug" }

[[env.staging.d1_databases]]
binding = "DB"
database_name = "scraper-api-db-staging"
database_id = "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"

# Build configuration
[build]
command = "npm run build"

# Minification
[build.upload]
format = "modules"
main = "./dist/index.js"

# Limits
[limits]
cpu_ms = 50000
```

### Next.js Pages Configuration

```toml
# apps/web/wrangler.toml (for Cloudflare Pages Functions)

name = "scraper-web"
compatibility_date = "2024-01-01"
pages_build_output_dir = ".vercel/output/static"

# Environment variables set via Pages dashboard
# AUTH_SECRET, GITHUB_CLIENT_ID, etc.
```

---

## 3. GitHub Actions CI/CD

### Deploy API Worker

```yaml
# .github/workflows/deploy-api.yml

name: Deploy API Worker

on:
  push:
    branches: [main]
    paths:
      - "apps/api/**"
      - "packages/shared/**"
      - "packages/db/**"
      - ".github/workflows/deploy-api.yml"
  workflow_dispatch:
    inputs:
      environment:
        description: "Deployment environment"
        required: true
        default: "production"
        type: choice
        options:
          - development
          - staging
          - production

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm --filter @scraper-api/api typecheck

      - name: Run tests
        run: pnpm --filter @scraper-api/api test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment || 'production' }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build API
        run: pnpm --filter @scraper-api/api build

      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: apps/api
          command: deploy --env ${{ github.event.inputs.environment || 'production' }}

      - name: Verify deployment
        run: |
          sleep 10
          curl -f https://api.scraper.dev/health || exit 1

      - name: Notify on success
        if: success()
        run: echo "API deployed successfully to ${{ github.event.inputs.environment || 'production' }}"

      - name: Notify on failure
        if: failure()
        run: echo "API deployment failed!"
```

### Deploy Web (Next.js)

```yaml
# .github/workflows/deploy-web.yml

name: Deploy Web

on:
  push:
    branches: [main]
    paths:
      - "apps/web/**"
      - "packages/shared/**"
      - ".github/workflows/deploy-web.yml"
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm --filter @scraper-api/web typecheck

      - name: Build
        run: pnpm --filter @scraper-api/web build
        env:
          AUTH_SECRET: ${{ secrets.AUTH_SECRET }}
          GITHUB_CLIENT_ID: ${{ secrets.GITHUB_CLIENT_ID }}
          GITHUB_CLIENT_SECRET: ${{ secrets.GITHUB_CLIENT_SECRET }}
          NEXT_PUBLIC_API_URL: https://api.scraper.dev

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: scraper-web
          directory: apps/web/.next
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
          branch: main
```

### Database Migration Workflow

```yaml
# .github/workflows/migrate-db.yml

name: Database Migration

on:
  push:
    branches: [main]
    paths:
      - "packages/db/migrations/**"
  workflow_dispatch:
    inputs:
      migration_file:
        description: "Migration file to run (e.g., 002_add_teams.sql)"
        required: true

jobs:
  migrate:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install wrangler
        run: npm install -g wrangler

      - name: Backup database
        run: |
          wrangler d1 export scraper-api-db \
            --output=backup_$(date +%Y%m%d_%H%M%S).sql \
            --remote
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

      - name: Run migration
        run: |
          if [ -n "${{ github.event.inputs.migration_file }}" ]; then
            wrangler d1 execute scraper-api-db \
              --file=packages/db/migrations/${{ github.event.inputs.migration_file }} \
              --remote
          else
            for file in packages/db/migrations/*.sql; do
              echo "Running migration: $file"
              wrangler d1 execute scraper-api-db --file="$file" --remote
            done
          fi
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

      - name: Verify migration
        run: |
          wrangler d1 execute scraper-api-db \
            --command="SELECT name FROM sqlite_master WHERE type='table'" \
            --remote
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

---

## 4. Environment Variables

### Production Environment

```bash
# Set in Cloudflare Dashboard or via wrangler secret

# API Worker Secrets
AUTH_SECRET=                    # 32+ char random string
GITHUB_CLIENT_ID=               # GitHub OAuth App ID
GITHUB_CLIENT_SECRET=           # GitHub OAuth App Secret
INTERNAL_API_SECRET=            # For internal service communication

# Pages Environment Variables (set in Pages dashboard)
NEXT_PUBLIC_API_URL=https://api.scraper.dev
AUTH_URL=https://scraper.dev
```

### GitHub Secrets Setup

```bash
# Required secrets in GitHub repository settings

CLOUDFLARE_API_TOKEN           # Create at: https://dash.cloudflare.com/profile/api-tokens
CLOUDFLARE_ACCOUNT_ID          # Found in Cloudflare dashboard sidebar
AUTH_SECRET                    # Same as production
GITHUB_CLIENT_ID               # For OAuth
GITHUB_CLIENT_SECRET           # For OAuth
```

### Creating Cloudflare API Token

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Use **Custom token** with these permissions:
   - Account > Workers Scripts > Edit
   - Account > Workers KV Storage > Edit
   - Account > D1 > Edit
   - Account > Cloudflare Pages > Edit
   - Zone > DNS > Edit (if using custom domain)
4. Save the token securely

---

## 5. Domain Configuration

### Custom Domain Setup

```bash
# 1. Add domain to Cloudflare (if not already)
# Via Cloudflare Dashboard: Add Site

# 2. Create DNS records

# API subdomain (Worker)
Type: CNAME
Name: api
Content: scraper-api.your-subdomain.workers.dev

# Web (Pages)
Type: CNAME
Name: @
Content: scraper-web.pages.dev

Type: CNAME
Name: www
Content: scraper-web.pages.dev
```

### Worker Route Configuration

```toml
# In wrangler.toml

# Option 1: Using routes
routes = [
  { pattern = "api.scraper.dev/*", zone_name = "scraper.dev" }
]

# Option 2: Using custom_domain (simpler)
# workers_dev = false
# route = { pattern = "api.scraper.dev/*", zone_name = "scraper.dev" }
```

### Configure in Dashboard

1. Go to **Workers & Pages** > Your Worker
2. Click **Settings** > **Triggers**
3. Add **Custom Domain**: `api.scraper.dev`
4. Cloudflare automatically configures DNS and SSL

---

## 6. SSL/TLS Setup

### Automatic SSL (Default)

Cloudflare provides automatic SSL for all Workers and Pages:

- **Edge Certificates**: Automatically provisioned and renewed
- **Origin Certificates**: Optional for origin server validation
- **TLS Version**: Minimum TLS 1.2 (configure in dashboard)

### Security Headers

```typescript
// Already configured in Worker (apps/api/src/middleware/headers.ts)

export function securityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);

  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-XSS-Protection", "1; mode=block");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (process.env.ENVIRONMENT === "production") {
    headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}
```

---

## 7. Rollback Procedures

### Worker Rollback

```bash
# List recent deployments
wrangler deployments list

# Rollback to previous version
wrangler rollback

# Rollback to specific version
wrangler rollback --version=abc123def456
```

### Via GitHub Actions

```yaml
# Manual rollback workflow
# .github/workflows/rollback.yml

name: Rollback Deployment

on:
  workflow_dispatch:
    inputs:
      component:
        description: "Component to rollback"
        required: true
        type: choice
        options:
          - api
          - web
      version:
        description: "Version/commit to rollback to"
        required: true

jobs:
  rollback-api:
    if: github.event.inputs.component == 'api'
    runs-on: ubuntu-latest
    steps:
      - name: Rollback Worker
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: rollback --version=${{ github.event.inputs.version }}
          workingDirectory: apps/api

  rollback-web:
    if: github.event.inputs.component == 'web'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.inputs.version }}

      # Rebuild and redeploy from that commit
      - name: Install and build
        run: |
          pnpm install
          pnpm --filter @scraper-api/web build

      - name: Deploy
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: scraper-web
          directory: apps/web/.next
```

### Database Rollback

```bash
# Restore from backup
wrangler d1 execute scraper-api-db --file=backup_YYYYMMDD_HHMMSS.sql --remote

# Or restore specific tables
wrangler d1 execute scraper-api-db --command="
  -- Drop and recreate from backup
  DROP TABLE IF EXISTS users_backup;
  ALTER TABLE users RENAME TO users_backup;
  -- Then restore from SQL file
" --remote
```

---

## 8. Monitoring & Observability

### Cloudflare Analytics

Access via Cloudflare Dashboard:

- **Workers Analytics**: Request count, CPU time, errors
- **D1 Metrics**: Read/write operations, latency
- **Pages Analytics**: Visitor metrics

### Health Check Monitoring

```bash
# Simple health check script (cron or external monitor)
#!/bin/bash

API_URL="https://api.scraper.dev/health"
ALERT_WEBHOOK="https://hooks.slack.com/your-webhook"

response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL")

if [ "$response" != "200" ]; then
  curl -X POST "$ALERT_WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"API health check failed! Status: $response\"}"
fi
```

### Error Tracking (Optional)

```typescript
// Integration with Sentry (if needed)
// apps/api/src/middleware/error-handler.ts

import * as Sentry from "@sentry/cloudflare";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.ENVIRONMENT,
});

export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    Sentry.captureException(error);
    // ... rest of error handling
  }
}
```

---

## 9. Pre-Deployment Checklist

### Before First Deploy

- [ ] Cloudflare Workers Paid plan activated
- [ ] D1 database created and schema applied
- [ ] All secrets configured via `wrangler secret`
- [ ] GitHub OAuth app created with correct callback URLs
- [ ] Custom domain configured (if using)
- [ ] GitHub Actions secrets set

### Before Each Deploy

- [ ] All tests passing locally
- [ ] Type checking passes
- [ ] No hardcoded secrets in code
- [ ] Database migrations applied if needed
- [ ] Rollback plan ready

### After Deploy

- [ ] Health check returns 200
- [ ] Authentication flow works
- [ ] API endpoints respond correctly
- [ ] Rate limiting functioning
- [ ] Error logging working
- [ ] Metrics appearing in dashboard

---

## 10. Troubleshooting

### Common Issues

**Issue: Worker not receiving requests**

```bash
# Check deployment status
wrangler deployments list

# Verify routes
wrangler tail  # Live logs
```

**Issue: D1 connection errors**

```bash
# Verify database binding
wrangler d1 list
wrangler d1 execute scraper-api-db --command="SELECT 1" --remote
```

**Issue: OAuth callback fails**

```
# Verify callback URL in GitHub OAuth settings matches:
https://scraper.dev/api/auth/callback/github

# Check AUTH_URL environment variable
```

**Issue: CORS errors**

```bash
# Verify origin is in allowed list
# Check browser console for specific error
# Ensure credentials: true if sending cookies
```

---

## Document Cross-References

- Architecture overview: [ARCHITECTURE.md](./ARCHITECTURE.md)
- API implementation: [BACKEND.md](./BACKEND.md)
- Routing configuration: [ROUTING.md](./ROUTING.md)
- Development roadmap: [ROADMAP.md](./ROADMAP.md)

---

_Deployment Guide Version 1.0.0 - Created 2025-12-25_
