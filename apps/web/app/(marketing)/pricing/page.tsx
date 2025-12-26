import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing - Free Tier & Pro Plans | Scraper API",
  description:
    "Start free with 100 requests/day. Upgrade when you need more. Simple pricing with no hidden fees.",
};

const tiers = [
  {
    name: "Free",
    price: "$0",
    subtitle: "For prototypes and small projects",
    features: [
      "100 requests/day",
      "Light + heavy scraping",
      "Screenshots",
      "SSRF protection",
    ],
    cta: { label: "Start Free", href: "/login" },
  },
  {
    name: "Pro",
    price: "$15",
    subtitle: "For production workloads",
    features: [
      "Higher quotas",
      "Priority support",
      "Improved concurrency",
      "Custom allowlists (optional)",
    ],
    cta: { label: "Contact", href: "/support" },
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight text-gray-900">
          Pricing
        </h1>
        <p className="mt-3 text-gray-600">
          Start free. Upgrade when your usage grows. Built for developers and
          shipped with security-first defaults.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {tiers.map((tier) => (
          <Card key={tier.name} padding="lg" className="relative">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-sm font-semibold text-brand-700">
                  {tier.name}
                </p>
                <p className="mt-1 text-sm text-gray-600">{tier.subtitle}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-semibold text-gray-900">
                  {tier.price}
                </p>
                <p className="text-sm text-gray-500">
                  {tier.name === "Pro" ? "per month" : "forever"}
                </p>
              </div>
            </div>

            <ul className="mt-6 space-y-3 text-sm text-gray-700">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-brand-700" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <Link href={tier.cta.href}>
                <Button
                  size="lg"
                  variant={tier.name === "Free" ? "primary" : "outline"}
                >
                  {tier.cta.label}
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
