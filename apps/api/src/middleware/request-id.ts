import type { Context, Next } from "hono";
import type { Env, Variables } from "../types";

function generateRequestId(): string {
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `req_${Date.now()}_${rand}`;
}

export async function requestIdMiddleware(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next,
) {
  const requestId = generateRequestId();
  c.set("requestId", requestId);
  c.set("startTime", Date.now());
  c.set("user", null);
  c.set("apiKey", null);
  c.header("X-Request-ID", requestId);
  await next();
}
