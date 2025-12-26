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
    duration_ms?: number;
    render_mode?: "light" | "heavy";
    [key: string]: unknown;
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  requestId: string,
  status: number,
  details?: Record<string, unknown>,
): Response {
  const body: ApiErrorBody = {
    success: false,
    error: {
      code,
      message,
      request_id: requestId,
      ...(details && { details }),
    },
  };

  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": requestId,
      "Cache-Control": "no-store",
    },
  });
}

export function createSuccessResponse<T>(
  data: T,
  requestId: string,
  status: number = 200,
  meta?: Record<string, unknown>,
): Response {
  const body: ApiSuccessBody<T> = {
    success: true,
    data,
    meta: {
      request_id: requestId,
      ...meta,
    },
  };

  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": requestId,
      "Cache-Control": "no-store",
    },
  });
}

export function createImageResponse(
  data: ArrayBuffer,
  format: "png" | "jpeg" | "webp",
  requestId: string,
): Response {
  const mimeType = {
    png: "image/png",
    jpeg: "image/jpeg",
    webp: "image/webp",
  }[format];

  return new Response(data, {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "X-Request-ID": requestId,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
