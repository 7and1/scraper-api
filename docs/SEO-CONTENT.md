# SEO-CONTENT.md - SEO & Content Strategy

**Project**: Scraper API MVP
**Version**: 1.0.0
**Last Updated**: 2025-12-25

---

## 1. Meta Tags Strategy

### Homepage Meta Tags

```tsx
// app/(marketing)/page.tsx

export const metadata: Metadata = {
  title:
    "Scraper API - Web Scraping Made Simple | Extract Data from Any Website",
  description:
    "Extract data from any website with a simple API call. Light and heavy scraping, JavaScript rendering, screenshots. Start free with 100 requests/day.",
  keywords: [
    "web scraping api",
    "data extraction",
    "puppeteer as a service",
    "headless browser api",
    "website scraper",
    "html parser api",
    "javascript rendering",
    "screenshot api",
    "web data api",
    "cloudflare workers scraper",
  ],
  authors: [{ name: "Scraper API" }],
  creator: "Scraper API",
  publisher: "Scraper API",

  // Open Graph
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://scraper.dev",
    siteName: "Scraper API",
    title: "Scraper API - Web Scraping Made Simple",
    description:
      "Extract data from any website with a simple API call. No infrastructure needed.",
    images: [
      {
        url: "https://scraper.dev/og-image.png",
        width: 1200,
        height: 630,
        alt: "Scraper API - Web Scraping Made Simple",
      },
    ],
  },

  // Twitter
  twitter: {
    card: "summary_large_image",
    title: "Scraper API - Web Scraping Made Simple",
    description: "Extract data from any website with a simple API call.",
    images: ["https://scraper.dev/og-image.png"],
    creator: "@scraperapi",
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Verification
  verification: {
    google: "your-google-verification-code",
  },

  // Alternate languages (future)
  alternates: {
    canonical: "https://scraper.dev",
    languages: {
      "en-US": "https://scraper.dev",
    },
  },
};
```

### Documentation Page Meta

```tsx
// app/(marketing)/docs/page.tsx

export const metadata: Metadata = {
  title: "API Documentation | Scraper API",
  description:
    "Complete API documentation for Scraper API. Learn how to extract data, render JavaScript, take screenshots, and more.",
  openGraph: {
    title: "API Documentation | Scraper API",
    description: "Complete API documentation with examples and code snippets.",
    url: "https://scraper.dev/docs",
  },
};
```

### Pricing Page Meta

```tsx
// app/(marketing)/pricing/page.tsx

export const metadata: Metadata = {
  title: "Pricing - Free Tier & Pro Plans | Scraper API",
  description:
    "Start free with 100 requests/day. Upgrade to Pro for unlimited scraping. Simple, transparent pricing with no hidden fees.",
  openGraph: {
    title: "Pricing - Free Tier & Pro Plans | Scraper API",
    description:
      "Start free with 100 requests/day. Simple, transparent pricing.",
    url: "https://scraper.dev/pricing",
  },
};
```

---

## 2. Landing Page Copy

### Hero Section

```markdown
# Web Scraping Made Simple

Extract data from any website with a single API call.
No infrastructure to manage, no browsers to configure.
Just send a request and get your data.

[Start Free] [View Documentation]
```

### Value Propositions

```markdown
## Why Scraper API?

### Lightning Fast

Edge-powered infrastructure delivers results in milliseconds.
Our global network ensures low latency from anywhere in the world.

### Secure by Default

SSRF protection, encrypted API keys, and automatic rate limiting.
Your security is our priority.

### JavaScript Rendering

Full browser rendering for dynamic content.
Extract data from React, Vue, Angular, and any SPA.

### Developer Friendly

Clean REST API with comprehensive documentation.
Copy-paste examples for every language.
```

### How It Works

```markdown
## How It Works

### 1. Get Your API Key

Sign up with GitHub and get your API key instantly.
No credit card required.

### 2. Make a Request

Send a POST request with the URL you want to scrape.
Choose light mode for static pages or heavy for JavaScript.

### 3. Get Your Data

Receive clean HTML, extracted content, or screenshots.
Parse and use the data however you need.
```

