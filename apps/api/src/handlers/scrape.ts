import type { Context } from "hono";
import { z } from "zod";
import type { Env, Variables, ScrapeRequest } from "../types";
import { scrapeHeavyweight } from "../services/scraper-heavy";
import { scrapeLightweight } from "../services/scraper-light";
import { createErrorResponse, createSuccessResponse } from "../utils/response";

const scrapeSchema = z.object({
  url: z.string().url("Invalid URL format"),
  render: z.boolean().default(false),
  selector: z.string().optional(),
  wait_for: z.string().optional(),
  timeout: z.number().min(1000).max(30000).default(30000),
});

export async function scrapeHandler(
  c: Context<{ Bindings: Env; Variables: Variables }>,
) {
  const requestId = c.get("requestId");
  const startTime = Date.now();

  let body: ScrapeRequest;
  try {
    const rawBody = await c.req.json();
    body = scrapeSchema.parse(rawBody);
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
    const renderMode = body.render ? "heavy" : "light";

    const result = body.render
      ? await scrapeHeavyweight(c.env.BROWSER, {
          url: body.url,
          selector: body.selector,
          wait_for: body.wait_for,
          timeout: body.timeout,
        })
      : await scrapeLightweight({
          url: body.url,
          selector: body.selector,
          timeout: body.timeout,
        });

    const duration = Date.now() - startTime;
    const responseSize = result.content?.length ?? 0;

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
          "/api/v1/scrape",
          body.url,
          renderMode,
          200,
          duration,
          responseSize,
          c.req.header("CF-Connecting-IP") ?? null,
          c.req.header("User-Agent") ?? null,
          c.req.header("CF-Ray") ?? null,
          c.req.header("CF-Colo") ?? null,
        )
        .run(),
    );

    return createSuccessResponse(result, requestId, 200, {
      duration_ms: duration,
      render_mode: renderMode,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown error";

    let code = "SCRAPE_FAILED";
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
    } else if (message.startsWith("SELECTOR_NOT_FOUND:")) {
      code = "SELECTOR_NOT_FOUND";
      status = 400;
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
          "/api/v1/scrape",
          body.url,
          body.render ? "heavy" : "light",
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
