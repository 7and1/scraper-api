import { z } from "zod";
import { MAX_TIMEOUT_MS, MIN_TIMEOUT_MS } from "./constants";

export const scrapeRequestSchema = z.object({
  url: z.string().url("Invalid URL format"),
  render: z.boolean().default(false),
  selector: z.string().optional(),
  wait_for: z.string().optional(),
  timeout: z
    .number()
    .min(MIN_TIMEOUT_MS)
    .max(MAX_TIMEOUT_MS)
    .default(MAX_TIMEOUT_MS),
});

export const screenshotRequestSchema = z.object({
  url: z.string().url("Invalid URL format"),
  width: z.number().min(320).max(1920).default(1280),
  height: z.number().min(240).max(1080).default(720),
  full_page: z.boolean().default(false),
  format: z.enum(["png", "jpeg", "webp"]).default("png"),
  timeout: z
    .number()
    .min(MIN_TIMEOUT_MS)
    .max(MAX_TIMEOUT_MS)
    .default(MAX_TIMEOUT_MS),
});