### Code Example Section

````markdown
## One Request. Instant Results.

Get started in seconds with our simple REST API.

```bash
curl -X POST https://api.scraper.dev/v1/scrape \
  -H "X-API-Key: sk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "render": false}'
```
````

Response:

```json
{
  "success": true,
  "data": {
    "content": "<html>...</html>",
    "title": "Example Domain",
    "url": "https://example.com"
  }
}
```

````

### Features Grid

```markdown
## Everything You Need

| Feature | Description |
|---------|-------------|
| Light Scraping | Fast HTML extraction without browser rendering |
| Heavy Scraping | Full JavaScript rendering with Puppeteer |
| Screenshots | Capture full-page or viewport screenshots |
| CSS Selectors | Extract specific elements from pages |
| Custom Headers | Set user-agent, cookies, and more |
| Automatic Retries | Built-in retry logic for reliability |
| Global Edge | Deployed worldwide for low latency |
| No Rate Limits* | 100 req/day free, unlimited on Pro |
````

### Social Proof Section

```markdown
## Trusted by Developers

> "Scraper API saved us weeks of infrastructure work.
> We just send requests and get data back."
>
> - Alex Chen, CTO at DataFlow

> "The JavaScript rendering is incredibly reliable.
> Finally an API that handles SPAs properly."
>
> - Sarah Kim, Lead Developer at InfoExtract

> "Simple pricing, great docs, fast support.
> Exactly what a developer tool should be."
>
> - Mike Johnson, Founder at ScrapeTools
```

### Pricing Section

```markdown
## Simple, Transparent Pricing

### Free Tier

**$0**/month

- 100 requests/day
- Light & heavy scraping
- Screenshot support
- Community support
- Perfect for side projects

[Get Started Free]

### Pro (Coming Soon)

**$29**/month

- Unlimited requests
- Priority rendering
- Dedicated support
- Webhook callbacks
- Team accounts

[Join Waitlist]

### Enterprise

**Custom**

- Volume discounts
- SLA guarantees
- Custom integrations
- Dedicated account manager

[Contact Sales]
```

### FAQ Section

```markdown
## Frequently Asked Questions

### What is the difference between light and heavy scraping?

Light scraping uses fast HTTP requests for static HTML pages.
Heavy scraping uses a full browser to render JavaScript content.
Use light for static sites, heavy for SPAs and dynamic content.

### Do you handle JavaScript-rendered content?

Yes! Set `render: true` in your request to enable full browser rendering.
We use Puppeteer on Cloudflare's edge network for fast, reliable rendering.

### What are the rate limits?

Free tier: 100 requests per day, resetting at midnight UTC.
Pro tier: No daily limits, fair use policy applies.

### Can I scrape any website?

You can scrape any publicly accessible website.
We block requests to private IP ranges and localhost for security.
Respect robots.txt and terms of service of target sites.

### How do I get support?

Free tier: Community Discord and GitHub issues.
Pro tier: Priority email support with 24h response time.
Enterprise: Dedicated account manager.
```

### CTA Footer

```markdown
## Ready to Start Scraping?

Get your free API key in 30 seconds.
No credit card required.

[Start Free with GitHub]

Questions? Check our [documentation](/docs) or join our [Discord](https://discord.gg/scraperapi).
```

---

## 3. API Documentation Content

### Getting Started

````markdown
# Getting Started

## Authentication

All API requests require an API key. Include it in the `X-API-Key` header:

```bash
curl -H "X-API-Key: sk_your_api_key" https://api.scraper.dev/health
```
````

## Quick Start

### 1. Get Your API Key

Sign up at [scraper.dev](https://scraper.dev) and create an API key in the dashboard.

### 2. Make Your First Request

```bash
curl -X POST https://api.scraper.dev/v1/scrape \
  -H "X-API-Key: sk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### 3. Parse the Response

```json
{
  "success": true,
  "data": {
    "content": "<!DOCTYPE html>...",
    "title": "Example Domain",
    "url": "https://example.com/",
    "timestamp": "2025-01-01T00:00:00.000Z"
  },
  "meta": {
    "request_id": "req_abc123",
    "duration_ms": 245,
    "render_mode": "light"
  }
}
```

## SDK Examples

### JavaScript/Node.js

```javascript
const response = await fetch("https://api.scraper.dev/v1/scrape", {
  method: "POST",
  headers: {
    "X-API-Key": "sk_your_api_key",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    url: "https://example.com",
    render: false,
  }),
});

const data = await response.json();
console.log(data.data.title);
```

### Python

```python
import requests

response = requests.post(
    'https://api.scraper.dev/v1/scrape',
    headers={
        'X-API-Key': 'sk_your_api_key',
        'Content-Type': 'application/json',
    },
    json={
        'url': 'https://example.com',
        'render': False,
    }
)

data = response.json()
print(data['data']['title'])
```

### Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "net/http"
)

