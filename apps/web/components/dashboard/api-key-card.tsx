"use client";

import { useMemo, useState } from "react";
import { useApiKeys } from "@/hooks/use-api-keys";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyButton } from "@/components/shared/copy-button";
import { EmptyState } from "@/components/shared/empty-state";
import { Key, Plus, Trash2 } from "lucide-react";

export function ApiKeyCard() {
  const { keys, isLoading, createKey, revokeKey } = useApiKeys();
  const [newKeyName, setNewKeyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<{
    name: string;
    key: string;
  } | null>(null);

  const sortedKeys = useMemo(() => {
    return [...keys].sort((a, b) => a.name.localeCompare(b.name));
  }, [keys]);

  const handleCreateKey = async () => {
    const name = newKeyName.trim();
    if (!name) return;
    setIsCreating(true);
    try {
      const created = await createKey(name);
      if (created?.key) {
        setCreatedKey({ name: created.name, key: created.key });
      }
      setNewKeyName("");
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>API Keys</CardTitle>
        <Button
          size="sm"
          variant="outline"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={handleCreateKey}
          isLoading={isCreating}
        >
          New Key
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex-1">
            <Input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g., Production)"
            />
          </div>
          <Button
            type="button"
            onClick={handleCreateKey}
            isLoading={isCreating}
            leftIcon={<Key className="h-4 w-4" />}
          >
            Create
          </Button>
        </div>

        {createdKey ? (
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  New key created: {createdKey.name}
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  Copy this key now — it will only be shown once.
                </p>
                <p className="mt-3 break-all rounded-lg bg-white p-3 font-mono text-xs text-gray-900">
                  {createdKey.key}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <CopyButton value={createdKey.key} />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCreatedKey(null)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {sortedKeys.length === 0 ? (
          <EmptyState
            icon={<Key className="h-6 w-6" />}
            title="No API keys yet"
            description="Create your first API key to start making requests."
            action={{ label: "Create API Key", onClick: handleCreateKey }}
          />
        ) : (
          <div className="space-y-3">
            {sortedKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                    <Key className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{key.name}</p>
                    <p className="font-mono text-sm text-gray-500">
                      {key.key_prefix}...
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CopyButton value={key.key_prefix} label="Copy prefix" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revokeKey(key.id)}
                    leftIcon={<Trash2 className="h-4 w-4 text-red-500" />}
                  >
                    Revoke
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
