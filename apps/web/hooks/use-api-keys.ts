"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, apiClient } from "@/lib/api-client";

interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
}

export function useApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getApiKeys();
      setKeys(response.data || []);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err
          : new ApiError("Failed to fetch API keys", "FETCH_ERROR", 500),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createKey = useCallback(
    async (name: string) => {
      const response = await apiClient.createApiKey(name);
      await fetchKeys();
      return response.data;
    },
    [fetchKeys],
  );

  const revokeKey = useCallback(async (id: string) => {
    await apiClient.revokeApiKey(id);
    setKeys((prev) => prev.filter((k) => k.id !== id));
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  return { keys, isLoading, error, createKey, revokeKey, refresh: fetchKeys };
}
