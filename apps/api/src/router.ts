import { Hono } from "hono";
import type { Env, Variables } from "./types";

import { corsMiddleware } from "./middleware/cors";
import { errorHandler } from "./middleware/error-handler";
import { internalAuthMiddleware } from "./middleware/internal-auth";
import { apiKeyAuthMiddleware } from "./middleware/auth";
import { rateLimitMiddleware } from "./middleware/rate-limit";
import { requestIdMiddleware } from "./middleware/request-id";

import { healthHandler } from "./handlers/health";
import { scrapeHandler } from "./handlers/scrape";
import { screenshotHandler } from "./handlers/screenshot";
import { getUserUsage } from "./handlers/user";
import {
  internalCreateApiKey,
  internalGetApiKeys,
  internalGetRequestLogs,
  internalGetUserUsage,
  internalRevokeApiKey,
  syncUser,
} from "./handlers/internal";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use("*", requestIdMiddleware);
app.use("*", errorHandler);
app.use("*", corsMiddleware);

app.get("/health", healthHandler);

const apiV1 = new Hono<{ Bindings: Env; Variables: Variables }>();
apiV1.use("*", apiKeyAuthMiddleware);
apiV1.post("/scrape", rateLimitMiddleware, scrapeHandler);
apiV1.post("/screenshot", rateLimitMiddleware, screenshotHandler);
apiV1.get("/user/usage", getUserUsage);
app.route("/api/v1", apiV1);

const internal = new Hono<{ Bindings: Env; Variables: Variables }>();
internal.use("*", internalAuthMiddleware);
internal.post("/auth/sync", syncUser);
internal.get("/user/api-keys", internalGetApiKeys);
internal.post("/user/api-keys", internalCreateApiKey);
internal.delete("/user/api-keys/:id", internalRevokeApiKey);
internal.get("/user/requests", internalGetRequestLogs);
internal.get("/user/usage", internalGetUserUsage);
app.route("/internal", internal);

app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `Endpoint ${c.req.method} ${c.req.path} not found`,
        request_id: c.get("requestId"),
      },
    },
    404,
  );
});

export default app;
