# COMPONENTS.md - Component Specifications

**Project**: Scraper API MVP
**Version**: 1.0.0
**Last Updated**: 2025-12-25

---

## 1. Atomic Design System

```
components/
├── ui/                    # Atoms - Base building blocks
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   ├── badge.tsx
│   ├── skeleton.tsx
│   ├── spinner.tsx
│   ├── toast.tsx
│   └── tooltip.tsx
│
├── shared/                # Molecules - Composed components
│   ├── form-field.tsx
│   ├── stat-card.tsx
│   ├── empty-state.tsx
│   ├── error-message.tsx
│   └── copy-button.tsx
│
├── dashboard/             # Organisms - Dashboard features
│   ├── header.tsx
│   ├── nav.tsx
│   ├── usage-stats.tsx
│   ├── api-key-card.tsx
│   ├── quick-actions.tsx
│   └── recent-requests.tsx
│
├── playground/            # Organisms - Playground features
│   ├── form.tsx
│   └── response.tsx
│
└── marketing/             # Organisms - Landing page
    ├── header.tsx
    ├── hero.tsx
    ├── features.tsx
    ├── code-block.tsx
    └── footer.tsx
```

---

## 2. Base UI Components (Atoms)

### Button

```tsx
// components/ui/button.tsx

import { forwardRef } from "react";
import { clsx } from "clsx";
import { Spinner } from "./spinner";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500",
  secondary:
    "bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500",
  outline:
    "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus-visible:ring-gray-500",
  ghost:
    "text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-500",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={clsx(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium",
          "transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? <Spinner size={size === "lg" ? "md" : "sm"} /> : leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  },
);

Button.displayName = "Button";
```

### Input

```tsx
// components/ui/input.tsx

import { forwardRef } from "react";
import { clsx } from "clsx";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, leftAddon, rightAddon, ...props }, ref) => {
    return (
      <div className="relative flex">
        {leftAddon && (
          <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
            {leftAddon}
          </span>
        )}
        <input
          ref={ref}
          className={clsx(
            "block w-full rounded-lg border px-3 py-2 text-sm",
            "placeholder:text-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-offset-0",
            "disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500",
            error
              ? "border-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:border-brand-500 focus:ring-brand-500",
            leftAddon && "rounded-l-none",
            rightAddon && "rounded-r-none",
            className,
          )}
          {...props}
        />
        {rightAddon && (
          <span className="inline-flex items-center rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
            {rightAddon}
          </span>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
```

### Card

```tsx
// components/ui/card.tsx

import { clsx } from "clsx";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  className,
  padding = "md",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-gray-200 bg-white shadow-sm",
        paddingStyles[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("border-b border-gray-200 px-6 py-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={clsx("text-lg font-semibold text-gray-900", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("p-6", className)} {...props}>
      {children}
    </div>
  );
}
```

### Badge

```tsx
// components/ui/badge.tsx

import { clsx } from "clsx";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info";
  size?: "sm" | "md";
}

const variantStyles = {
  default: "bg-gray-100 text-gray-800",
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
};

const sizeStyles = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
};

export function Badge({
  className,
  variant = "default",
  size = "sm",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full font-medium",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
```

### Skeleton

```tsx
// components/ui/skeleton.tsx

import { clsx } from "clsx";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
}

export function Skeleton({
  className,
  variant = "rectangular",
  ...props
}: SkeletonProps) {
  return (
    <div
      className={clsx(
        "animate-pulse bg-gray-200",
        variant === "text" && "h-4 rounded",
        variant === "circular" && "rounded-full",
        variant === "rectangular" && "rounded-lg",
        className,
      )}
      {...props}
    />
  );
}

// Preset skeleton components
export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <Skeleton className="mb-4 h-6 w-1/3" />
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="mb-2 h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-10 w-1/4" />
        </div>
      ))}
    </div>
  );
}
```

### Spinner

```tsx
// components/ui/spinner.tsx

import { clsx } from "clsx";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <svg
      className={clsx("animate-spin", sizeStyles[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
```

---

## 3. Shared Components (Molecules)

### FormField

```tsx
// components/shared/form-field.tsx

import { clsx } from "clsx";
import { Input, type InputProps } from "@/components/ui/input";

interface FormFieldProps extends InputProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export function FormField({
  label,
  error,
  hint,
  required,
  className,
  id,
  ...props
}: FormFieldProps) {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={clsx("space-y-1.5", className)}>
      <label
        htmlFor={fieldId}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <Input id={fieldId} error={!!error} {...props} />
      {hint && !error && <p className="text-sm text-gray-500">{hint}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
```

### StatCard

```tsx
// components/shared/stat-card.tsx

import { clsx } from "clsx";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    trend: "up" | "down" | "neutral";
  };
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  icon,
  className,
}: StatCardProps) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {change && (
            <p
              className={clsx(
                "mt-2 flex items-center text-sm font-medium",
                change.trend === "up" && "text-green-600",
                change.trend === "down" && "text-red-600",
                change.trend === "neutral" && "text-gray-600",
              )}
            >
              {change.trend === "up" && (
                <svg
                  className="mr-1 h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {change.trend === "down" && (
                <svg
                  className="mr-1 h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {change.value}%
            </p>
          )}
        </div>
        {icon && (
          <div className="rounded-lg bg-brand-100 p-3 text-brand-600">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
```

