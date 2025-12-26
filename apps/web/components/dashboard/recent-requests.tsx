"use client";

import { useEffect, useState } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

interface RequestRow {
  request_id: string;
  method: string;
  path: string;
  target_url: string | null;
  status_code: number | null;
  duration_ms: number | null;
  created_at: string;
}

export function RecentRequests() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    apiClient
      .getRecentRequests(10)
      .then((res) => setRequests(res.data || []))
      .catch((e) => setError(e instanceof ApiError ? e : null))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Requests</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24" />
        ) : error ? (
          <div className="text-sm text-gray-600">Failed to load requests.</div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<Activity className="h-6 w-6" />}
            title="No requests yet"
            description="Try the playground to generate your first request."
          />
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div
                key={r.request_id}
                className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        r.status_code && r.status_code < 400
                          ? "success"
                          : "danger"
                      }
                    >
                      {r.status_code ?? "—"}
                    </Badge>
                    <p className="text-sm font-medium text-gray-900">
                      <span className="font-mono">{r.method}</span> {r.path}
                    </p>
                  </div>
                  {r.target_url ? (
                    <p className="mt-1 truncate text-xs text-gray-500">
                      {r.target_url}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-gray-500">
                    {new Date(r.created_at).toLocaleString()} •{" "}
                    {r.duration_ms ?? "—"} ms • {r.request_id}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
