import { UsageStats } from "@/components/dashboard/usage-stats";
import { ApiKeyCard } from "@/components/dashboard/api-key-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentRequests } from "@/components/dashboard/recent-requests";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Overview</h1>
        <p className="mt-1 text-sm text-gray-600">
          Monitor usage, manage keys, and test requests.
        </p>
      </div>

      <UsageStats />

      <div className="grid gap-6 lg:grid-cols-2">
        <ApiKeyCard />
        <QuickActions />
      </div>

      <RecentRequests />
    </div>
  );
}
