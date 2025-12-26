import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export async function MarketingHeader() {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  return (
    <header className="border-b border-gray-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-gray-900"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            S
          </span>
          Scraper API
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-gray-600 md:flex">
          <Link className="hover:text-gray-900" href="/pricing">
            Pricing
          </Link>
          <Link className="hover:text-gray-900" href="/docs">
            Docs
          </Link>
          <Link className="hover:text-gray-900" href="/support">
            Support
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <Link href="/dashboard">
              <Button variant="secondary" size="sm">
                Dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button variant="secondary" size="sm">
                Login
              </Button>
            </Link>
          )}
          <Link href={isLoggedIn ? "/playground" : "/login"}>
            <Button size="sm">Start Free</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
