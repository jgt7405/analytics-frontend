// frontend/src/hooks/useFootballWhatIf.ts

import { GameSelection, WhatIfResponse } from "@/types/football";
import { useMutation } from "@tanstack/react-query";

const calculateWhatIf = async (
  selections: GameSelection[]
): Promise<WhatIfResponse> => {
  const response = await fetch("/api/proxy/football/whatif", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ selections }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to calculate what-if scenarios");
  }

  return response.json();
};

export const useFootballWhatIf = () => {
  return useMutation({
    mutationFn: calculateWhatIf,
    onSuccess: (data) => {
      console.log("What-If calculation successful:", data.metadata);
    },
    onError: (error) => {
      console.error("What-If calculation failed:", error);
    },
  });
};
