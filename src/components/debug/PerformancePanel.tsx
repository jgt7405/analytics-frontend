// src/components/debug/PerformancePanel.tsx
"use client";

import { useMonitoring } from "@/lib/unified-monitoring";
import { useState } from "react";

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

// Define a union type that covers both possible structures
interface AlertEvent {
  name?: string;
  message?: string;
  timestamp: number;
  severity?: string;
  properties?: Record<string, unknown>;
}

export default function PerformancePanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { getMetrics, getRecentAlerts } = useMonitoring();
  const allMetrics = getMetrics();
  const recentAlerts = getRecentAlerts(5);

  // Filter metrics by type
  const pageLoadMetrics = allMetrics.filter((m: PerformanceMetric) =>
    m.name.includes("page-load")
  );
  const apiMetrics = allMetrics.filter(
    (m: PerformanceMetric) => m.name.includes("api") || m.name.includes("fetch")
  );

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-4 z-50 px-3 py-2 rounded-full text-xs font-medium transition-colors ${
          recentAlerts.length > 0
            ? "bg-red-600 text-white animate-pulse"
            : "bg-blue-600 text-white"
        }`}
        title={`Performance Panel (${recentAlerts.length} alerts)`}
      >
        ⚡ {recentAlerts.length > 0 && `${recentAlerts.length}`}
      </button>

      {isOpen && (
        <div className="fixed bottom-16 right-4 z-50 w-80 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-800">Performance Monitor</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Page Load Performance */}
          {pageLoadMetrics.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">Page Loads</h4>
              <div className="space-y-1">
                {pageLoadMetrics
                  .slice(-3)
                  .map((metric: PerformanceMetric, i: number) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="truncate">
                        {metric.name.replace("-page-load", "")}
                      </span>
                      <span
                        className={`font-medium ${
                          metric.duration > 3000
                            ? "text-red-600"
                            : metric.duration > 1000
                              ? "text-yellow-600"
                              : "text-green-600"
                        }`}
                      >
                        {metric.duration.toFixed(0)}ms
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* API Performance */}
          {apiMetrics.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">API Calls</h4>
              <div className="space-y-1">
                {apiMetrics
                  .slice(-3)
                  .map((metric: PerformanceMetric, i: number) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="truncate">{metric.name}</span>
                      <span
                        className={`font-medium ${
                          metric.duration > 2000
                            ? "text-red-600"
                            : metric.duration > 1000
                              ? "text-yellow-600"
                              : "text-green-600"
                        }`}
                      >
                        {metric.duration.toFixed(0)}ms
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Recent alerts */}
          {recentAlerts.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-red-600 mb-2">Recent Alerts</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {recentAlerts.map((alert: AlertEvent, index: number) => (
                  <div
                    key={index}
                    className={`text-xs p-2 rounded ${
                      alert.severity === "high"
                        ? "bg-red-100 text-red-800"
                        : alert.severity === "medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {alert.message || alert.name || "Performance alert"}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
