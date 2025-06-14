// src/components/ui/ExplainerText.tsx
"use client";

import { cn } from "@/lib/utils";

interface ExplainerTextProps {
  children: React.ReactNode;
  className?: string;
}

export default function ExplainerText({
  children,
  className,
}: ExplainerTextProps) {
  return (
    <div className={cn("explainer-text text-gray-600 max-w-2xl", className)}>
      {children}
    </div>
  );
}
