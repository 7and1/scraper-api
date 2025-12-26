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
      `/internal/user/api-keys?user_id=${encodeURIComponent(session.user.id)}`,
      { method: "GET" },
    );
  } catch (error) {
    console.error("Failed to fetch API keys", { requestId, error });
    return jsonError(
      "UPSTREAM_UNAVAILABLE",
      "Failed to reach API service",
      502,
      requestId,
    );
  }
}

export async function POST(req: Request) {
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

  let body: { name?: unknown };
  try {
    body = (await req.json()) as { name?: unknown };
  } catch {
    return jsonError("INVALID_REQUEST", "Invalid JSON body", 400, requestId);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return jsonError("INVALID_REQUEST", "Missing name", 400, requestId);
  }

  try {
    return await workerInternalFetch(`/internal/user/api-keys`, {
      method: "POST",
      body: JSON.stringify({ user_id: session.user.id, name }),
    });
  } catch (error) {
    console.error("Failed to create API key", { requestId, error });
    return jsonError(
      "UPSTREAM_UNAVAILABLE",
      "Failed to reach API service",
      502,
      requestId,
    );
  }
}
