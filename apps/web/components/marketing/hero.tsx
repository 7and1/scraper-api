import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/marketing/code-block";

const curlExample = `curl -X POST https://api.scraper.dev/api/v1/scrape \\\n  -H \"X-API-Key: sk_your_api_key\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"url\": \"https://example.com\", \"render\": false}'`;

export function Hero() {
  return (
    <section className="bg-gradient-to-b from-white to-gray-50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900 md:text-5xl">
            Web Scraping Made Simple
          </h1>
          <p className="mt-4 text-lg leading-8 text-gray-600">
            Extract data from any website with a single API call. Light scraping
            for static HTML, heavy scraping for JavaScript-rendered pages, plus
            screenshots.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login">
              <Button size="lg">Start Free</Button>
            </Link>
            <Link href="/docs">
              <Button size="lg" variant="outline">
                View Documentation
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-sm text-gray-500">
            Free tier includes 100 requests/day. No credit card required.
          </p>
        </div>

        <div>
          <CodeBlock code={curlExample} />
          <div className="mt-3 text-xs text-gray-500">
            Tip: set <span className="font-mono">render: true</span> to enable
            JavaScript rendering.
          </div>
        </div>
      </div>
    </section>
  );
}
