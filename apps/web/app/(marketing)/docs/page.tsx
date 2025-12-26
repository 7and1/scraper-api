import type { Metadata } from "next";
import { CodeBlock } from "@/components/marketing/code-block";

export const metadata: Metadata = {
  title: "API Documentation | Scraper API",
  description:
    "Learn how to extract data, render JavaScript, and take screenshots with Scraper API.",
};

const curlScrape = `curl -X POST https://api.scraper.dev/api/v1/scrape \\\n  -H \"X-API-Key: sk_your_api_key\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"url\":\"https://example.com\",\"render\":false}'`;

const curlScreenshot = `curl -X POST https://api.scraper.dev/api/v1/screenshot \\\n  -H \"X-API-Key: sk_your_api_key\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"url\":\"https://example.com\",\"full_page\":true,\"format\":\"png\"}' \\\n  --output screenshot.png`;

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight text-gray-900">
          Documentation
        </h1>
        <p className="mt-3 text-gray-600">
          Use <span className="font-mono">/api/v1/scrape</span> for HTML
          extraction and <span className="font-mono">/api/v1/screenshot</span>{" "}
          for screenshots. Authenticate with{" "}
          <span className="font-mono">X-API-Key</span>.
        </p>
      </div>

      <div className="mt-10 grid gap-10">
        <section>
          <h2 className="text-2xl font-semibold text-gray-900">Scrape</h2>
          <p className="mt-2 text-sm text-gray-600">
            Light mode fetches raw HTML. Heavy mode renders JavaScript (SPAs)
            using browser rendering.
          </p>
          <div className="mt-4">
            <CodeBlock code={curlScrape} />
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900">Screenshot</h2>
          <p className="mt-2 text-sm text-gray-600">
            Capture viewport or full page. Supported formats: png, jpeg, webp.
          </p>
          <div className="mt-4">
            <CodeBlock code={curlScreenshot} />
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900">Error format</h2>
          <p className="mt-2 text-sm text-gray-600">
            All errors include a request id for debugging.
          </p>
          <CodeBlock
            className="mt-4"
            code={`{\n  \"success\": false,\n  \"error\": {\n    \"code\": \"SSRF_BLOCKED\",\n    \"message\": \"Access to private IP addresses is not allowed\",\n    \"request_id\": \"req_...\"\n  }\n}`}
          />
        </section>
      </div>
    </div>
  );
}
