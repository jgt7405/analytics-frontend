// src/hooks/useConferenceState.ts
"use client";

import { useState } from "react";

export function useConferenceState(defaultConference: string = "Big 12") {
  const [selectedConference, setSelectedConference] =
    useState(defaultConference);

  return {
    selectedConference,
    setSelectedConference,
  };
}
