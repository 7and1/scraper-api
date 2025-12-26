import type { Context } from "hono";
import type { Env, Variables } from "../types";
import { createErrorResponse, createSuccessResponse } from "../utils/response";
import { getQuotaInfo } from "../services/quota";

export async function getUserUsage(
  c: Context<{ Bindings: Env; Variables: Variables }>,
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

  const quota = await getQuotaInfo(c.env.DB, user.id);
  return createSuccessResponse(
    {
      used: quota.current,
      limit: quota.limit,
      remaining: quota.remaining,
      reset_at: new Date(quota.reset_at).toISOString(),
    },
    requestId,
    200,
  );
}
