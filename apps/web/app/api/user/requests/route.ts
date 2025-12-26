import { auth } from "@/lib/auth";
import { jsonError, makeRequestId } from "@/lib/server/api-response";
import { workerInternalFetch } from "@/lib/server/worker";

export async function GET(req: Request) {
  const requestId = makeRequestId();
  const session = await auth();

  if (!session?.user?.id) {
    return jsonError(
      "UNAUTHORIZED",
      "Session required. Please log in.",
      401,
      requestId,
    );
  }

  const url = new URL(req.url);
  const limit = Number.parseInt(url.searchParams.get("limit") || "10", 10);
  const safeLimit = Number.isFinite(limit)
    ? Math.min(Math.max(limit, 1), 50)
    : 10;

  try {
    return await workerInternalFetch(
      `/internal/user/requests?user_id=${encodeURIComponent(session.user.id)}&limit=${safeLimit}`,
      { method: "GET" },
    );
  } catch (error) {
    console.error("Failed to fetch request logs", { requestId, error });
    return jsonError(
      "UPSTREAM_UNAVAILABLE",
      "Failed to reach API service",
      502,
      requestId,
    );
  }
}
