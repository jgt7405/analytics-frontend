// src/components/layout/PageLayoutWrapper.tsx
"use client";

import { ReactNode } from "react";
import Footer from "./Footer";

interface PageLayoutWrapperProps {
  title: string;
  subtitle?: string;
  conferenceSelector?: ReactNode;
  rightElement?: ReactNode;
  isLoading: boolean;
  children: ReactNode;
  /**
   * Hides the page-level gray title. Use when the page's own content
   * already has an equivalent bold title, so the two don't stack (the
   * title is still passed for the screenshot/share header text - this
   * only suppresses the on-page heading).
   */
  hideTitle?: boolean;
}

export default function PageLayoutWrapper({
  title,
  subtitle,
  conferenceSelector,
  rightElement,
  isLoading,
  children,
  hideTitle = false,
}: PageLayoutWrapperProps) {
  return (
    <>
      <div className="container mx-auto px-4 py-6 md:py-8">
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
              {hideTitle ? (
                rightElement && (
                  <div className="flex justify-end items-baseline mb-4">
                    <div className="text-sm text-gray-600 dark:text-gray-300">{rightElement}</div>
                  </div>
                )
              ) : (
                <div className="flex justify-between items-baseline mb-4">
                  <h1 className="text-xl font-normal text-gray-500 dark:text-gray-200">
                    {title}
                    {subtitle && (
                      <span className="text-base ml-2 text-gray-500 dark:text-gray-300">
                        {subtitle}
                      </span>
                    )}
                  </h1>
                  {rightElement && (
                    <div className="text-sm text-gray-600 dark:text-gray-300">{rightElement}</div>
                  )}
                </div>
              )}
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
      <Footer />
    </>
  );
}
