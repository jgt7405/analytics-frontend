// src/components/layout/PageLayout.tsx
"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { ReactNode } from "react";

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  isLoading?: boolean;
  error?: Error | null;
  selectedConference?: string;
  availableConferences?: string[];
  onConferenceChange?: (conference: string) => void;
  showConferenceSelector?: boolean;
  children: ReactNode;
  className?: string;
}

export default function PageLayout({
  title,
  subtitle,
  isLoading,
  error,
  selectedConference,
  availableConferences,
  onConferenceChange,
  showConferenceSelector = true,
  children,
  className = "",
}: PageLayoutProps) {
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-700 mb-4">
            {title}
            {subtitle && (
              <span className="text-lg ml-2 text-gray-500">{subtitle}</span>
            )}
          </h1>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-700 mb-4">
            {title}
            {subtitle && (
              <span className="text-lg ml-2 text-gray-500">{subtitle}</span>
            )}
          </h1>
        </div>
        <ErrorMessage message={error.message} />
      </div>
    );
  }

  return (
    <div className={`container mx-auto px-4 py-4 ${className}`}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-700 mb-4">
          {title}
          {subtitle && (
            <span className="text-lg ml-2 text-gray-500">{subtitle}</span>
          )}
        </h1>

        {showConferenceSelector &&
          selectedConference &&
          availableConferences &&
          onConferenceChange && (
            <ConferenceSelector
              conferences={availableConferences}
              selectedConference={selectedConference}
              onChange={onConferenceChange}
            />
          )}
      </div>

      {children}
    </div>
  );
}
