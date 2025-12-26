"use client";

import { useCallback, useState } from "react";
import { ApiError, apiClient } from "@/lib/api-client";

export interface ScrapeParams {
  url: string;
  render?: boolean;
  selector?: string;
  wait_for?: string;
  timeout?: number;
}

export interface ScrapeResult {
  content: string;
  title: string;
  url: string;
  timestamp: string;
}

export function useScrape() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [data, setData] = useState<ScrapeResult | null>(null);

  const scrape = useCallback(async (params: ScrapeParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.scrape(params);
      setData(response.data || null);
      return response;
    } catch (err) {
      const apiError =
        err instanceof ApiError
          ? err
          : new ApiError("An unexpected error occurred", "UNKNOWN_ERROR", 500);
      setError(apiError);
      throw apiError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { scrape, reset, data, isLoading, error };
}
