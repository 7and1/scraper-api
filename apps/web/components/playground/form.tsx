"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import { useScrape } from "@/hooks/use-scrape";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { CopyButton } from "@/components/shared/copy-button";
import { ErrorMessage } from "@/components/shared/error-message";

export function PlaygroundForm() {
  const [apiKey, setApiKey] = useState("");
  const [url, setUrl] = useState("https://example.com");
  const [render, setRender] = useState(false);
  const [selector, setSelector] = useState("");
  const [waitFor, setWaitFor] = useState("");
  const [timeout, setTimeoutMs] = useState(30000);

  const [shotUrl, setShotUrl] = useState<string | null>(null);
  const [shotError, setShotError] = useState<ApiError | null>(null);
  const [isShotLoading, setIsShotLoading] = useState(false);

  const { scrape, data, error, isLoading, reset } = useScrape();

  useEffect(() => {
    if (apiKey.trim()) apiClient.setApiKey(apiKey.trim());
    else apiClient.clearApiKey();
  }, [apiKey]);

  useEffect(() => {
    return () => {
      if (shotUrl) URL.revokeObjectURL(shotUrl);
    };
  }, [shotUrl]);

  const onScrape = async () => {
    reset();
    setShotError(null);
    if (shotUrl) {
      URL.revokeObjectURL(shotUrl);
      setShotUrl(null);
    }

    await scrape({
      url,
      render,
      selector: selector.trim() || undefined,
      wait_for: waitFor.trim() || undefined,
      timeout: timeout,
    });
  };

  const onScreenshot = async () => {
    setShotError(null);
    setIsShotLoading(true);
    if (shotUrl) {
      URL.revokeObjectURL(shotUrl);
      setShotUrl(null);
    }

    try {
      const blob = await apiClient.screenshot({
        url,
        full_page: true,
        format: "png",
        timeout,
      });
      const objectUrl = URL.createObjectURL(blob);
      setShotUrl(objectUrl);
    } catch (err) {
      setShotError(
        err instanceof ApiError
          ? err
          : new ApiError("Screenshot failed", "SCREENSHOT_FAILED", 500),
      );
    } finally {
      setIsShotLoading(false);
    }
  };

  const prettyJson = useMemo(() => {
    if (!data) return "";
    return JSON.stringify(data, null, 2);
  }, [data]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Request</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="API Key" hint="Used for scrape/screenshot requests">
            <Input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk_..."
              autoComplete="off"
            />
          </FormField>

          <FormField label="URL">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </FormField>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Render JavaScript
              </p>
              <p className="text-xs text-gray-500">
                Enable heavy mode for SPAs and dynamic sites.
              </p>
            </div>
            <input
              type="checkbox"
              checked={render}
              onChange={(e) => setRender(e.target.checked)}
              className="h-4 w-4 accent-brand-600"
            />
          </div>

          <FormField
            label="Selector (optional)"
            hint="Extract a specific element"
          >
            <Input
              value={selector}
              onChange={(e) => setSelector(e.target.value)}
              placeholder="article.content"
            />
          </FormField>

          <FormField label="Wait for (optional)" hint="render=true only">
            <Input
              value={waitFor}
              onChange={(e) => setWaitFor(e.target.value)}
              placeholder="#dynamic-content"
            />
          </FormField>

          <FormField label="Timeout (ms)">
            <Input
              type="number"
              min={1000}
              max={30000}
              value={timeout}
              onChange={(e) => setTimeoutMs(Number(e.target.value))}
            />
          </FormField>

          <div className="flex flex-wrap gap-3">
            <Button onClick={onScrape} isLoading={isLoading}>
              Run Scrape
            </Button>
            <Button
              onClick={onScreenshot}
              isLoading={isShotLoading}
              variant="outline"
            >
              Take Screenshot
            </Button>
          </div>

          {error || shotError ? (
            <ErrorMessage
              title="Request failed"
              message={`${(error || shotError)?.message} (${(error || shotError)?.code})`}
            />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Response</CardTitle>
          {prettyJson ? <CopyButton value={prettyJson} /> : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {data ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                <p className="font-medium text-gray-900">
                  {data.title || "Untitled"}
                </p>
                <p className="mt-1 text-xs text-gray-600">{data.url}</p>
                <p className="mt-1 text-xs text-gray-600">{data.timestamp}</p>
              </div>
              <pre className="max-h-[420px] overflow-auto rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-900">
                <code className="font-mono">{prettyJson}</code>
              </pre>
            </div>
          ) : shotUrl ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Screenshot preview:</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shotUrl}
                alt="Screenshot preview"
                className="max-h-[480px] w-full rounded-xl border border-gray-200 object-contain bg-white"
              />
              <a
                href={shotUrl}
                download="screenshot.png"
                className="text-sm font-medium text-brand-700 hover:text-brand-800"
              >
                Download screenshot
              </a>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              Run a request to see the response here.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
