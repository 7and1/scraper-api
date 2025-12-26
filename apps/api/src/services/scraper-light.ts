import * as cheerio from "cheerio";
import type { ScrapeResult } from "../types";
import { validateUrl } from "../utils/ssrf";

export interface LightScrapeOptions {
  url: string;
  selector?: string;
  timeout?: number;
}

export async function scrapeLightweight(
  options: LightScrapeOptions,
): Promise<ScrapeResult> {
  const { url, selector, timeout = 30000 } = options;

  const validation = validateUrl(url);
  if (!validation.valid) {
    throw new Error(`SSRF_BLOCKED: ${validation.error}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(validation.normalizedUrl!, {
      method: "GET",
      headers: {
        "User-Agent": "ScraperAPI/1.0 (+https://scraper.dev)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `SCRAPE_FAILED: HTTP ${response.status} ${response.statusText}`,
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    $("script").remove();
    $("style").remove();

    let content: string;
    if (selector) {
      const selected = $(selector);
      if (selected.length === 0) {
        throw new Error(`SELECTOR_NOT_FOUND: No elements match "${selector}"`);
      }
      content = selected.html() || selected.text();
    } else {
      content = $("body").html() || html;
    }

    const title = $("title").text() || $("h1").first().text() || "";

    return {
      content: content.trim(),
      title: title.trim(),
      url: validation.normalizedUrl!,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("SCRAPE_TIMEOUT: Request timed out");
    }
    throw error instanceof Error
      ? error
      : new Error("SCRAPE_FAILED: Unknown error");
  } finally {
    clearTimeout(timeoutId);
  }
}
