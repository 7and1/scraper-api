import { ApiKeyCard } from "@/components/dashboard/api-key-card";

export default function ApiKeysPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">API Keys</h1>
        <p className="mt-1 text-sm text-gray-600">
          Create and revoke keys. Keys are only displayed once at creation.
        </p>
      </div>
      <ApiKeyCard />
    </div>
  );
}
