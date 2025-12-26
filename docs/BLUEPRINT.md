# BLUEPRINT.md - Master Implementation Plan

**Project**: Scraper API MVP
**Timeline**: 7 Days (Hybrid Approach)
**Budget**: $5-15/month
**Version**: 1.0.0

---

## 1. Project Overview

### Mission Statement

Build a production-ready web scraping API that enables developers to extract data from any website with a simple HTTP request. Support both light scraping (static HTML) and heavy scraping (JavaScript-rendered content).

### Core Value Proposition

- **Simple**: Single API endpoint, instant results
- **Affordable**: $5/month for 100 requests/day
- **Reliable**: Built on Cloudflare's edge network
- **Secure**: SSRF protection, hashed API keys, atomic operations

### Target Users

1. **Indie developers** building side projects needing web data
2. **Data analysts** extracting structured information
3. **Automation engineers** integrating scraping into workflows
4. **Small agencies** offering data services to clients

---

## 2. Technology Stack

### Production Stack (Locked Versions)

| Layer              | Technology                   | Version | Purpose                  |
| ------------------ | ---------------------------- | ------- | ------------------------ |
| **Frontend**       | Next.js                      | 14.2.x  | Dashboard & landing page |
| **UI Framework**   | React                        | 18.3.x  | Component library        |
| **Styling**        | Tailwind CSS                 | 3.4.x   | Utility-first CSS        |
| **Auth**           | Auth.js                      | 5.0.x   | GitHub OAuth on edge     |
| **API Runtime**    | Cloudflare Workers           | latest  | Edge compute             |
| **Database**       | Cloudflare D1                | beta    | SQLite at edge           |
| **Browser**        | Cloudflare Browser Rendering | latest  | Puppeteer on edge        |
| **Light Scraping** | Cheerio                      | 1.0.x   | HTML parsing             |
| **Deployment**     | Cloudflare Pages             | latest  | Frontend hosting         |
| **CI/CD**          | GitHub Actions               | latest  | Automated deployment     |

### Package.json (Root Monorepo)

```json
{
  "name": "scraper-api",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "deploy": "turbo run deploy",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "turbo": "^2.0.0",
    "typescript": "^5.3.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

---

## 3. Directory Structure

```
scraper-api/
├── apps/
│   ├── web/                          # Next.js Dashboard
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── layout.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── playground/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── settings/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── layout.tsx
│   │   │   ├── (marketing)/
│   │   │   │   ├── page.tsx          # Landing page
│   │   │   │   ├── pricing/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── docs/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── layout.tsx
│   │   │   ├── api/
│   │   │   │   └── auth/
│   │   │   │       └── [...nextauth]/
│   │   │   │           └── route.ts
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── ui/                   # Base components
│   │   │   ├── dashboard/            # Dashboard components
│   │   │   ├── playground/           # Playground components
│   │   │   └── marketing/            # Landing page components
│   │   ├── lib/
│   │   │   ├── auth.ts
│   │   │   ├── api-client.ts
│   │   │   └── utils.ts
│   │   ├── next.config.mjs
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── api/                          # Cloudflare Worker
│       ├── src/
│       │   ├── index.ts              # Entry point
│       │   ├── router.ts             # Request routing
│       │   ├── handlers/
│       │   │   ├── scrape.ts
│       │   │   ├── screenshot.ts
│       │   │   └── health.ts
│       │   ├── middleware/
│       │   │   ├── auth.ts
│       │   │   ├── rate-limit.ts
│       │   │   └── cors.ts
│       │   ├── services/
│       │   │   ├── scraper-light.ts
│       │   │   ├── scraper-heavy.ts
│       │   │   └── quota.ts
│       │   ├── utils/
│       │   │   ├── ssrf.ts
│       │   │   ├── hash.ts
│       │   │   └── response.ts
│       │   └── types.ts
│       ├── wrangler.toml
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── shared/                       # Shared types & utils
│   │   ├── src/
│   │   │   ├── types.ts
│   │   │   ├── constants.ts
│   │   │   └── validators.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── db/                           # Database schema & migrations
│       ├── schema.sql
│       ├── seed.sql
│       ├── migrations/
│       │   └── 001_initial.sql
│       └── package.json
│
├── .github/
│   └── workflows/
│       ├── deploy-api.yml
│       └── deploy-web.yml
│
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

---

## 4. Environment Setup

### Prerequisites

