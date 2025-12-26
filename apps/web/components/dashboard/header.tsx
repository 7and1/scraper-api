import Image from "next/image";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function DashboardHeader({
  user,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
}) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div>
          <p className="text-sm text-gray-500">Scraper API</p>
          <p className="text-lg font-semibold text-gray-900">Dashboard</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right md:block">
            <p className="text-sm font-medium text-gray-900">
              {user.name || user.email || "Developer"}
            </p>
            {user.email ? (
              <p className="text-xs text-gray-500">{user.email}</p>
            ) : null}
          </div>

          {user.image ? (
            <Image
              src={user.image}
              alt={user.name || "User avatar"}
              width={36}
              height={36}
              className="h-9 w-9 rounded-full border border-gray-200"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-gray-100" />
          )}

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
