"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, apiClient } from "@/lib/api-client";

interface UsageData {
  used: number;
  limit: number;
  remaining: number;
  reset_at: string;
}

export function useUsage() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchUsage = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getUsage();
      setUsage(response.data || null);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err
          : new ApiError("Failed to fetch usage", "FETCH_ERROR", 500),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage();
    const interval = setInterval(fetchUsage, 30000);
    return () => clearInterval(interval);
  }, [fetchUsage]);

  const percentage = useMemo(() => {
    if (!usage) return 0;
    if (usage.limit <= 0) return 0;
    return (usage.used / usage.limit) * 100;
  }, [usage]);

  return { usage, percentage, isLoading, error, refresh: fetchUsage };
}
