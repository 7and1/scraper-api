import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";

export const metadata: Metadata = {
  title: "Login | Scraper API",
};

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="mt-2 text-sm text-gray-600">
          Sign in to access your dashboard
        </p>
      </div>

      <div className="mt-8">
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/dashboard" });
          }}
        >
          <Button
            type="submit"
            className="w-full"
            size="lg"
            leftIcon={<Github className="h-5 w-5" />}
          >
            Continue with GitHub
          </Button>
        </form>
      </div>

      <p className="mt-8 text-center text-sm text-gray-500">
        By signing in, you agree to our{" "}
        <Link href="/terms" className="text-brand-700 hover:text-brand-800">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-brand-700 hover:text-brand-800">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
