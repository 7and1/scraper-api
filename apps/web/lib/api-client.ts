const WORKER_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.scraper.dev";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    request_id: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    request_id: string;
    duration_ms?: number;
    [key: string]: unknown;
  };
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

class ApiClient {
  private apiKey: string | null = null;

  setApiKey(key: string) {
    this.apiKey = key;
  }

  clearApiKey() {
    this.apiKey = null;
  }

  private async request<T>(
    baseUrl: string,
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(this.apiKey && { "X-API-Key": this.apiKey }),
      ...options.headers,
    };

    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
      cache: "no-store",
    });

    const data = (await response.json()) as ApiResponse<T>;

    if (!response.ok || !data.success) {
      throw new ApiError(
        data.error?.message || "An error occurred",
        data.error?.code || "UNKNOWN_ERROR",
        response.status,
        data.error?.request_id,
      );
    }

    return data;
  }

  // Worker endpoints (API key auth)
  scrape(params: {
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
    }>(WORKER_BASE_URL, "/api/v1/scrape", {
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
    timeout?: number;
  }) {
    const response = await fetch(`${WORKER_BASE_URL}/api/v1/screenshot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey && { "X-API-Key": this.apiKey }),
      },
      body: JSON.stringify(params),
      cache: "no-store",
    });

    if (!response.ok) {
      const data = (await response.json()) as ApiResponse<unknown>;
      throw new ApiError(
        data.error?.message || "Screenshot failed",
        data.error?.code || "SCREENSHOT_FAILED",
        response.status,
        data.error?.request_id,
      );
    }

    return response.blob();
  }

  // Dashboard endpoints (BFF -> Worker internal)
  getUsage() {
    return this.request<{
      used: number;
      limit: number;
      remaining: number;
      reset_at: string;
    }>("", "/api/user/usage", { method: "GET" });
  }

  getApiKeys() {
    return this.request<
      Array<{
        id: string;
        key_prefix: string;
        name: string;
        created_at: string;
        last_used_at: string | null;
      }>
    >("", "/api/user/api-keys", { method: "GET" });
  }

  createApiKey(name: string) {
    return this.request<{
      id: string;
      key: string; // only returned on creation
      key_prefix: string;
      name: string;
    }>("", "/api/user/api-keys", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  revokeApiKey(id: string) {
    return this.request<{ revoked: boolean }>("", `/api/user/api-keys/${id}`, {
      method: "DELETE",
    });
  }

  getRecentRequests(limit: number = 10) {
    return this.request<
      Array<{
        request_id: string;
        method: string;
        path: string;
        target_url: string | null;
        status_code: number | null;
        duration_ms: number | null;
        created_at: string;
      }>
    >("", `/api/user/requests?limit=${limit}`, { method: "GET" });
  }
}

export const apiClient = new ApiClient();
