# FRONTEND.md - Frontend Implementation

**Project**: Scraper API MVP
**Version**: 1.0.0
**Last Updated**: 2025-12-25

---

## 1. Next.js App Router Structure

```
apps/web/
├── app/
│   ├── (auth)/                     # Auth route group
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (dashboard)/                # Dashboard route group
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── playground/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   ├── api-keys/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (marketing)/                # Public pages
│   │   ├── page.tsx                # Landing page
│   │   ├── pricing/
│   │   │   └── page.tsx
│   │   ├── docs/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts
│   │
│   ├── layout.tsx                  # Root layout
│   ├── globals.css
│   ├── not-found.tsx
│   └── error.tsx
│
├── components/
│   ├── ui/                         # Base UI components
│   ├── dashboard/                  # Dashboard-specific
│   ├── playground/                 # Playground-specific
│   ├── marketing/                  # Landing page components
│   └── shared/                     # Shared components
│
├── lib/
│   ├── auth.ts                     # Auth.js configuration
│   ├── api-client.ts               # API client utilities
│   ├── utils.ts                    # Helper functions
│   └── validators.ts               # Zod schemas
│
├── hooks/
│   ├── use-api-keys.ts
│   ├── use-usage.ts
│   └── use-scrape.ts
│
├── types/
│   └── index.ts
│
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 2. Package Configuration

### package.json

```json
{
  "name": "@scraper-api/web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@auth/core": "^0.34.0",
    "next": "14.2.0",
    "next-auth": "5.0.0-beta.25",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "zod": "^3.22.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "lucide-react": "^0.400.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0"
  }
}
```

### next.config.mjs

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // For Cloudflare Pages deployment
  output: "standalone",

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },

  // Headers for security
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### tailwind.config.ts

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## 3. Auth.js Integration

### lib/auth.ts

```typescript
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import type { NextAuthConfig } from "next-auth";

const config: NextAuthConfig = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;

      // Create/update user in D1 via API
      try {
        const response = await fetch(
          `${process.env.API_URL}/internal/auth/sync`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Internal-Secret": process.env.INTERNAL_API_SECRET!,
            },
            body: JSON.stringify({
              github_id: profile?.id?.toString(),
              email: user.email,
              name: user.name,
              avatar_url: user.image,
            }),
          },
        );

        return response.ok;
      } catch (error) {
        console.error("Failed to sync user:", error);
        return false;
      }
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },

    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard =
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/playground") ||
        nextUrl.pathname.startsWith("/settings") ||
        nextUrl.pathname.startsWith("/api-keys");

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect to login
      }

      return true;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  trustHost: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
```

### app/api/auth/[...nextauth]/route.ts

```typescript
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

### middleware.ts

```typescript
export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/playground/:path*",
    "/settings/:path*",
    "/api-keys/:path*",
  ],
};
```

---

## 4. Page Components

### Root Layout (app/layout.tsx)

```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Scraper API - Web Scraping Made Simple",
    template: "%s | Scraper API",
  },
  description:
    "Extract data from any website with a simple API call. Light and heavy scraping, screenshots, and more.",
  keywords: [
    "web scraping",
    "api",
    "data extraction",
    "puppeteer",
    "cloudflare",
  ],
  authors: [{ name: "Scraper API" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://scraper.dev",
    siteName: "Scraper API",
    title: "Scraper API - Web Scraping Made Simple",
    description: "Extract data from any website with a simple API call.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Scraper API - Web Scraping Made Simple",
    description: "Extract data from any website with a simple API call.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
```

### Landing Page (app/(marketing)/page.tsx)

```tsx
import Link from "next/link";
import { ArrowRight, Zap, Shield, Globe, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/marketing/code-block";

const exampleCode = `curl -X POST https://api.scraper.dev/v1/scrape \\
  -H "X-API-Key: sk_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com", "render": false}'`;