func main() {
    payload := map[string]interface{}{
        "url": "https://example.com",
        "render": false,
    }

    body, _ := json.Marshal(payload)

    req, _ := http.NewRequest("POST", "https://api.scraper.dev/v1/scrape", bytes.NewBuffer(body))
    req.Header.Set("X-API-Key", "sk_your_api_key")
    req.Header.Set("Content-Type", "application/json")

    client := &http.Client{}
    resp, _ := client.Do(req)
    defer resp.Body.Close()
}
```

````

### API Reference

```markdown
# API Reference

## Endpoints

### POST /api/v1/scrape

Scrape content from a webpage.

**Request Body**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| url | string | Yes | - | URL to scrape |
| render | boolean | No | false | Enable JavaScript rendering |
| selector | string | No | - | CSS selector to extract |
| wait_for | string | No | - | Wait for selector (render only) |
| timeout | number | No | 30000 | Timeout in milliseconds |

**Response**

```json
{
  "success": true,
  "data": {
    "content": "string",
    "title": "string",
    "url": "string",
    "timestamp": "string"
  },
  "meta": {
    "request_id": "string",
    "duration_ms": "number",
    "render_mode": "light | heavy"
  }
}
````

### POST /api/v1/screenshot

Capture a screenshot of a webpage.

**Request Body**

| Parameter | Type    | Required | Default | Description                  |
| --------- | ------- | -------- | ------- | ---------------------------- |
| url       | string  | Yes      | -       | URL to screenshot            |
| width     | number  | No       | 1280    | Viewport width               |
| height    | number  | No       | 720     | Viewport height              |
| full_page | boolean | No       | false   | Capture full page            |
| format    | string  | No       | png     | Image format (png/jpeg/webp) |

**Response**

Binary image data with appropriate Content-Type header.

## Error Codes

| Code            | HTTP Status | Description              |
| --------------- | ----------- | ------------------------ |
| INVALID_REQUEST | 400         | Validation failed        |
| SSRF_BLOCKED    | 400         | URL blocked for security |
| UNAUTHORIZED    | 401         | Invalid API key          |
| QUOTA_EXCEEDED  | 429         | Daily limit reached      |
| SCRAPE_FAILED   | 502         | Target site error        |
| SCRAPE_TIMEOUT  | 504         | Request timed out        |

````

---

## 4. Blog Post Ideas

### Technical Posts

1. **"How We Built a Serverless Scraping API on Cloudflare Workers"**
   - Architecture decisions
   - D1 database usage
   - Puppeteer on the edge
   - Performance optimizations

2. **"SSRF Protection in Web Scraping APIs: A Complete Guide"**
   - What is SSRF?
   - How we prevent it
   - Defense in depth strategies
   - Code examples

3. **"Light vs Heavy Scraping: When to Use Each"**
   - Static vs dynamic content
   - Performance comparisons
   - Cost considerations
   - Decision flowchart

4. **"Handling JavaScript-Rendered Content in 2025"**
   - SPA challenges
   - Wait strategies
   - Selector best practices
   - Common pitfalls

### Use Case Posts

5. **"Building a Price Monitoring Tool with Scraper API"**
   - Step-by-step tutorial
   - Scheduling with cron
   - Storing historical data
   - Alerting on changes

6. **"Extracting Product Data from E-commerce Sites"**
   - Selector strategies
   - Pagination handling
   - Rate limiting best practices
   - Data cleaning tips

7. **"Creating a News Aggregator with Web Scraping"**
   - RSS alternatives
   - Content extraction
   - Deduplication
   - Real-time updates

### Comparison Posts

8. **"Scraper API vs Building Your Own Scraping Infrastructure"**
   - Time investment
   - Cost comparison
   - Maintenance overhead
   - Scalability

9. **"Top 5 Web Scraping APIs Compared (2025 Edition)"**
   - Feature comparison
   - Pricing analysis
   - Use case recommendations
   - When to choose each

---

## 5. Social Proof Elements

### Testimonial Template

```typescript
interface Testimonial {
  quote: string;
  author: {
    name: string;
    title: string;
    company: string;
    avatar: string;
  };
  metrics?: {
    label: string;
    value: string;
  };
}

