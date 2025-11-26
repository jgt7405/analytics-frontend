// src/hooks/useConferenceUrl.ts
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

export const useConferenceUrl = (
  setSelectedConference: (conference: string) => void,
  availableConferences: string[] = [],
  allowAllTeams: boolean = true
) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Track if we've already initialized from URL
  const hasInitialized = useRef(false);

  // Filter out FCS from available conferences
  const getFilteredConferences = useCallback((conferences: string[]) => {
    return conferences.filter((conf) => conf !== "FCS");
  }, []);

  // Check if current page supports Independent conference
  const supportsIndependent = useCallback(() => {
    const pagesWithoutIndependent = [
      "/football/standings",
      "/football/cwv",
      "/football/schedule",
      "/football/conf-champ",
      "/football/conf-schedule",
      "/basketball/schedule",
      "/conf-schedule",
      "/cwv",
    ];

    return !pagesWithoutIndependent.some((page) => pathname.includes(page));
  }, [pathname]);

  // Get appropriate conference with fallback logic
  const getAppropriateConference = useCallback(
    (requestedConference: string) => {
      // If requesting Independent but page doesn't support it, use Big 12
      if (requestedConference === "Independent" && !supportsIndependent()) {
        return "Big 12";
      }

      // If requesting FCS, use Big 12
      if (requestedConference === "FCS") {
        return "Big 12";
      }

      // If requesting "All Teams" but page doesn't allow it, use Big 12
      if (requestedConference === "All Teams" && !allowAllTeams) {
        return "Big 12";
      }

      return requestedConference;
    },
    [supportsIndependent, allowAllTeams]
  );

  // Update URL when conference changes
  const updateUrl = useCallback(
    (conference: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const appropriateConference = getAppropriateConference(conference);

      if (appropriateConference && appropriateConference !== "Big 12") {
        params.set("conf", appropriateConference);
      } else {
        params.delete("conf");
      }

      const newUrl = `${window.location.pathname}?${params.toString()}`;
      router.replace(newUrl, { scroll: false });

      // Update the selected conference to the appropriate one
      if (appropriateConference !== conference) {
        setSelectedConference(appropriateConference);
      }
    },
    [router, searchParams, getAppropriateConference, setSelectedConference]
  );

  // Handle conference changes
  const handleConferenceChange = useCallback(
    (conference: string) => {
      const appropriateConference = getAppropriateConference(conference);
      setSelectedConference(appropriateConference);
      updateUrl(appropriateConference);
    },
    [setSelectedConference, updateUrl, getAppropriateConference]
  );

  // ============================================================================
  // TASK 1.1: Initialize from URL on mount - only once
  // Implements Rule 1 (Big 12 default) and Rule 4 (teamConf parameter priority)
  // ============================================================================
  useEffect(() => {
    if (hasInitialized.current) return;

    // Rule 4: Check for teamConf parameter FIRST (when navigating FROM a team page)
    // teamConf takes absolute priority over conf parameter
    const teamConfParam = searchParams.get("teamConf");
    if (teamConfParam) {
      const decodedTeamConf = decodeURIComponent(teamConfParam);
      const appropriateConference = getAppropriateConference(decodedTeamConf);
      setSelectedConference(appropriateConference);
      hasInitialized.current = true;
      return; // CRITICAL: Early exit prevents conf parameter from being checked
    }

    // Rule 1: Check for regular conf parameter
    const confParam = searchParams.get("conf");
    if (confParam) {
      const decodedConf = decodeURIComponent(confParam);
      const appropriateConference = getAppropriateConference(decodedConf);
      setSelectedConference(appropriateConference);
    } else {
      // Rule 1: No conference in URL, default to Big 12
      setSelectedConference("Big 12");
    }

    hasInitialized.current = true;
  }, [searchParams, setSelectedConference, getAppropriateConference]);

  // ============================================================================
  // Validate against page constraints AFTER initialization
  // Ensures URL parameters are respected but invalid values are corrected
  // ============================================================================
  useEffect(() => {
    if (!hasInitialized.current) return;

    const confParam = searchParams.get("conf");
    const teamConfParam = searchParams.get("teamConf");

    // Handle Independent not supported on certain pages
    if (
      (confParam === "Independent" || teamConfParam === "Independent") &&
      !supportsIndependent()
    ) {
      setSelectedConference("Big 12");
      updateUrl("Big 12");
    }

    // Handle All Teams not allowed on certain pages
    if (
      (confParam === "All Teams" || teamConfParam === "All Teams") &&
      !allowAllTeams
    ) {
      setSelectedConference("Big 12");
      updateUrl("Big 12");
    }
  }, [
    pathname,
    searchParams,
    supportsIndependent,
    allowAllTeams,
    setSelectedConference,
    updateUrl,
  ]);

  return {
    handleConferenceChange,
    updateUrl,
    filteredConferences: getFilteredConferences(availableConferences),
  };
};
