# Council Verdict: MVP Scraper API (Next.js + Cloudflare Workers + D1)

**Date**: 2025-12-25
**Topic**: Architecture review for $5/month scraper API MVP
**Council**: Tech (Codex), System (Gemini), Ops (BigModel)

---

## Matchup Summary

| Advisor    | Verdict                    | Key Argument                                                                                                                                                         |
| ---------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tech**   | CONDITIONAL APPROVAL       | 7/10 complexity. Critical security vulnerabilities (SSRF, race conditions, plain-text API keys) must be fixed. Code patterns need atomic queries and error handling. |
| **System** | PROCEED WITH MODIFICATIONS | 7/10 confidence. Viable for MVP but scalability walls at ~1,500 users (D1 writes) and ~200 req/min (Puppeteer). Use Auth.js instead of NextAuth.                     |
| **Ops**    | CONDITIONAL APPROVAL       | $5/month honest for MVP, budget $15. 4-day timeline optimistic (7-10 realistic). China network issues add 20-30% overhead.                                           |

---

## Consensus Points (All 3 Agree)

1. **Architecture is viable for MVP** - All advisors approve with conditions
2. **Puppeteer on Workers is the biggest risk** - 2 concurrent session limit, different API from Node.js, 3-8s cold starts
3. **Race condition in lazy quota reset** - Must use atomic UPDATE with RETURNING clause
4. **4-day timeline is unrealistic** - Consensus: 7-10 days for experienced developer
5. **D1 is sufficient for MVP** - Free tier covers 100-1000 users easily
6. **NextAuth has edge runtime issues** - Recommend Auth.js (@auth/core) instead

---

## Key Conflicts

### 1. External Browser Service vs Cloudflare Puppeteer

| Advisor    | Position                                   |
| ---------- | ------------------------------------------ |
| **Tech**   | Consider Browserless.io for heavy tasks    |
| **System** | Keep Cloudflare, add Durable Objects queue |
| **Ops**    | Start with Cloudflare, have fallback ready |

**Resolution**: Start with Cloudflare Browser Rendering. If you hit the 2-session limit frequently, evaluate external services at that point.

### 2. Alternative Stack

| Advisor    | Position                                      |
| ---------- | --------------------------------------------- |
| **Tech**   | N/A (focused on fixing current proposal)      |
| **System** | N/A (focused on scaling current proposal)     |
| **Ops**    | Vercel + Supabase has better DX for $20/month |

**Resolution**: Proceed with Cloudflare if already invested in ecosystem. Consider Vercel + Supabase if DX matters more than edge performance.

### 3. Rate Limiting Storage

| Advisor    | Position                                |
| ---------- | --------------------------------------- |
| **Tech**   | Use KV for counters (sub-ms reads)      |
| **System** | Migrate to Durable Objects at 500 users |
| **Ops**    | D1 is fine for MVP                      |

**Resolution**: Start with atomic D1 queries. Monitor latency. Plan KV/DO migration if p99 > 200ms.

---

## Reality Check

### Hidden Costs Identified

| Item               | Source | Impact                                           |
| ------------------ | ------ | ------------------------------------------------ |
| Browser Rendering  | Ops    | $0.02/1000 screenshots - scales with heavy usage |
| Developer Time     | All    | 7-10 days vs 4 days planned                      |
| China Network      | Ops    | +20-30% time overhead, need GitHub Actions       |
| No Persistent Logs | Ops    | Debugging production issues is painful           |

### Security Gaps Identified

| Issue                       | Severity | Fix Effort |
| --------------------------- | -------- | ---------- |
| **SSRF via user URLs**      | CRITICAL | 2 hours    |
| **Race condition in quota** | HIGH     | 1 hour     |
| **Plain-text API keys**     | HIGH     | 2 hours    |
| **Missing error handling**  | MEDIUM   | 4 hours    |

### Ops Burden Identified

| Concern        | Impact                    | Mitigation                    |
| -------------- | ------------------------- | ----------------------------- |
| Ephemeral logs | Can't debug user reports  | Log to D1 or Logflare         |
| No alerting    | Hit limits unexpectedly   | Weekly manual checks          |
| D1 beta status | Breaking changes possible | Pin versions, read changelogs |

---

## Decision Matrix

