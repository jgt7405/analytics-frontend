// src/components/layout/PageHeader.tsx
"use client";

import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string | ReactNode;
  controls?: ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  controls,
}: PageHeaderProps) {
  return (
    <>
      {/* Mobile Layout */}
      <div className="md:hidden">
        <h1 className="text-xl font-normal text-gray-500 mb-4">
          {title}
          {subtitle && (
            <span className="text-base ml-2 text-gray-500">{subtitle}</span>
          )}
        </h1>
        {controls}
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block page-header">
        <h1 className="text-xl font-normal text-gray-500">
          {title}
          {subtitle && (
            <span className="text-base ml-2 text-gray-500">{subtitle}</span>
          )}
        </h1>
        {controls && <div className="conference-selector">{controls}</div>}
      </div>
    </>
  );
}
