import type { Metadata } from "next";
import { Features } from "@/components/marketing/features";
import { Hero } from "@/components/marketing/hero";

export const metadata: Metadata = {
  title: "Scraper API - Web Scraping Made Simple",
  description:
    "Extract data from any website with a simple API call. Light and heavy scraping, JavaScript rendering, screenshots. Start free with 100 requests/day.",
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
    </>
  );
}
