import type { D1Database } from "@cloudflare/workers-types";

export interface QuotaCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  reset_at: number;
  remaining: number;
}

export async function checkAndIncrementQuota(
  db: D1Database,
  userId: string,
  quotaLimit: number,
): Promise<QuotaCheckResult> {
  const now = Date.now();
  const result = await db
    .prepare(
      `
        UPDATE users
        SET
          quota_count = CASE
            WHEN quota_reset_at <= ? THEN 1
            ELSE quota_count + 1
          END,
          quota_reset_at = CASE
            WHEN quota_reset_at <= ? THEN (strftime('%s', 'now', 'start of day', '+1 day') * 1000)
            ELSE quota_reset_at
          END,
          updated_at = strftime('%s', 'now') * 1000
        WHERE id = ?
          AND (
            quota_reset_at <= ?
            OR quota_count < ?
          )
        RETURNING quota_count, quota_reset_at
      `,
    )
    .bind(now, now, userId, now, quotaLimit)
    .first<{ quota_count: number; quota_reset_at: number }>();

  if (!result) {
    const current = await db
      .prepare("SELECT quota_count, quota_reset_at FROM users WHERE id = ?")
      .bind(userId)
      .first<{ quota_count: number; quota_reset_at: number }>();

    return {
      allowed: false,
      current: current?.quota_count ?? quotaLimit,
      limit: quotaLimit,
      reset_at: current?.quota_reset_at ?? now,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    current: result.quota_count,
    limit: quotaLimit,
    reset_at: result.quota_reset_at,
    remaining: Math.max(0, quotaLimit - result.quota_count),
  };
}

export async function getQuotaInfo(
  db: D1Database,
  userId: string,
): Promise<QuotaCheckResult> {
  const now = Date.now();
  const result = await db
    .prepare(
      `
        SELECT quota_count, quota_limit, quota_reset_at
        FROM users
        WHERE id = ?
      `,
    )
    .bind(userId)
    .first<{
      quota_count: number;
      quota_limit: number;
      quota_reset_at: number;
    }>();

  if (!result) {
    throw new Error("User not found");
  }

  const needsReset = result.quota_reset_at <= now;
  const current = needsReset ? 0 : result.quota_count;
  const resetAt = needsReset ? getResetTime(now) : result.quota_reset_at;

  return {
    allowed: current < result.quota_limit,
    current,
    limit: result.quota_limit,
    reset_at: resetAt,
    remaining: Math.max(0, result.quota_limit - current),
  };
}

export function getResetTime(nowMs: number = Date.now()): number {
  const now = new Date(nowMs);
  return Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  );
}
