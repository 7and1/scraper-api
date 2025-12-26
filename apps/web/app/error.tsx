"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold text-gray-900">
        Something went wrong
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        Please try again. If this persists, contact support.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => reset()} variant="primary">
          Retry
        </Button>
        <Link href="/">
          <Button variant="outline">Home</Button>
        </Link>
      </div>
      {error?.digest ? (
        <p className="mt-6 text-xs text-gray-500">Digest: {error.digest}</p>
      ) : null}
    </div>
  );
}
