import type { Context, Next } from "hono";
import type { Env, Variables } from "../types";
import { createErrorResponse } from "../utils/response";

export async function errorHandler(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next,
) {
  try {
    await next();
  } catch (error) {
    const requestId = c.get("requestId") || "unknown";
    console.error("Unhandled error", { requestId, error });
    return createErrorResponse(
      "INTERNAL_ERROR",
      "Internal server error",
      requestId,
      500,
    );
  }
}
