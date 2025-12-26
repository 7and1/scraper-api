import type { Context } from "hono";
import type { Env, Variables } from "../types";

export async function healthHandler(
  c: Context<{ Bindings: Env; Variables: Variables }>,
) {
  const checks: Record<string, "ok" | "error"> = {};

  try {
    await c.env.DB.prepare("SELECT 1").first();
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  const allHealthy = Object.values(checks).every((v) => v === "ok");

  return c.json(
    {
      status: allHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
      version: "1.0.0",
    },
    allHealthy ? 200 : 503,
  );
}
