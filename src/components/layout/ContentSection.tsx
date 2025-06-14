// src/components/layout/ContentSection.tsx
"use client";

import { ReactNode } from "react";

interface ContentSectionProps {
  children: ReactNode;
  actions: ReactNode;
  explainer?: ReactNode;
}

export default function ContentSection({
  children,
  actions,
  explainer,
}: ContentSectionProps) {
  return (
    <div className="mb-8">
      {children}
      {(explainer || actions) && (
        <div className="flex justify-between items-start mt-4 gap-4">
          {explainer && <div className="flex-1">{explainer}</div>}
          <div className="flex-shrink-0">{actions}</div>
        </div>
      )}
    </div>
  );
}
