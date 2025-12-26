import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Scraper API",
  description: "Privacy policy for Scraper API.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
        Privacy Policy
      </h1>
      <p className="mt-4 text-sm text-gray-600">
        We collect the minimum data required to operate the service (e.g.,
        GitHub OAuth profile data and usage metrics). We do not sell personal
        information. Contact support for questions or deletion requests.
      </p>
    </div>
  );
}
