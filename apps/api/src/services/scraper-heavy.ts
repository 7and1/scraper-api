import puppeteer from "@cloudflare/puppeteer";
import type { ScrapeResult } from "../types";
import { validateUrl } from "../utils/ssrf";

export interface HeavyScrapeOptions {
  url: string;
  selector?: string;
  wait_for?: string;
  timeout?: number;
}

export async function scrapeHeavyweight(
  browser: Fetcher,
  options: HeavyScrapeOptions,
): Promise<ScrapeResult> {
  const { url, selector, wait_for, timeout = 30000 } = options;

  const validation = validateUrl(url);
  if (!validation.valid) {
    throw new Error(`SSRF_BLOCKED: ${validation.error}`);
  }

  const browserInstance = await puppeteer.launch(browser);
  try {
    const page = await browserInstance.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent("ScraperAPI/1.0 (+https://scraper.dev)");

    await page.goto(validation.normalizedUrl!, {
      waitUntil: "networkidle0",
      timeout,
    });

    if (wait_for) {
      await page.waitForSelector(wait_for, {
        timeout: Math.floor(timeout / 2),
      });
    }

    let content: string;
    if (selector) {
      const element = await page.$(selector);
      if (!element) {
        throw new Error(`SELECTOR_NOT_FOUND: No elements match "${selector}"`);
      }
      content = await page.evaluate(
        (el) => (el as HTMLElement).innerHTML,
        element,
      );
    } else {
      content = await page.content();
    }

    const title = await page.title();

    return {
      content: content.trim(),
      title: title.trim(),
      url: validation.normalizedUrl!,
      timestamp: new Date().toISOString(),
    };
  } finally {
    await browserInstance.close();
  }
}

export async function takeScreenshot(
  browser: Fetcher,
  options: {
    url: string;
    width?: number;
    height?: number;
    full_page?: boolean;
    format?: "png" | "jpeg" | "webp";
    timeout?: number;
  },
): Promise<ArrayBuffer> {
  const {
    url,
    width = 1280,
    height = 720,
    full_page = false,
    format = "png",
    timeout = 30000,
  } = options;

  const validation = validateUrl(url);
  if (!validation.valid) {
    throw new Error(`SSRF_BLOCKED: ${validation.error}`);
  }

  const browserInstance = await puppeteer.launch(browser);
  try {
    const page = await browserInstance.newPage();
    await page.setViewport({ width, height });
    await page.setUserAgent("ScraperAPI/1.0 (+https://scraper.dev)");

    await page.goto(validation.normalizedUrl!, {
      waitUntil: "networkidle0",
      timeout,
    });

    const screenshot = (await page.screenshot({
      type: format,
      fullPage: full_page,
      ...(format === "jpeg" && { quality: 85 }),
    })) as Uint8Array;

    const copy = new Uint8Array(screenshot.byteLength);
    copy.set(screenshot);
    return copy.buffer;
  } finally {
    await browserInstance.close();
  }
}
