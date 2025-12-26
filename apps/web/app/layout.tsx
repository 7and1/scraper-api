import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title:
    "Scraper API - Web Scraping Made Simple | Extract Data from Any Website",
  description:
    "Extract data from any website with a simple API call. Light and heavy scraping, JavaScript rendering, screenshots. Start free with 100 requests/day.",
  keywords: [
    "web scraping api",
    "data extraction",
    "puppeteer as a service",
    "headless browser api",
    "website scraper",
    "html parser api",
    "javascript rendering",
    "screenshot api",
    "cloudflare workers",
  ],
  applicationName: "Scraper API",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Scraper API",
    title: "Scraper API - Web Scraping Made Simple",
    description:
      "Extract data from any website with a simple API call. No infrastructure needed.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Scraper API - Web Scraping Made Simple",
    description: "Extract data from any website with a simple API call.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
