import type { Context, Next } from "hono";
import type { Env, Variables } from "../types";
import { checkAndIncrementQuota } from "../services/quota";
import { createErrorResponse } from "../utils/response";

export async function rateLimitMiddleware(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next,
) {
  const requestId = c.get("requestId");
  const user = c.get("user");

  if (!user) {
    return createErrorResponse(
      "UNAUTHORIZED",
      "Authentication required",
      requestId,
      401,
    );
  }

  const quotaResult = await checkAndIncrementQuota(
    c.env.DB,
    user.id,
    user.quota_limit,
  );

  c.header("X-RateLimit-Limit", user.quota_limit.toString());
  c.header("X-RateLimit-Remaining", quotaResult.remaining.toString());
  c.header(
    "X-RateLimit-Reset",
    Math.floor(quotaResult.reset_at / 1000).toString(),
  );

  if (!quotaResult.allowed) {
    const resetDate = new Date(quotaResult.reset_at);
    return createErrorResponse(
      "QUOTA_EXCEEDED",
      `Daily quota of ${user.quota_limit} requests exceeded. Resets at ${resetDate.toISOString()}.`,
      requestId,
      429,
      {
        limit: quotaResult.limit,
        current: quotaResult.current,
        reset_at: quotaResult.reset_at,
      },
    );
  }

  await next();
}