const responseCode = `{
  "success": true,
  "data": {
    "content": "<html>...</html>",
    "title": "Example Domain",
    "url": "https://example.com",
    "timestamp": "2025-01-01T00:00:00Z"
  },
  "meta": {
    "request_id": "req_abc123",
    "duration_ms": 245,
    "render_mode": "light"
  }
}`;

export default function HomePage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Web Scraping
              <span className="text-brand-600"> Made Simple</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Extract data from any website with a single API call. No
              infrastructure to manage, no browsers to configure. Just send a
              request and get your data.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/signup">
                <Button size="lg">
                  Start Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/docs">
                <Button variant="outline" size="lg">
                  View Documentation
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Code Example Section */}
      <section className="bg-gray-900 py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              One Request. Instant Results.
            </h2>
            <p className="mt-4 text-lg text-gray-400">
              Get started in seconds with our simple REST API
            </p>
          </div>
          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <div>
              <p className="mb-4 text-sm font-medium text-gray-400">Request</p>
              <CodeBlock code={exampleCode} language="bash" />
            </div>
            <div>
              <p className="mb-4 text-sm font-medium text-gray-400">Response</p>
              <CodeBlock code={responseCode} language="json" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything You Need
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Built for developers who need reliable web data extraction
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={Zap}
              title="Lightning Fast"
              description="Edge-powered infrastructure delivers results in milliseconds"
            />
            <FeatureCard
              icon={Shield}
              title="Secure by Default"
              description="SSRF protection, encrypted keys, and rate limiting built-in"
            />
            <FeatureCard
              icon={Globe}
              title="JavaScript Rendering"
              description="Full browser rendering for dynamic content extraction"
            />
            <FeatureCard
              icon={Code}
              title="Developer Friendly"
              description="Clean API, detailed docs, and helpful error messages"
            />
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Start free, scale as you grow
            </p>
          </div>
          <div className="mt-12 flex justify-center">
            <div className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Free Tier</h3>
              <p className="mt-4 flex items-baseline">
                <span className="text-4xl font-bold text-gray-900">$0</span>
                <span className="ml-2 text-gray-500">/month</span>
              </p>
              <ul className="mt-6 space-y-3 text-sm text-gray-600">
                <li>100 requests/day</li>
                <li>Light & heavy scraping</li>
                <li>Screenshot support</li>
                <li>Community support</li>
              </ul>
              <Link href="/signup" className="mt-8 block">
                <Button className="w-full">Get Started Free</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100">
        <Icon className="h-5 w-5 text-brand-600" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </div>
  );
}
```

### Dashboard Layout (app/(dashboard)/layout.tsx)

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard/nav";
import { DashboardHeader } from "@/components/dashboard/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={session.user} />
      <div className="flex">
        <DashboardNav />
        <main className="flex-1 p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
```

### Dashboard Page (app/(dashboard)/dashboard/page.tsx)

```tsx
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { UsageStats } from "@/components/dashboard/usage-stats";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentRequests } from "@/components/dashboard/recent-requests";
import { ApiKeyCard } from "@/components/dashboard/api-key-card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {session?.user?.name?.split(" ")[0] || "Developer"}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Here&apos;s an overview of your API usage
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Suspense fallback={<Skeleton className="h-32" />}>
          <UsageStats />
        </Suspense>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-64" />}>
          <ApiKeyCard />
        </Suspense>
        <QuickActions />
      </div>

      <Suspense fallback={<Skeleton className="h-96" />}>
        <RecentRequests />
      </Suspense>
    </div>
  );
}
```

### Playground Page (app/(dashboard)/playground/page.tsx)

