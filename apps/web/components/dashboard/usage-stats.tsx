"use client";
import { useUsage } from "@/hooks/use-usage";
import { StatCard } from "@/components/shared/stat-card";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Clock, Gauge } from "lucide-react";

export function UsageStats() {
  const { usage, percentage, isLoading } = useUsage();
  const resetAtLabel = usage?.reset_at
    ? new Date(usage.reset_at).toLocaleString(undefined, {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }

  if (!usage) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Requests Today"
          value={usage.used}
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          title="Quota Remaining"
          value={usage.remaining}
          icon={<Gauge className="h-5 w-5" />}
        />
        <StatCard
          title="Resets At"
          value={resetAtLabel}
          icon={<Clock className="h-5 w-5" />}
        />
      </div>

      <Card padding="md">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">Daily usage</p>
          <p className="text-sm text-gray-600">
            {usage.used}/{usage.limit}
          </p>
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-gray-100">
          <div
            className="h-2 rounded-full bg-brand-600"
            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
          />
        </div>
      </Card>
    </div>
  );
}
