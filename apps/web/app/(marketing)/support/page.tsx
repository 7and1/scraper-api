import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Support | Scraper API",
  description: "Get help with Scraper API.",
};

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
        Support
      </h1>
      <p className="mt-3 text-sm text-gray-600">
        For help, include your <span className="font-mono">request_id</span>{" "}
        from the API response when reporting issues.
      </p>

      <div className="mt-8 grid gap-4">
        <Card>
          <h2 className="text-lg font-semibold text-gray-900">
            Need assistance?
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Email us or open an issue in your deployment repository. Provide
            endpoint, timestamp, and request id.
          </p>
          <p className="mt-3 text-sm text-gray-600">
            Start by reading{" "}
            <Link className="text-brand-700 hover:text-brand-800" href="/docs">
              the docs
            </Link>
            .
          </p>
        </Card>
      </div>
    </div>
  );
}
