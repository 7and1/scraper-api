import type { D1Database } from "@cloudflare/workers-types";
import type { Context, Next } from "hono";
import type { ApiKey, Env, User, Variables } from "../types";
import { hashApiKey } from "../utils/hash";
import { createErrorResponse } from "../utils/response";

interface AuthResult {
  user: User;
  apiKey: ApiKey;
}

async function validateApiKey(
  db: D1Database,
  keyHash: string,
): Promise<AuthResult | null> {
  const result = await db
    .prepare(
      `
        SELECT
          u.id, u.github_id, u.email, u.name, u.avatar_url, u.plan,
          u.quota_limit, u.quota_count, u.quota_reset_at,
          k.id AS key_id, k.user_id, k.key_prefix, k.name AS key_name,
          k.is_active, k.last_used_at, k.created_at, k.expires_at
        FROM api_keys k
        JOIN users u ON k.user_id = u.id
        WHERE k.key_hash = ?
          AND k.is_active = 1
          AND (k.expires_at IS NULL OR k.expires_at > ?)
          AND u.deleted_at IS NULL
      `,
    )
    .bind(keyHash, Date.now())
    .first<{
      id: string;
      github_id: string;
      email: string;
      name: string | null;
      avatar_url: string | null;
      plan: string;
      quota_limit: number;
      quota_count: number;
      quota_reset_at: number;
      key_id: string;
      user_id: string;
      key_prefix: string;
      key_name: string;
      is_active: number;
      last_used_at: number | null;
      created_at: number;
      expires_at: number | null;
    }>();

  if (!result) return null;

  return {
    user: {
      id: result.id,
      github_id: result.github_id,
      email: result.email,
      name: result.name,
      avatar_url: result.avatar_url,
      plan: result.plan as User["plan"],
      quota_limit: result.quota_limit,
      quota_count: result.quota_count,
      quota_reset_at: result.quota_reset_at,
    },
    apiKey: {
      id: result.key_id,
      user_id: result.user_id,
      key_prefix: result.key_prefix,
      name: result.key_name,
      is_active: result.is_active === 1,
      last_used_at: result.last_used_at,
      created_at: result.created_at,
      expires_at: result.expires_at,
    },
  };
}

function extractApiKeyFromRequest(c: Context): string | null {
  const direct = c.req.header("X-API-Key");
  if (direct) return direct;

  const auth = c.req.header("Authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }

  return null;
}

export async function apiKeyAuthMiddleware(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next,
) {
  const requestId = c.get("requestId");
  const apiKey = extractApiKeyFromRequest(c);

  if (!apiKey) {
    return createErrorResponse(
      "UNAUTHORIZED",
      "Missing API key. Include X-API-Key header.",
      requestId,
      401,
    );
  }

  if (!/^sk_[0-9a-f]{64}$/i.test(apiKey)) {
    return createErrorResponse(
      "UNAUTHORIZED",
      "Invalid API key format.",
      requestId,
      401,
    );
  }

  const keyHash = await hashApiKey(apiKey);
  const authResult = await validateApiKey(c.env.DB, keyHash);

  if (!authResult) {
    return createErrorResponse(
      "UNAUTHORIZED",
      "Invalid or expired API key.",
      requestId,
      401,
    );
  }

  c.executionCtx.waitUntil(
    c.env.DB.prepare("UPDATE api_keys SET last_used_at = ? WHERE id = ?")
      .bind(Date.now(), authResult.apiKey.id)
      .run(),
  );

  c.executionCtx.waitUntil(
    c.env.DB.prepare(
      `
        INSERT INTO auth_logs (user_id, event_type, ip_address, user_agent, metadata)
        VALUES (?, 'key_used', ?, ?, ?)
      `,
    )
      .bind(
        authResult.user.id,
        c.req.header("CF-Connecting-IP") || "unknown",
        c.req.header("User-Agent") || "unknown",
        JSON.stringify({ key_prefix: authResult.apiKey.key_prefix }),
      )
      .run(),
  );

  c.set("user", authResult.user);
  c.set("apiKey", authResult.apiKey);

  await next();
}
