import { auth } from "@/lib/auth";
import { jsonError, makeRequestId } from "@/lib/server/api-response";
import { workerInternalFetch } from "@/lib/server/worker";

export async function GET() {
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

  try {
    return await workerInternalFetch(
      `/internal/user/usage?user_id=${encodeURIComponent(session.user.id)}`,
      { method: "GET" },
    );
  } catch (error) {
    console.error("Failed to fetch usage", { requestId, error });
    return jsonError(
      "UPSTREAM_UNAVAILABLE",
      "Failed to reach API service",
      502,
      requestId,
    );
  }
}
