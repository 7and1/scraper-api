import { auth } from "@/lib/auth";
import { Card } from "@/components/ui/card";

export default async function ProfileSettingsPage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Profile</h1>
        <p className="mt-1 text-sm text-gray-600">
          Profile settings are managed via GitHub OAuth.
        </p>
      </div>

      <Card>
        <p className="text-sm text-gray-600">
          Name:{" "}
          <span className="font-medium text-gray-900">
            {session?.user?.name || "—"}
          </span>
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Email:{" "}
          <span className="font-medium text-gray-900">
            {session?.user?.email || "—"}
          </span>
        </p>
      </Card>
    </div>
  );
}
