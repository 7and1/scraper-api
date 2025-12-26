import type { Context } from "hono";
import { z } from "zod";
import type { Env, Variables } from "../types";
import { getQuotaInfo } from "../services/quota";
import {
  authSyncSchema,
  createApiKeyForUser,
  listApiKeys,
  revokeApiKeyForUser,
  upsertUserFromOAuth,
} from "../services/user";
import { createErrorResponse, createSuccessResponse } from "../utils/response";

export async function syncUser(
  c: Context<{ Bindings: Env; Variables: Variables }>,
) {
  const requestId = c.get("requestId");
  let body: z.infer<typeof authSyncSchema>;
  try {
    body = authSyncSchema.parse(await c.req.json());
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
    const user = await upsertUserFromOAuth(c.env.DB, body);

    c.executionCtx.waitUntil(
      c.env.DB.prepare(
        `
          INSERT INTO auth_logs (user_id, event_type, ip_address, user_agent)
          VALUES (?, 'login', ?, ?)
        `,
      )
        .bind(
          user.id,
          c.req.header("CF-Connecting-IP") || "unknown",
          c.req.header("User-Agent") || "unknown",
        )
        .run(),
    );

    return createSuccessResponse(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: user.avatar_url,
          plan: user.plan,
        },
      },
      requestId,
      200,
    );
  } catch (error) {
    console.error("Failed to sync user", { requestId, error });
    return createErrorResponse(
      "SYNC_FAILED",
      "Failed to sync user",
      requestId,
      500,
    );
  }
}

const userIdQuerySchema = z.object({
  user_id: z.string().min(1),
});

export async function internalGetApiKeys(
  c: Context<{ Bindings: Env; Variables: Variables }>,
) {
  const requestId = c.get("requestId");
  const parsed = userIdQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return createErrorResponse(
      "INVALID_REQUEST",
      "Missing user_id",
      requestId,
      400,
    );
  }

  const keys = await listApiKeys(c.env.DB, parsed.data.user_id);
  return createSuccessResponse(
    keys.map((k) => ({
      id: k.id,
      key_prefix: k.key_prefix,
      name: k.name,
      created_at: new Date(k.created_at).toISOString(),
      last_used_at: k.last_used_at
        ? new Date(k.last_used_at).toISOString()
        : null,
    })),
    requestId,
    200,
  );
}

const createKeySchema = z.object({
  user_id: z.string().min(1),
  name: z.string().min(1).max(64),
});

export async function internalCreateApiKey(
  c: Context<{ Bindings: Env; Variables: Variables }>,
) {
  const requestId = c.get("requestId");
  let body: z.infer<typeof createKeySchema>;
  try {
    body = createKeySchema.parse(await c.req.json());
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

  let created: Awaited<ReturnType<typeof createApiKeyForUser>>;
  try {
    created = await createApiKeyForUser(c.env.DB, body.user_id, body.name);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message.startsWith("API_KEY_NAME_TAKEN:")) {
      return createErrorResponse(
        "API_KEY_NAME_TAKEN",
        "An API key with this name already exists.",
        requestId,
        409,
      );
    }

    console.error("Failed to create API key", { requestId, error });
    return createErrorResponse(
      "KEY_CREATE_FAILED",
      "Failed to create API key",
      requestId,
      500,
    );
  }

  c.executionCtx.waitUntil(
    c.env.DB.prepare(
      `
        INSERT INTO auth_logs (user_id, event_type, ip_address, user_agent, metadata)
        VALUES (?, 'key_created', ?, ?, ?)
      `,
    )
      .bind(
        body.user_id,
        c.req.header("CF-Connecting-IP") || "unknown",
        c.req.header("User-Agent") || "unknown",
        JSON.stringify({ key_prefix: created.key_prefix, name: created.name }),
      )
      .run(),
  );

  return createSuccessResponse(created, requestId, 201);
}

export async function internalRevokeApiKey(
  c: Context<{ Bindings: Env; Variables: Variables }>,
) {
  const requestId = c.get("requestId");
  const apiKeyId = c.req.param("id");
  const parsed = userIdQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return createErrorResponse(
      "INVALID_REQUEST",
      "Missing user_id",
      requestId,
      400,
    );
  }

  const revoked = await revokeApiKeyForUser(
    c.env.DB,
    parsed.data.user_id,
    apiKeyId,
  );
  if (!revoked) {
    return createErrorResponse(
      "NOT_FOUND",
      "API key not found",
      requestId,
      404,
    );
  }

  c.executionCtx.waitUntil(
    c.env.DB.prepare(
      `
        INSERT INTO auth_logs (user_id, event_type, ip_address, user_agent, metadata)
        VALUES (?, 'key_revoked', ?, ?, ?)
      `,
    )
      .bind(
        parsed.data.user_id,
        c.req.header("CF-Connecting-IP") || "unknown",
        c.req.header("User-Agent") || "unknown",
        JSON.stringify({ api_key_id: apiKeyId }),
      )
      .run(),
  );

  return createSuccessResponse({ revoked: true }, requestId, 200);
}

export async function internalGetRequestLogs(
  c: Context<{ Bindings: Env; Variables: Variables }>,
) {
  const requestId = c.get("requestId");
  const parsed = userIdQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return createErrorResponse(
      "INVALID_REQUEST",
      "Missing user_id",
      requestId,
      400,
    );
  }

  const limit = Number.parseInt(c.req.query("limit") || "10", 10);
  const safeLimit = Number.isFinite(limit)
    ? Math.min(Math.max(limit, 1), 50)
    : 10;

  const { results } = await c.env.DB.prepare(
    `
      SELECT request_id, method, path, target_url, status_code, duration_ms, created_at
      FROM request_logs
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `,
  )
    .bind(parsed.data.user_id, safeLimit)
    .all<{
      request_id: string;
      method: string;
      path: string;
      target_url: string | null;
      status_code: number | null;
      duration_ms: number | null;
      created_at: number;
    }>();

  return createSuccessResponse(
    (results || []).map((r) => ({
      request_id: r.request_id,
      method: r.method,
      path: r.path,
      target_url: r.target_url,
      status_code: r.status_code,
      duration_ms: r.duration_ms,
      created_at: new Date(r.created_at).toISOString(),
    })),
    requestId,
    200,
  );
}

export async function internalGetUserUsage(
  c: Context<{ Bindings: Env; Variables: Variables }>,
) {
  const requestId = c.get("requestId");
  const parsed = userIdQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return createErrorResponse(
      "INVALID_REQUEST",
      "Missing user_id",
      requestId,
      400,
    );
  }

  const quota = await getQuotaInfo(c.env.DB, parsed.data.user_id);
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
