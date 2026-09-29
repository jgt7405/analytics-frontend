"use client";

// "N outcomes selected:" under the results, one small away @ home chip per
// calculated pick with the winner outlined.

import Image from "next/image";
import { TEAL_COLOR, type PickedOutcome } from "./data";

function SummaryLogo({ team, logo, isWinner }: { team: string; logo?: string; isWinner: boolean }) {
  return (
    <div
      style={{
        lineHeight: 0,
        border: isWinner ? `1px solid ${TEAL_COLOR}` : "1px solid transparent",
        borderRadius: "4px",
        display: "inline-block",
        padding: isWinner ? "1px" : "0",
      }}
    >
      {logo ? (
        <Image src={logo} alt={team} width={12} height={12} className="object-contain" />
      ) : (
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "2px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "6px",
            fontWeight: "bold",
            color: "#374151",
          }}
        >
          {team.substring(0, 1).toUpperCase()}
        </div>
      )}
    </div>
  );
}

export default function SelectionSummary({ outcomes }: { outcomes: PickedOutcome[] }) {
  return (
    <div data-component="whatif-selected-games" className="mt-4 pt-4 border-t border-gray-200">
      <p className="text-sm text-gray-700 dark:text-gray-200 mb-3 font-semibold">
        {outcomes.length}{" "}
        {outcomes.length === 1 ? "outcome" : "outcomes"}{" "}
        selected:
      </p>
      <div className="flex flex-wrap gap-2">
        {outcomes.map((selection) => (
          <div
            key={selection.gameId}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "2px",
              padding: "2px 2px",
              borderRadius: "6px",
              border: `1px solid #9ca3af`,
              backgroundColor: "white",
            }}
          >
            <SummaryLogo team={selection.leftTeam} logo={selection.leftLogo} isWinner={selection.leftIsWinner} />
            <div style={{ fontSize: "6px", color: "#9ca3af" }}>@</div>
            <SummaryLogo team={selection.rightTeam} logo={selection.rightLogo} isWinner={selection.rightIsWinner} />
          </div>
        ))}
      </div>
    </div>
  );
}
