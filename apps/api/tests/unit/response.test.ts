import { describe, expect, it } from "vitest";
import {
  createErrorResponse,
  createSuccessResponse,
  createImageResponse,
} from "../../src/utils/response";

describe("response utils", () => {
  it("creates error response with correct structure", () => {
    const response = createErrorResponse(
      "TEST_ERROR",
      "Test error message",
      "req_123",
      400,
    );
    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(response.headers.get("X-Request-ID")).toBe("req_123");
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    return response.json().then((data) => {
      expect(data).toEqual({
        success: false,
        error: {
          code: "TEST_ERROR",
          message: "Test error message",
          request_id: "req_123",
        },
      });
    });
  });

  it("creates error response with details", () => {
    const response = createErrorResponse(
      "VALIDATION_ERROR",
      "Invalid input",
      "req_456",
      422,
      {
        field: "url",
        reason: "Invalid URL format",
      },
    );

    return response.json().then((data: unknown) => {
      const errorData = data as {
        success: boolean;
        error: { details?: { field: string; reason: string } };
      };
      expect(errorData.error.details).toEqual({
        field: "url",
        reason: "Invalid URL format",
      });
    });
  });

  it("creates success response with data", () => {
    const testData = { content: "test", title: "Test Page" };
    const response = createSuccessResponse(testData, "req_789", 200);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(response.headers.get("X-Request-ID")).toBe("req_789");
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    return response.json().then((data: unknown) => {
      const successData = data as {
        success: boolean;
        data: { content: string; title: string };
        meta: { request_id: string };
      };
      expect(successData.success).toBe(true);
      expect(successData.data).toEqual(testData);
      expect(successData.meta.request_id).toBe("req_789");
    });
  });

  it("creates success response with metadata", () => {
    const response = createSuccessResponse({ result: "ok" }, "req_abc", 200, {
      duration_ms: 123,
      render_mode: "light",
    });

    return response.json().then((data: unknown) => {
      const metaData = data as {
        success: boolean;
        meta: { duration_ms: number; render_mode: string };
      };
      expect(metaData.meta.duration_ms).toBe(123);
      expect(metaData.meta.render_mode).toBe("light");
    });
  });

  it("creates image response with correct MIME type", () => {
    const buffer = new ArrayBuffer(1024);
    const response = createImageResponse(buffer, "png", "req_img");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("X-Request-ID")).toBe("req_img");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600");
  });

  it("creates image response for jpeg format", () => {
    const buffer = new ArrayBuffer(512);
    const response = createImageResponse(buffer, "jpeg", "req_jpeg");

    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("creates image response for webp format", () => {
    const buffer = new ArrayBuffer(256);
    const response = createImageResponse(buffer, "webp", "req_webp");

    expect(response.headers.get("Content-Type")).toBe("image/webp");
  });
});