```tsx
"use client";

import { useState } from "react";
import { PlaygroundForm } from "@/components/playground/form";
import { PlaygroundResponse } from "@/components/playground/response";
import { useScrape } from "@/hooks/use-scrape";

export default function PlaygroundPage() {
  const [response, setResponse] = useState<unknown>(null);
  const { scrape, isLoading, error } = useScrape();

  const handleSubmit = async (data: {
    url: string;
    render: boolean;
    selector?: string;
  }) => {
    const result = await scrape(data);
    setResponse(result);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">API Playground</h1>
        <p className="mt-1 text-sm text-gray-600">
          Test the Scraper API directly in your browser
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <PlaygroundForm onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
        <div>
          <PlaygroundResponse
            data={response}
            error={error}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
```

### Login Page (app/(auth)/login/page.tsx)

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";

export const metadata = {
  title: "Login",
};

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to access your dashboard
          </p>
        </div>

        <div className="mt-8">
          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: "/dashboard" });
            }}
          >
            <Button type="submit" className="w-full" size="lg">
              <Github className="mr-2 h-5 w-5" />
              Continue with GitHub
            </Button>
          </form>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          By signing in, you agree to our{" "}
          <Link href="/terms" className="text-brand-600 hover:text-brand-500">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-brand-600 hover:text-brand-500">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
```

---

## 5. API Client Utilities

### lib/api-client.ts

```typescript
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.scraper.dev";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    request_id: string;
  };
  meta?: {
    request_id: string;
    duration_ms?: number;
    [key: string]: unknown;
  };
}

class ApiClient {
  private apiKey: string | null = null;

  setApiKey(key: string) {
    this.apiKey = key;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(this.apiKey && { "X-API-Key": this.apiKey }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error?.message || "An error occurred",
        data.error?.code || "UNKNOWN_ERROR",
        response.status,
        data.error?.request_id,
      );
    }