| Criteria        | Weight | Tech | System | Ops  | Weighted   |
| --------------- | ------ | ---- | ------ | ---- | ---------- |
| Performance     | 20%    | 6/10 | 7/10   | 7/10 | 6.6        |
| Scalability     | 20%    | 5/10 | 6/10   | 7/10 | 6.0        |
| Cost            | 20%    | 8/10 | 8/10   | 9/10 | 8.3        |
| Maintainability | 20%    | 5/10 | 6/10   | 5/10 | 5.3        |
| Time-to-market  | 20%    | 5/10 | 6/10   | 5/10 | 5.3        |
| **Total**       | 100%   |      |        |      | **6.3/10** |

---

## Final Verdict

### Winner: PROCEED WITH MODIFICATIONS

**Confidence**: Medium-High (7/10)

**Conditions for Success**:

1. Fix all CRITICAL/HIGH security issues before launch
2. Accept 7-10 day timeline (not 4 days)
3. Use Auth.js instead of NextAuth
4. Implement atomic quota queries from day one
5. Limit heavy tasks (screenshots) to < 30% of requests

### When This Is The Right Choice

- Solo developer or small team with Next.js experience
- Budget-conscious MVP (< $20/month)
- < 1,000 users expected in first 3 months
- Global edge performance matters
- Already using Cloudflare for DNS/CDN

### When To Choose Alternatives

- First time with both Next.js AND Cloudflare (use Vercel + Supabase)
- Need enterprise logging/compliance (use traditional backend)
- High screenshot volume expected (> 5,000/day) (use dedicated browser service)
- Hard 4-day deadline (don't start this project)

---

## Action Plan

### Phase 1: Foundation (Days 1-3)

- [ ] Set up Cloudflare Workers Paid ($5)
- [ ] Create D1 database with proper schema (use System advisor's recommended schema)
- [ ] Implement Auth.js with GitHub OAuth
- [ ] Create atomic quota checking SQL (not lazy reset)
- [ ] Implement SSRF protection for URLs
- [ ] Hash API keys before storing

### Phase 2: Core API (Days 4-6)

- [ ] Build API Worker with light/heavy branching
- [ ] Implement fetch+cheerio for light tasks
- [ ] Integrate Cloudflare Browser Rendering for heavy tasks
- [ ] Add proper error handling with request IDs
- [ ] Add timeout/retry strategy for Puppeteer

### Phase 3: Dashboard (Days 7-8)

- [ ] Build Next.js dashboard on Cloudflare Pages
- [ ] Implement service binding to API Worker
- [ ] Create API key display and usage dashboard
- [ ] Add Playground for testing

### Phase 4: Hardening (Days 9-10)

- [ ] End-to-end testing
- [ ] Set up basic monitoring (manual checks)
- [ ] Create backup strategy for D1
- [ ] Deploy via GitHub Actions (not local wrangler)

---

## Critical Code Patterns (Mandatory)

### 1. Atomic Quota Check (from Tech/System)

```sql
UPDATE users
SET
  quota_count = CASE
    WHEN date(quota_reset_at/1000, 'unixepoch') < date('now') THEN 1
    ELSE quota_count + 1
  END,
  quota_reset_at = CASE
    WHEN date(quota_reset_at/1000, 'unixepoch') < date('now') THEN strftime('%s', 'now') * 1000
    ELSE quota_reset_at
  END
WHERE api_key_hash = ? AND quota_count < 100
RETURNING quota_count;
```

### 2. SSRF Protection (from Tech)

```typescript
const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "169.254.169.254"]);
const isPrivateIP = (ip) =>
  /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(ip);

function validateUrl(input: string): boolean {
  const url = new URL(input);
  if (!["http:", "https:"].includes(url.protocol)) return false;
  if (BLOCKED_HOSTS.has(url.hostname)) return false;
  if (isPrivateIP(url.hostname)) return false;
  return true;
}
```

### 3. API Key Hashing (from Tech)

```typescript
async function hashApiKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}
```

---

## Cost Projection

| Phase                | Users    | Monthly Cost |
| -------------------- | -------- | ------------ |
| MVP Launch           | 0-100    | $5-7         |
| Early Growth         | 100-500  | $7-15        |
| Growth               | 500-1000 | $15-25       |
| Scale (needs review) | 1000+    | $25-50+      |

---

## Next Review Trigger

Schedule architecture review when ANY of these occur:

- 500+ concurrent users
- D1 write latency p99 > 200ms
- Browser Rendering queue builds (> 10s wait)
- Monthly cost exceeds $30

---

_Verdict prepared by Claude Code Council_
_All three advisors: CONDITIONAL APPROVAL_
_Overall Confidence: 7/10_
