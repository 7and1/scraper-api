import type { Context, Next } from "hono";
import type { Env, Variables } from "../types";
import { createErrorResponse } from "../utils/response";

export async function internalAuthMiddleware(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next,
) {
  const requestId = c.get("requestId");
  const secret = c.req.header("X-Internal-Secret");

  if (!secret || secret !== c.env.INTERNAL_API_SECRET) {
    return createErrorResponse(
      "FORBIDDEN",
      "Internal endpoint access denied.",
      requestId,
      403,
    );
  }

  await next();
}
