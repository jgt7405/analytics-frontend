// src/app/football/bowlpicks/page.tsx
"use client";

import BowlPicksTable from "@/components/features/football/BowlPicksTable";
import BowlScoreboard from "@/components/features/football/BowlScoreboard";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useEffect, useState } from "react";

interface TabType {
  id: "scoreboard" | "games";
  label: string;
}

const TABS: TabType[] = [
  { id: "scoreboard", label: "Scoreboard" },
  { id: "games", label: "Games" },
];

export default function BowlPicksPage() {
  const [activeTab, setActiveTab] = useState<"scoreboard" | "games">(
    "scoreboard"
  );
  const [isClient, setIsClient] = useState(false);

  // Ensure component only renders on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <LoadingSpinner />;
  }

  return (
    <PageLayoutWrapper title="Bowl Picks" isLoading={false}>
      <div className="min-h-screen bg-white py-8 px-4">
        {/* Header Section */}
        <div className="mb-8">
          <div className="mx-auto max-w-7xl">
            {/* Title */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Bowl Picks</h1>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-gray-200">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`border-b-2 px-4 py-3 font-medium transition ${
                    activeTab === tab.id
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="mx-auto max-w-7xl">
          <ErrorBoundary>
            {/* Scoreboard Tab */}
            {activeTab === "scoreboard" && (
              <div className="animate-fadeIn">
                <BowlScoreboard showDetails={true} />
              </div>
            )}

            {/* Games Tab */}
            {activeTab === "games" && (
              <div className="animate-fadeIn">
                <BowlPicksTable />
              </div>
            )}
          </ErrorBoundary>
        </div>
      </div>
    </PageLayoutWrapper>
  );
}
