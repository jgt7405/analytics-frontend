// src/components/layout/PageLayoutWrapper.tsx
"use client";

import { ReactNode } from "react";

interface PageLayoutWrapperProps {
  title: string;
  subtitle?: string;
  conferenceSelector?: ReactNode;
  isLoading: boolean;
  children: ReactNode;
}

export default function PageLayoutWrapper({
  title,
  subtitle,
  conferenceSelector,
  isLoading,
  children,
}: PageLayoutWrapperProps) {
  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      {/* ✅ Always render header structure - even during loading */}
      <div className="mb-6 page-header">
        {isLoading ? (
          <>
            <div className="h-6 w-80 bg-gray-300 animate-pulse rounded mb-4" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
              <div className="h-10 w-48 bg-gray-200 animate-pulse rounded" />
            </div>
          </>
        ) : (
          <>
            <h1 className="text-xl font-normal text-gray-500 mb-4">
              {title}
              {subtitle && (
                <span className="text-base ml-2 text-gray-500">{subtitle}</span>
              )}
            </h1>
            {conferenceSelector && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                {conferenceSelector}
              </div>
            )}
          </>
        )}
      </div>
      {children}
    </div>
  );
}
