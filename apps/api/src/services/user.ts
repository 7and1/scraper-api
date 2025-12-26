import type { D1Database } from "@cloudflare/workers-types";
import { z } from "zod";
import { generateApiKey, getKeyPrefix, hashApiKey } from "../utils/hash";

export const authSyncSchema = z.object({
  github_id: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
});

export interface UserRow {
  id: string;
  github_id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  plan: "free" | "pro" | "enterprise";
  quota_limit: number;
  quota_count: number;
  quota_reset_at: number;
}

export async function upsertUserFromOAuth(
  db: D1Database,
  input: z.infer<typeof authSyncSchema>,
): Promise<UserRow> {
  const now = Date.now();

  const user = await db
    .prepare(
      `
        INSERT INTO users (github_id, email, name, avatar_url, last_login_at, updated_at, deleted_at)
        VALUES (?, ?, ?, ?, ?, ?, NULL)
        ON CONFLICT(github_id) DO UPDATE SET
          email = excluded.email,
          name = excluded.name,
          avatar_url = excluded.avatar_url,
          last_login_at = excluded.last_login_at,
          updated_at = excluded.updated_at,
          deleted_at = NULL
        RETURNING
          id,
          github_id,
          email,
          name,
          avatar_url,
          plan,
          quota_limit,
          quota_count,
          quota_reset_at
      `,
    )
    .bind(
      input.github_id,
      input.email,
      input.name ?? null,
      input.avatar_url ?? null,
      now,
      now,
    )
    .first<UserRow>();

  if (!user) {
    throw new Error("Failed to upsert user");
  }

  return user;
}

export interface ApiKeyRow {
  id: string;
  key_prefix: string;
  name: string;
  created_at: number;
  last_used_at: number | null;
}

export async function listApiKeys(
  db: D1Database,
  userId: string,
): Promise<ApiKeyRow[]> {
  const { results } = await db
    .prepare(
      `
        SELECT id, key_prefix, name, created_at, last_used_at
        FROM api_keys
        WHERE user_id = ?
          AND is_active = 1
        ORDER BY created_at DESC
      `,
    )
    .bind(userId)
    .all<ApiKeyRow>();

  return results || [];
}

export async function createApiKeyForUser(
  db: D1Database,
  userId: string,
  name: string,
): Promise<{ id: string; key: string; key_prefix: string; name: string }> {
  const now = Date.now();

  for (let attempt = 0; attempt < 3; attempt++) {
    const key = generateApiKey();
    const keyHash = await hashApiKey(key);
    const keyPrefix = getKeyPrefix(key);

    try {
      const created = await db
        .prepare(
          `
            INSERT INTO api_keys (user_id, key_hash, key_prefix, name, created_at)
            VALUES (?, ?, ?, ?, ?)
            RETURNING id, key_prefix, name
          `,
        )
        .bind(userId, keyHash, keyPrefix, name, now)
        .first<{ id: string; key_prefix: string; name: string }>();

      if (!created) {
        throw new Error("Failed to create API key");
      }

      return {
        id: created.id,
        key,
        key_prefix: created.key_prefix,
        name: created.name,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";

      if (
        message.includes("UNIQUE constraint failed") &&
        message.includes("api_keys.user_id") &&
        message.includes("api_keys.name")
      ) {
        throw new Error(
          "API_KEY_NAME_TAKEN: API key name already exists for this user",
        );
      }

      if (
        message.includes("UNIQUE constraint failed") &&
        message.includes("api_keys.key_hash")
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    "API_KEY_GENERATION_FAILED: Failed to generate unique API key",
  );
}

export async function revokeApiKeyForUser(
  db: D1Database,
  userId: string,
  apiKeyId: string,
): Promise<boolean> {
  const res = await db
    .prepare(
      `
        UPDATE api_keys
        SET is_active = 0
        WHERE id = ?
          AND user_id = ?
          AND is_active = 1
      `,
    )
    .bind(apiKeyId, userId)
    .run();

  return (res.meta?.changes ?? 0) > 0;
}