const testimonials: Testimonial[] = [
  {
    quote: "Scraper API reduced our data collection time from hours to minutes. The JavaScript rendering is incredibly reliable.",
    author: {
      name: "Sarah Chen",
      title: "Head of Engineering",
      company: "DataInsights Inc",
      avatar: "/testimonials/sarah.jpg"
    },
    metrics: {
      label: "Time saved",
      value: "85%"
    }
  },
  {
    quote: "We evaluated 5 different scraping solutions. Scraper API had the best developer experience and most transparent pricing.",
    author: {
      name: "Marcus Johnson",
      title: "CTO",
      company: "WebDataCo",
      avatar: "/testimonials/marcus.jpg"
    },
    metrics: {
      label: "Setup time",
      value: "< 1 hour"
    }
  }
];
````

### Trust Badges

```markdown
## Trusted By Developers Worldwide

- 1,000+ developers
- 10M+ API calls served
- 99.9% uptime
- < 500ms average latency
- 24/7 monitoring
```

### Integration Logos

```markdown
## Works With Your Stack

[Node.js] [Python] [Go] [Ruby] [PHP] [Java]

Built on Cloudflare's global edge network.
```

---

## 6. Conversion Optimization

### CTA Buttons

```tsx
// Primary CTA (above fold)
<Button size="lg" className="bg-brand-600 hover:bg-brand-700">
  Start Free
  <ArrowRight className="ml-2 h-4 w-4" />
</Button>

// Secondary CTA
<Button variant="outline" size="lg">
  View Documentation
</Button>

// Urgency CTA (pricing page)
<Button size="lg" className="bg-green-600 hover:bg-green-700">
  Get Your API Key Now
</Button>
```

### Exit Intent Popup

```markdown
# Wait! Get 50 Extra Requests

Sign up now and get 150 requests/day instead of 100.
Limited time offer for new users.

[email input]
[Get Extra Requests]

No spam, ever. Unsubscribe anytime.
```

### Progress Indicators

```tsx
// Signup flow progress
const steps = [
  { label: "Connect GitHub", complete: true },
  { label: "Create API Key", complete: false },
  { label: "Make First Request", complete: false },
];
```

### Micro-Copy Examples

```markdown
// Under email input
"We'll never share your email. Unsubscribe anytime."

// Under API key display
"Keep this safe! You won't be able to see it again."

// On free tier card
"No credit card required. Upgrade anytime."

// Error message
"Oops! That URL doesn't look right. Try https://example.com"
```

---

## 7. Structured Data (JSON-LD)

```tsx
// app/(marketing)/layout.tsx

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Scraper API",
  applicationCategory: "DeveloperApplication",
  description:
    "Web scraping API for developers. Extract data from any website.",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free tier with 100 requests/day",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "127",
  },
};

export default function Layout({ children }) {
  return (
    <html>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

## Document Cross-References

- Frontend implementation: [FRONTEND.md](./FRONTEND.md)
- Component specifications: [COMPONENTS.md](./COMPONENTS.md)
- API design: [ROUTING.md](./ROUTING.md)

---

_SEO & Content Strategy Version 1.0.0 - Created 2025-12-25_