    return data;
  }

  async scrape(params: {
    url: string;
    render?: boolean;
    selector?: string;
    wait_for?: string;
    timeout?: number;
  }) {
    return this.request<{
      content: string;
      title: string;
      url: string;
      timestamp: string;
    }>("/api/v1/scrape", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async screenshot(params: {
    url: string;
    width?: number;
    height?: number;
    full_page?: boolean;
    format?: "png" | "jpeg" | "webp";
  }) {
    const response = await fetch(`${API_BASE_URL}/api/v1/screenshot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey && { "X-API-Key": this.apiKey }),
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new ApiError(
        data.error?.message || "Screenshot failed",
        data.error?.code || "SCREENSHOT_FAILED",
        response.status,
        data.error?.request_id,
      );
    }

    return response.blob();
  }

  async getUsage() {
    return this.request<{
      used: number;
      limit: number;
      remaining: number;
      reset_at: string;
    }>("/api/v1/user/usage", {
      method: "GET",
    });
  }

  async getApiKeys() {
    return this.request<
      Array<{
        id: string;
        key_prefix: string;
        name: string;
        created_at: string;
        last_used_at: string | null;
      }>
    >("/api/v1/user/api-keys", {
      method: "GET",
    });
  }

  async createApiKey(name: string) {
    return this.request<{
      id: string;
      key: string; // Only returned on creation
      key_prefix: string;
      name: string;
    }>("/api/v1/user/api-keys", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async revokeApiKey(id: string) {
    return this.request<{ revoked: boolean }>(`/api/v1/user/api-keys/${id}`, {
      method: "DELETE",
    });
  }

  async getRecentRequests(limit: number = 10) {
    return this.request<
      Array<{
        request_id: string;
        method: string;
        path: string;
        target_url: string;
        status_code: number;
        duration_ms: number;
        created_at: string;
      }>
    >(`/api/v1/user/requests?limit=${limit}`, {
      method: "GET",
    });
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const apiClient = new ApiClient();
```

---

## 6. React Hooks

### hooks/use-scrape.ts

```typescript
"use client";

import { useState, useCallback } from "react";
import { apiClient, ApiError } from "@/lib/api-client";

interface ScrapeParams {
  url: string;
  render?: boolean;
  selector?: string;
  wait_for?: string;
  timeout?: number;
}

interface ScrapeResult {
  content: string;
  title: string;
  url: string;
  timestamp: string;
}

export function useScrape() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [data, setData] = useState<ScrapeResult | null>(null);

  const scrape = useCallback(async (params: ScrapeParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.scrape(params);
      setData(response.data || null);
      return response;
    } catch (err) {
      const apiError =
        err instanceof ApiError
          ? err
          : new ApiError("An unexpected error occurred", "UNKNOWN_ERROR", 500);
      setError(apiError);
      throw apiError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return {
    scrape,
    reset,
    data,
    isLoading,
    error,
  };
}
```

### hooks/use-api-keys.ts

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient, ApiError } from "@/lib/api-client";

interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
}

export function useApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getApiKeys();
      setKeys(response.data || []);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err
          : new ApiError("Failed to fetch API keys", "FETCH_ERROR", 500),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createKey = useCallback(
    async (name: string) => {
      const response = await apiClient.createApiKey(name);
      await fetchKeys();
      return response.data;
    },
    [fetchKeys],
  );

  const revokeKey = useCallback(async (id: string) => {
    await apiClient.revokeApiKey(id);
    setKeys((prev) => prev.filter((k) => k.id !== id));
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  return {
    keys,
    isLoading,
    error,
    createKey,
    revokeKey,
    refresh: fetchKeys,
  };
}
```

### hooks/use-usage.ts

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient, ApiError } from "@/lib/api-client";

interface UsageData {
  used: number;
  limit: number;
  remaining: number;
  reset_at: string;
}

export function useUsage() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchUsage = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getUsage();
      setUsage(response.data || null);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err
          : new ApiError("Failed to fetch usage", "FETCH_ERROR", 500),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage();
    // Refresh usage every 30 seconds
    const interval = setInterval(fetchUsage, 30000);
    return () => clearInterval(interval);
  }, [fetchUsage]);

  const percentage = usage ? (usage.used / usage.limit) * 100 : 0;

  return {
    usage,
    percentage,
    isLoading,
    error,
    refresh: fetchUsage,
  };
}
```

---

## 7. UI/UX Specifications

### Design Tokens

```typescript
// lib/design-tokens.ts

export const colors = {
  // Primary brand colors
  brand: {
    50: "#f0f9ff",
    100: "#e0f2fe",
    200: "#bae6fd",
    300: "#7dd3fc",
    400: "#38bdf8",
    500: "#0ea5e9",
    600: "#0284c7",
    700: "#0369a1",
    800: "#075985",
    900: "#0c4a6e",
  },

  // Semantic colors
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",
};

export const spacing = {
  xs: "0.25rem", // 4px
  sm: "0.5rem", // 8px
  md: "1rem", // 16px
  lg: "1.5rem", // 24px
  xl: "2rem", // 32px
  "2xl": "3rem", // 48px
};

export const typography = {
  fontFamily: {
    sans: "Inter, system-ui, sans-serif",
    mono: "JetBrains Mono, monospace",
  },
  fontSize: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
  },
};

export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
};
```

### Loading States

All async operations must display loading indicators:

1. **Skeleton loaders** for initial data fetch
2. **Spinner overlay** for form submissions
3. **Button loading state** with spinner and disabled state
4. **Progress bar** for long operations

### Error States

- Display error messages inline near the related input
- Use toast notifications for non-blocking errors
- Provide retry buttons for recoverable errors
- Show error codes for debugging (in developer mode)

### Responsive Breakpoints

- **Mobile first**: Base styles target mobile
- **Tablet (md)**: 768px - Two-column layouts
- **Desktop (lg)**: 1024px - Full layouts with sidebar
- **Wide (xl)**: 1280px - Maximum content width

---

## Document Cross-References

- Component specifications: [COMPONENTS.md](./COMPONENTS.md)
- API implementation: [BACKEND.md](./BACKEND.md)
- Routing configuration: [ROUTING.md](./ROUTING.md)
- Deployment setup: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

_Frontend Implementation Version 1.0.0 - Created 2025-12-25_
