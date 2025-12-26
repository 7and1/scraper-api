import type { Context } from "hono";
import { z } from "zod";
import type { Env, ScreenshotRequest, Variables } from "../types";
import { takeScreenshot } from "../services/scraper-heavy";
import { createErrorResponse, createImageResponse } from "../utils/response";

const screenshotSchema = z.object({
  url: z.string().url("Invalid URL format"),
  width: z.number().min(320).max(1920).default(1280),
  height: z.number().min(240).max(1080).default(720),
  full_page: z.boolean().default(false),
  format: z.enum(["png", "jpeg", "webp"]).default("png"),
  timeout: z.number().min(1000).max(30000).default(30000),
});

export async function screenshotHandler(
  c: Context<{ Bindings: Env; Variables: Variables }>,
) {
  const requestId = c.get("requestId");
  const startTime = Date.now();

  let body: ScreenshotRequest;
  try {
    const rawBody = await c.req.json();
    body = screenshotSchema.parse(rawBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(
        "INVALID_REQUEST",
        "Request validation failed",
        requestId,
        400,
        { errors: error.errors },
      );
    }
    return createErrorResponse(
      "INVALID_REQUEST",
      "Invalid JSON body",
      requestId,
      400,
    );
  }

  try {
    const screenshot = await takeScreenshot(c.env.BROWSER, {
      url: body.url,
      width: body.width,
      height: body.height,
      full_page: body.full_page,
      format: body.format,
      timeout: body.timeout,
    });

    const duration = Date.now() - startTime;
    const size = screenshot.byteLength ?? 0;

    c.executionCtx.waitUntil(
      c.env.DB.prepare(
        `
          INSERT INTO request_logs
          (request_id, user_id, api_key_id, method, path, target_url, render_mode, status_code, duration_ms, response_size, ip_address, user_agent, cf_ray, cf_colo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
        .bind(
          requestId,
          c.get("user")?.id ?? null,
          c.get("apiKey")?.id ?? null,
          "POST",
          "/api/v1/screenshot",
          body.url,
          "heavy",
          200,
          duration,
          size,
          c.req.header("CF-Connecting-IP") ?? null,
          c.req.header("User-Agent") ?? null,
          c.req.header("CF-Ray") ?? null,
          c.req.header("CF-Colo") ?? null,
        )
        .run(),
    );

    return createImageResponse(screenshot, body.format || "png", requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown error";

    let code = "SCREENSHOT_FAILED";
    let status = 502;

    if (message.startsWith("SSRF_BLOCKED:")) {
      code = "SSRF_BLOCKED";
      status = 400;
    } else if (message.includes("/v1/acquire")) {
      code = "BROWSER_UNAVAILABLE";
      status = 503;
    } else if (message.startsWith("SCRAPE_TIMEOUT:")) {
      code = "SCRAPE_TIMEOUT";
      status = 504;
    }

    c.executionCtx.waitUntil(
      c.env.DB.prepare(
        `
          INSERT INTO request_logs
          (request_id, user_id, api_key_id, method, path, target_url, render_mode, status_code, error_code, duration_ms, ip_address, user_agent, cf_ray, cf_colo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
        .bind(
          requestId,
          c.get("user")?.id ?? null,
          c.get("apiKey")?.id ?? null,
          "POST",
          "/api/v1/screenshot",
          body.url,
          "heavy",
          status,
          code,
          duration,
          c.req.header("CF-Connecting-IP") ?? null,
          c.req.header("User-Agent") ?? null,
          c.req.header("CF-Ray") ?? null,
          c.req.header("CF-Colo") ?? null,
        )
        .run(),
    );

    const clientMessage =
      code === "BROWSER_UNAVAILABLE"
        ? "Browser rendering unavailable. Enable Cloudflare Browser Rendering and bind the BROWSER service."
        : message.replace(/^[A-Z_]+:\s*/, "");

    return createErrorResponse(code, clientMessage, requestId, status);
  }
}
