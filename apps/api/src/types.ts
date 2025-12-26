import type { D1Database } from "@cloudflare/workers-types";

export interface Env {
  DB: D1Database;
  BROWSER: Fetcher;

  AUTH_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  INTERNAL_API_SECRET: string;

  ENVIRONMENT: "development" | "staging" | "production";
  LOG_LEVEL?: "debug" | "info" | "warn" | "error";
}

export interface Variables {
  requestId: string;
  startTime: number;
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
  timeout?: number;
}

export interface ScrapeResult {
  content: string;
  title: string;
  url: string;
  timestamp: string;
}
