"use client";

import { GRAY_COLOR } from "./constants";

/** Result colors below the chart. */
export default function Legend() {
  return (
    <div className="mt-4 text-xs text-gray-600 dark:text-gray-300 text-center">
      <div className="flex justify-center gap-4">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Win</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Loss</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: GRAY_COLOR }}
          ></div>
          <span>Scheduled</span>
        </div>
      </div>
    </div>
  );
}