### CopyButton

```tsx
// components/shared/copy-button.tsx

"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Check, Copy } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

interface CopyButtonProps extends Omit<ButtonProps, "onClick"> {
  value: string;
  onCopy?: () => void;
}

export function CopyButton({
  value,
  onCopy,
  className,
  children,
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className={clsx("gap-1.5", className)}
      {...props}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-green-500" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          {children || "Copy"}
        </>
      )}
    </Button>
  );
}
```

### EmptyState

```tsx
// components/shared/empty-state.tsx

import { clsx } from "clsx";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center py-12 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 rounded-full bg-gray-100 p-4 text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-gray-600">{description}</p>
      )}
      {action && (
        <Button className="mt-6" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

---

## 4. Dashboard Components (Organisms)

### DashboardHeader

```tsx
// components/dashboard/header.tsx

import Link from "next/link";
import Image from "next/image";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut, Settings } from "lucide-react";

interface DashboardHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="flex h-16 items-center justify-between px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
            <span className="text-lg font-bold text-white">S</span>
          </div>
          <span className="text-lg font-semibold text-gray-900">
            Scraper API
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            {user.image && (
              <Image
                src={user.image}
                alt={user.name || "User avatar"}
                width={32}
                height={32}
                className="rounded-full"
              />
            )}
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>

          <Link href="/settings">
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <Button variant="ghost" size="sm" type="submit">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
```

### DashboardNav

```tsx
// components/dashboard/nav.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Home, Key, Play, Settings, BarChart2 } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/api-keys", label: "API Keys", icon: Key },
  { href: "/playground", label: "Playground", icon: Play },
  { href: "/usage", label: "Usage", icon: BarChart2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:block">
      <div className="flex h-full flex-col gap-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-700 hover:bg-gray-100",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

### UsageStats

```tsx
// components/dashboard/usage-stats.tsx

"use client";

import { useUsage } from "@/hooks/use-usage";
import { StatCard } from "@/components/shared/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Gauge, Clock } from "lucide-react";

export function UsageStats() {
  const { usage, percentage, isLoading } = useUsage();

  if (isLoading) {
    return (
      <>
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </>
    );
  }

  if (!usage) {
    return null;
  }

  const resetDate = new Date(usage.reset_at);
  const hoursUntilReset = Math.max(
    0,
    Math.ceil((resetDate.getTime() - Date.now()) / (1000 * 60 * 60)),
  );

  return (
    <>
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
        title="Resets In"
        value={`${hoursUntilReset}h`}
        icon={<Clock className="h-5 w-5" />}
      />
    </>
  );
}
```

### ApiKeyCard

```tsx
// components/dashboard/api-key-card.tsx

"use client";

import { useState } from "react";
import { useApiKeys } from "@/hooks/use-api-keys";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/shared/copy-button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Key, Plus, Trash2, Eye, EyeOff } from "lucide-react";

export function ApiKeyCard() {
  const { keys, isLoading, createKey, revokeKey } = useApiKeys();
  const [showFullKey, setShowFullKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    setIsCreating(true);
    try {
      await createKey(newKeyName);
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
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>API Keys</CardTitle>
        <Button size="sm" onClick={() => setIsCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Key
        </Button>
      </CardHeader>
      <CardContent>
        {keys.length === 0 ? (
          <EmptyState
            icon={<Key className="h-8 w-8" />}
            title="No API keys yet"
            description="Create your first API key to start making requests"
            action={{
              label: "Create API Key",
              onClick: () => setIsCreating(true),
            }}
          />
        ) : (
          <div className="space-y-4">
            {keys.map((key) => (
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
                  <CopyButton value={key.key_prefix} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revokeKey(key.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
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
```

### QuickActions

```tsx
// components/dashboard/quick-actions.tsx

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Book, MessageCircle } from "lucide-react";

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Link href="/playground" className="block">
          <Button variant="outline" className="w-full justify-start">
            <Play className="mr-3 h-4 w-4" />
            Test in Playground
          </Button>
        </Link>
        <Link href="/docs" className="block">
          <Button variant="outline" className="w-full justify-start">
            <Book className="mr-3 h-4 w-4" />
            Read Documentation
          </Button>
        </Link>
        <Link href="/support" className="block">
          <Button variant="outline" className="w-full justify-start">
            <MessageCircle className="mr-3 h-4 w-4" />
            Get Support
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
```

### RecentRequests

```tsx
// components/dashboard/recent-requests.tsx

"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Activity } from "lucide-react";

interface Request {
  request_id: string;
  method: string;
  path: string;
  target_url: string;
  status_code: number;
  duration_ms: number;
  created_at: string;
}

export function RecentRequests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient
      .getRecentRequests(10)
      .then((res) => setRequests(res.data || []))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Requests</CardTitle>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <EmptyState
            icon={<Activity className="h-8 w-8" />}
            title="No requests yet"
            description="Make your first API request to see it here"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-3 font-medium text-gray-600">Request ID</th>
                  <th className="pb-3 font-medium text-gray-600">URL</th>
                  <th className="pb-3 font-medium text-gray-600">Status</th>
                  <th className="pb-3 font-medium text-gray-600">Duration</th>
                  <th className="pb-3 font-medium text-gray-600">Time</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.request_id} className="border-b border-gray-100">
                    <td className="py-3 font-mono text-xs text-gray-500">
                      {req.request_id.substring(0, 12)}...
                    </td>
                    <td className="py-3 max-w-xs truncate text-gray-900">
                      {req.target_url}
                    </td>
                    <td className="py-3">
                      <Badge
                        variant={req.status_code < 400 ? "success" : "error"}
                      >
                        {req.status_code}
                      </Badge>
                    </td>
                    <td className="py-3 text-gray-600">{req.duration_ms}ms</td>
                    <td className="py-3 text-gray-500">
                      {new Date(req.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## 5. Playground Components

### PlaygroundForm

```tsx
// components/playground/form.tsx

"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/shared/form-field";
import { Play } from "lucide-react";

interface PlaygroundFormProps {
  onSubmit: (data: { url: string; render: boolean; selector?: string }) => void;
  isLoading: boolean;
}

export function PlaygroundForm({ onSubmit, isLoading }: PlaygroundFormProps) {
  const [url, setUrl] = useState("https://example.com");
  const [render, setRender] = useState(false);
  const [selector, setSelector] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      url,
      render,
      ...(selector && { selector }),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="URL"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="render"
              checked={render}
              onChange={(e) => setRender(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="render" className="text-sm text-gray-700">
              Enable JavaScript rendering (slower)
            </label>
          </div>

          <FormField
            label="CSS Selector (optional)"
            placeholder="article.content, #main, etc."
            value={selector}
            onChange={(e) => setSelector(e.target.value)}
            hint="Extract specific elements from the page"
          />

          <Button type="submit" className="w-full" isLoading={isLoading}>
            <Play className="mr-2 h-4 w-4" />
            Send Request
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

### PlaygroundResponse

```tsx
// components/playground/response.tsx

"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/shared/copy-button";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api-client";

interface PlaygroundResponseProps {
  data: unknown;
  error: ApiError | null;
  isLoading: boolean;
}

export function PlaygroundResponse({
  data,
  error,
  isLoading,
}: PlaygroundResponseProps) {
  const formattedResponse = data
    ? JSON.stringify(data, null, 2)
    : error
      ? JSON.stringify(
          {
            success: false,
            error: {
              code: error.code,
              message: error.message,
              request_id: error.requestId,
            },
          },
          null,
          2,
        )
      : null;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <CardTitle>Response</CardTitle>
          {data && <Badge variant="success">200 OK</Badge>}
          {error && <Badge variant="error">{error.status}</Badge>}
        </div>
        {formattedResponse && <CopyButton value={formattedResponse} />}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : formattedResponse ? (
          <pre className="max-h-96 overflow-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
            <code>{formattedResponse}</code>
          </pre>
        ) : (
          <div className="flex h-64 items-center justify-center text-sm text-gray-500">
            Send a request to see the response
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## 6. Marketing Components

### CodeBlock

```tsx
// components/marketing/code-block.tsx

"use client";

import { CopyButton } from "@/components/shared/copy-button";

interface CodeBlockProps {
  code: string;
  language: string;
  showCopy?: boolean;
}

export function CodeBlock({ code, language, showCopy = true }: CodeBlockProps) {
  return (
    <div className="relative rounded-lg bg-gray-800">
      {showCopy && (
        <div className="absolute right-4 top-4">
          <CopyButton value={code} className="text-gray-400 hover:text-white" />
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-sm text-gray-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}
```

---

## 7. Utility Functions

### lib/utils.ts

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return `${str.slice(0, length)}...`;
}
```

---

## 8. Type Definitions

### types/index.ts

```typescript
export interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface UsageData {
  used: number;
  limit: number;
  remaining: number;
  reset_at: string;
}

export interface ScrapeRequest {
  url: string;
  render?: boolean;
  selector?: string;
  wait_for?: string;
  timeout?: number;
}

export interface ScrapeResponse {
  success: boolean;
  data: {
    content: string;
    title: string;
    url: string;
    timestamp: string;
  };
  meta: {
    request_id: string;
    duration_ms: number;
    render_mode: "light" | "heavy";
  };
}

export interface RequestLog {
  request_id: string;
  method: string;
  path: string;
  target_url: string;
  status_code: number;
  duration_ms: number;
  created_at: string;
}
```

---

## Document Cross-References

- Frontend implementation: [FRONTEND.md](./FRONTEND.md)
- API implementation: [BACKEND.md](./BACKEND.md)
- Design system: Tailwind CSS utilities

---

_Components Version 1.0.0 - Created 2025-12-25_
