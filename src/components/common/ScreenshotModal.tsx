"use client";

import { Button } from "@/components/ui/Button";
import React from "react";

interface ScreenshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
}

const ScreenshotModal: React.FC<ScreenshotModalProps> = ({
  isOpen,
  onClose,
  teamName,
}) => {
  if (!isOpen) return null;

  const handleDownloadClick = (selector: string, label: string) => {
    console.log(
      `Attempting to screenshot: ${label} with selector: ${selector}`
    );
    const element = document.querySelector(selector);
    console.log(`Element found:`, element);

    if (!element) {
      console.error(`No element found for selector: ${selector}`);
      return;
    }

    console.log(`Ready to screenshot ${label}`);
  };

  const screenshotOptions = [
    {
      label: "Schedule Difficulty",
      selector: "[data-component='schedule-difficulty']",
    },
    {
      label: "Win Values Over Time",
      selector: "[data-component='win-values']",
    },
    {
      label: "CFP Seed Projections",
      selector: "[data-component='seed-projections']",
    },
    {
      label: "Rating Rank History",
      selector: "[data-component='rank-history']",
    },
    {
      label: "Projected Wins History",
      selector: "[data-component='win-history']",
    },
    {
      label: "Projected Standings History",
      selector: "[data-component='standings-history']",
    },
    {
      label: "Schedule Chart",
      selector: "[data-component='schedule-chart']",
    },
    {
      label: "Team Schedule",
      selector: "[data-component='team-schedule']",
    },
    {
      label: "First Place History",
      selector: "[data-component='first-place-history']",
    },
    {
      label: "CFP Bid History",
      selector: "[data-component='cfp-bid-history']",
    },
    {
      label: "CFP Progression History",
      selector: "[data-component='cfp-progression-history']",
    },
    {
      label: "Full Team Page",
      selector: ".container",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 rounded-lg max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Download {teamName} Components
          </h3>
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </Button>
        </div>

        <div className="space-y-3">
          {screenshotOptions.map((option) => (
            <div
              key={option.selector}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <span className="text-sm font-medium text-gray-700">
                {option.label}
              </span>
              <button
                onClick={() =>
                  handleDownloadClick(option.selector, option.label)
                }
                className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Test Download
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <Button onClick={onClose} className="w-full" variant="outline">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ScreenshotModal;