```bash
# Required software
node --version      # >= 20.0.0
pnpm --version      # >= 8.0.0
wrangler --version  # >= 3.0.0
```

### Initial Setup Commands

```bash
# Clone and install
git clone https://github.com/your-org/scraper-api.git
cd scraper-api
pnpm install

# Cloudflare authentication
wrangler login

# Create D1 database
wrangler d1 create scraper-api-db
# Copy the database_id to wrangler.toml

# Apply schema
wrangler d1 execute scraper-api-db --file=packages/db/schema.sql

# Create secrets
wrangler secret put AUTH_SECRET
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET

# Local development
pnpm dev
```

### Environment Variables

**apps/web/.env.local**

```env
# Auth.js
AUTH_SECRET=generate-32-char-random-string
AUTH_URL=http://localhost:3000

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8787
```

**apps/api/.dev.vars**

```env
# Auth
AUTH_SECRET=same-as-web

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

---

## 5. Seven-Day Sprint Breakdown

### Day 1: Security Foundation (8 hours)

| Hour | Task                                     | Deliverable                       |
| ---- | ---------------------------------------- | --------------------------------- |
| 1-2  | Set up Cloudflare account + Workers Paid | Account active, billing set       |
| 3-4  | Create D1 database + deploy schema       | Database with all tables          |
| 5-6  | Implement SSRF protection module         | `ssrf.ts` with full test coverage |
| 7-8  | Implement API key SHA-256 hashing        | `hash.ts` with crypto operations  |

### Day 2: Authentication (8 hours)

| Hour | Task                                  | Deliverable                        |
| ---- | ------------------------------------- | ---------------------------------- |
| 1-3  | Auth.js integration with GitHub OAuth | `/api/auth/*` routes working       |
| 4-5  | Atomic quota SQL implementation       | `quota.ts` with race-condition fix |
| 6-7  | Request ID generation + logging       | Traceable requests                 |
| 8    | Health endpoint + basic monitoring    | `/health` returns 200              |

### Day 3: Core API (8 hours)

| Hour | Task                             | Deliverable                |
| ---- | -------------------------------- | -------------------------- |
| 1-2  | API Worker skeleton + routing    | `router.ts` with Hono      |
| 3-4  | Light scraping (fetch + cheerio) | `/api/scrape?render=false` |
| 5-6  | Auth middleware integration      | All routes protected       |
| 7-8  | Error response standardization   | Consistent JSON errors     |

### Day 4: Browser Rendering (8 hours)

| Hour | Task                       | Deliverable               |
| ---- | -------------------------- | ------------------------- |
| 1-4  | Puppeteer integration      | `/api/scrape?render=true` |
| 5-6  | Screenshot endpoint        | `/api/screenshot`         |
| 7-8  | Timeout strategy (30s max) | Graceful failure handling |

### Day 5: Dashboard (8 hours)

| Hour | Task                             | Deliverable                 |
| ---- | -------------------------------- | --------------------------- |
| 1-3  | Next.js dashboard setup on Pages | Service binding working     |
| 4-5  | API key display + generation     | User can create/revoke keys |
| 6-7  | Usage statistics display         | Quota visualization         |
| 8    | Playground (minimal)             | Test API from browser       |

### Day 6: Integration & Testing (8 hours)

| Hour | Task                       | Deliverable          |
| ---- | -------------------------- | -------------------- |
| 1-2  | Landing page completion    | Marketing content    |
| 3-4  | End-to-end manual testing  | All flows verified   |
| 5-6  | GitHub Actions CI/CD setup | Automated deployment |
| 7-8  | Bug fixes + buffer         | Blockers resolved    |

### Day 7: Launch (8 hours)

| Hour | Task                     | Deliverable           |
| ---- | ------------------------ | --------------------- |
| 1-2  | Production deployment    | Live on custom domain |
| 3-4  | Smoke test all endpoints | Everything works      |
| 5-6  | Invite 5-10 beta users   | Real usage begins     |
| 7-8  | Monitor first requests   | Watch for issues      |

---

## 6. Success Metrics & KPIs

### Launch Criteria (Day 7)

| Metric                       | Target          | Measurement          |
| ---------------------------- | --------------- | -------------------- |
| **Uptime**                   | 99%             | Cloudflare dashboard |
| **API Latency (light)**      | < 500ms p95     | Request logs         |
| **API Latency (heavy)**      | < 5s p95        | Request logs         |
| **Error Rate**               | < 1%            | Error logs           |
| **Security Vulnerabilities** | 0 CRITICAL/HIGH | Manual audit         |

### Week 1 Post-Launch

| Metric             | Target       | Measurement   |
| ------------------ | ------------ | ------------- |
| **Beta Users**     | 5-10         | User signups  |
| **API Requests**   | 100+         | D1 logs       |
| **User Retention** | 50%          | Return visits |
| **Bug Reports**    | < 5 critical | User feedback |

### Month 1

| Metric                   | Target                 | Measurement        |
| ------------------------ | ---------------------- | ------------------ |
| **Registered Users**     | 50-100                 | Database count     |
| **Monthly Active Users** | 20+                    | API activity       |
| **Revenue**              | $0 (focus on feedback) | N/A                |
| **Monthly Cost**         | < $15                  | Cloudflare billing |

---

## 7. Risk Mitigation

### Technical Risks

| Risk                             | Probability | Impact   | Mitigation                         |
| -------------------------------- | ----------- | -------- | ---------------------------------- |
| **Puppeteer cold starts (3-8s)** | High        | Medium   | Pre-warm with cron, cache sessions |
| **D1 beta breaking changes**     | Medium      | High     | Pin versions, monitor changelogs   |
| **2-session Puppeteer limit**    | Medium      | Medium   | Queue system, rate limiting        |
| **SSRF bypass**                  | Low         | Critical | Defense in depth, regular audits   |

### Business Risks

| Risk                       | Probability | Impact | Mitigation                      |
| -------------------------- | ----------- | ------ | ------------------------------- |
| **No users sign up**       | Medium      | High   | Content marketing, Product Hunt |
| **Abuse/scraping attacks** | Medium      | Medium | Rate limiting, IP blocking      |
| **Cost overrun**           | Low         | Medium | Usage monitoring, alerts at $10 |

### Operational Risks

| Risk                          | Probability | Impact | Mitigation                         |
| ----------------------------- | ----------- | ------ | ---------------------------------- |
| **GitHub Actions flaky**      | Medium      | Low    | Manual deploy fallback             |
| **Debug without logs**        | High        | Medium | Implement D1 logging               |
| **Solo developer bus factor** | High        | High   | Documentation, simple architecture |

---

## 8. Definition of Done

### Feature Complete

- [ ] User can sign up with GitHub OAuth
- [ ] User can generate/revoke API keys
- [ ] User can view usage statistics
- [ ] User can test API in playground
- [ ] API returns HTML/text content
- [ ] API returns screenshots
- [ ] API enforces quota limits
- [ ] All errors return structured JSON

### Quality Complete

- [ ] All CRITICAL/HIGH security issues fixed
- [ ] < 1% error rate in testing
- [ ] All endpoints have response < 5s
- [ ] Mobile-responsive dashboard
- [ ] Loading states for all async operations

### Deployment Complete

- [ ] GitHub Actions deploys on push
- [ ] Custom domain configured
- [ ] SSL/TLS active
- [ ] Environment variables secure
- [ ] Rollback procedure documented

---

## 9. Post-Launch Priorities (Week 2+)

### Immediate (Days 8-10)

1. Fix user-reported bugs
2. Improve error messages based on confusion
3. Add missing edge cases

### Short-term (Week 2-3)

1. JSON extraction feature
2. PDF export
3. Webhook callbacks

### Medium-term (Month 2)

1. Paid tier implementation
2. Additional auth providers
3. Team accounts

---

## Document References

| Document                             | Purpose                  | Status   |
| ------------------------------------ | ------------------------ | -------- |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design            | Required |
| [BACKEND.md](./BACKEND.md)           | API implementation       | Required |
| [FRONTEND.md](./FRONTEND.md)         | Dashboard implementation | Required |
| [COMPONENTS.md](./COMPONENTS.md)     | UI components            | Required |
| [DATABASE.md](./DATABASE.md)         | Schema design            | Required |
| [ROUTING.md](./ROUTING.md)           | API routes               | Required |
| [DEPLOYMENT.md](./DEPLOYMENT.md)     | CI/CD setup              | Required |
| [ROADMAP.md](./ROADMAP.md)           | Daily tasks              | Required |
| [SEO-CONTENT.md](./SEO-CONTENT.md)   | Marketing content        | Required |

---

_Blueprint Version 1.0.0 - Created 2025-12-25_
_Timeline: 7 Days | Budget: $5-15/month | Confidence: 8/10_
