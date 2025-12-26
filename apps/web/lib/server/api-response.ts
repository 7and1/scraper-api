import "server-only";

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    request_id: string;
    details?: Record<string, unknown>;
  };
}

export interface ApiSuccessBody<T> {
  success: true;
  data: T;
  meta: {
    request_id: string;
    [key: string]: unknown;
  };
}

export function makeRequestId(): string {
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `req_${Date.now()}_${rand}`;
}

export function jsonError(
  code: string,
  message: string,
  status: number,
  requestId: string,
  details?: Record<string, unknown>,
): Response {
  const body: ApiErrorBody = {
    success: false,
    error: {
      code,
      message,
      request_id: requestId,
      ...(details ? { details } : {}),
    },
  };

  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Request-ID": requestId,
    },
  });
}

export function jsonSuccess<T>(
  data: T,
  status: number,
  requestId: string,
  meta?: Record<string, unknown>,
): Response {
  const body: ApiSuccessBody<T> = {
    success: true,
    data,
    meta: { request_id: requestId, ...(meta || {}) },
  };

  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Request-ID": requestId,
    },
  });
}
