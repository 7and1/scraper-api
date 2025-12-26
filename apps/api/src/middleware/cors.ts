import { cors } from "hono/cors";

const allowedOrigins = [
  "https://scraper.dev",
  "https://www.scraper.dev",
  "http://localhost:3000",
];

export const corsMiddleware = cors({
  origin: (origin) => {
    if (!origin) return allowedOrigins[0];
    return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  },
  allowMethods: ["GET", "POST", "OPTIONS", "DELETE"],
  allowHeaders: ["Content-Type", "X-API-Key", "Authorization", "Cookie"],
  exposeHeaders: [
    "X-Request-ID",
    "X-RateLimit-Limit",
    "X-RateLimit-Remaining",
    "X-RateLimit-Reset",
  ],
  maxAge: 86400,
  credentials: true,
});
