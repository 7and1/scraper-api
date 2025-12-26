import { auth } from "@/lib/auth";
import { jsonError, makeRequestId } from "@/lib/server/api-response";
import { workerInternalFetch } from "@/lib/server/worker";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  if (!id) {
    return jsonError("INVALID_REQUEST", "Missing id", 400, requestId);
  }

  try {
    return await workerInternalFetch(
      `/internal/user/api-keys/${encodeURIComponent(id)}?user_id=${encodeURIComponent(session.user.id)}`,
      { method: "DELETE" },
    );
  } catch (error) {
    console.error("Failed to revoke API key", { requestId, error });
    return jsonError(
      "UPSTREAM_UNAVAILABLE",
      "Failed to reach API service",
      502,
      requestId,
    );
  }
}
