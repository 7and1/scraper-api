import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-3">
        <div>
          <p className="font-semibold text-gray-900">Scraper API</p>
          <p className="mt-2 text-sm text-gray-600">
            Edge-powered web scraping API with SSRF protection, quotas, and
            JavaScript rendering.
          </p>
        </div>

        <div className="text-sm">
          <p className="font-medium text-gray-900">Product</p>
          <ul className="mt-2 space-y-2 text-gray-600">
            <li>
              <Link className="hover:text-gray-900" href="/pricing">
                Pricing
              </Link>
            </li>
            <li>
              <Link className="hover:text-gray-900" href="/docs">
                Documentation
              </Link>
            </li>
            <li>
              <Link className="hover:text-gray-900" href="/support">
                Support
              </Link>
            </li>
          </ul>
        </div>

        <div className="text-sm">
          <p className="font-medium text-gray-900">Legal</p>
          <ul className="mt-2 space-y-2 text-gray-600">
            <li>
              <Link className="hover:text-gray-900" href="/terms">
                Terms
              </Link>
            </li>
            <li>
              <Link className="hover:text-gray-900" href="/privacy">
                Privacy
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Scraper API. All rights reserved.</p>
          <p>Built on Cloudflare Workers + D1.</p>
        </div>
      </div>
    </footer>
  );
}
