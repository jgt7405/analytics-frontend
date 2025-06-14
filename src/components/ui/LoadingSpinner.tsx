// src/components/ui/LoadingSpinner.tsx
"use client";

import { typography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  message?: string;
}

export default function LoadingSpinner({
  size = "md",
  message,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div
        className={cn(
          "animate-spin rounded-full border-b-2 border-blue-600",
          sizeClasses[size]
        )}
      />
      {message && <p className={cn(typography.caption, "mt-4")}>{message}</p>}
    </div>
  );
}

export { LoadingSpinner };
