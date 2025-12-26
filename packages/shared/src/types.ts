export type Plan = "free" | "pro" | "enterprise";

export interface ApiErrorShape {
  code: string;
  message: string;
  request_id: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiErrorShape;
  meta?: {
    request_id: string;
    duration_ms?: number;
    render_mode?: "light" | "heavy";
    [key: string]: unknown;
  };
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
