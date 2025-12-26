import { cn } from "@/lib/utils";

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles: Record<NonNullable<SpinnerProps["size"]>, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <div
      aria-label="Loading"
      role="status"
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-current border-t-transparent",
        sizeStyles[size],
        className,
      )}
    />
  );
}
