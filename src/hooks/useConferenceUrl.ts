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

  // Initialize from URL on mount - only once
  useEffect(() => {
    if (hasInitialized.current) return;

    const confParam = searchParams.get("conf");

    if (confParam) {
      const decodedConf = decodeURIComponent(confParam);
      const appropriateConference = getAppropriateConference(decodedConf);
      setSelectedConference(appropriateConference);
    } else {
      // No conference in URL, use default Big 12
      setSelectedConference("Big 12");
    }

    hasInitialized.current = true;
  }, [searchParams, setSelectedConference, getAppropriateConference]);

  // Handle page navigation - redirect Invalid conferences
  useEffect(() => {
    if (!hasInitialized.current) return;

    const confParam = searchParams.get("conf");

    // Handle Independent not supported
    if (confParam === "Independent" && !supportsIndependent()) {
      setSelectedConference("Big 12");
      updateUrl("Big 12");
    }

    // Handle All Teams not allowed
    if (confParam === "All Teams" && !allowAllTeams) {
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
