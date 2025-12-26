import Link from "next/link";
import { auth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your profile and account.
        </p>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
        <p className="mt-2 text-sm text-gray-600">
          Signed in as{" "}
          <span className="font-medium">{session?.user?.email}</span>
        </p>
        <div className="mt-4">
          <Link href="/settings/profile">
            <Button variant="outline">Edit profile</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
