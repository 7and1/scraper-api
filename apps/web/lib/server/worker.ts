import "server-only";

export function getWorkerApiUrl(): string {
  return (
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8787"
  );
}

export function getInternalSecret(): string {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    throw new Error("INTERNAL_API_SECRET is required");
  }
  return secret;
}

export async function workerInternalFetch(
  path: string,
  init: RequestInit,
): Promise<Response> {
  const apiUrl = getWorkerApiUrl();
  const secret = getInternalSecret();
  const headers = new Headers(init.headers);
  headers.set("X-Internal-Secret", secret);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${apiUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}
