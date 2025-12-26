import { forwardRef } from "react";
import type React from "react";
import { cn } from "@/lib/utils";

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
          className={cn(
            "block w-full rounded-lg border px-3 py-2 text-sm",
            "placeholder:text-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-offset-0",
            "disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500",
            error
              ? "border-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:border-brand-500 focus:ring-brand-500",
            leftAddon ? "rounded-l-none" : undefined,
            rightAddon ? "rounded-r-none" : undefined,
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
