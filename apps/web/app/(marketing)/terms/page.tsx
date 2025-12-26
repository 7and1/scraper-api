import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Scraper API",
  description: "Terms of service for Scraper API.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
        Terms of Service
      </h1>
      <p className="mt-4 text-sm text-gray-600">
        You are responsible for complying with websites’ terms and applicable
        laws when scraping. Do not use the service for abuse, credential
        stuffing, or unlawful activity. We may suspend accounts that violate
        these terms.
      </p>
    </div>
  );
}
