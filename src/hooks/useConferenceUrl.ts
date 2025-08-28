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

  // CRITICAL: Track if we've already initialized from URL
  const hasInitialized = useRef(false);

  // Filter out FCS from available conferences
  const getFilteredConferences = useCallback((conferences: string[]) => {
    return conferences.filter((conf) => conf !== "FCS");
  }, []);

  // Check if current page supports Independent conference
  const supportsIndependent = useCallback(() => {
    // Define EXACT pages that don't support Independent conference
    const pagesWithoutIndependent = [
      "/basketball/schedule",
      "/conf-schedule",
      "/cwv",
      "/football/standings",
      "/football/conf-schedule",
      "/football/conf-champ", // Added conference championship page
    ];

    return !pagesWithoutIndependent.includes(pathname);
  }, [pathname]);

  // Get a safe fallback conference
  const getSafeFallbackConference = useCallback(() => {
    const filteredConferences = getFilteredConferences(availableConferences);

    if (filteredConferences.includes("Big 12")) {
      return "Big 12";
    }
    return (
      filteredConferences.find(
        (conf) =>
          conf !== "Independent" &&
          conf !== "FCS" &&
          (allowAllTeams || conf !== "All Teams")
      ) ||
      filteredConferences[0] ||
      "Big 12"
    );
  }, [availableConferences, allowAllTeams, getFilteredConferences]);

  // SIMPLIFIED: Don't validate against availableConferences until they're fully loaded
  const getAppropriateConference = useCallback(
    (requestedConference: string) => {
      // If requesting Independent but page doesn't support it, use fallback
      if (requestedConference === "Independent" && !supportsIndependent()) {
        return getSafeFallbackConference();
      }

      // If requesting FCS, use fallback
      if (requestedConference === "FCS") {
        return getSafeFallbackConference();
      }

      // CRITICAL FIX: Don't validate against availableConferences here
      // Let the API handle invalid conferences
      return requestedConference;
    },
    [supportsIndependent, getSafeFallbackConference]
  );

  // Update URL when conference changes
  const updateUrl = useCallback(
    (conference: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const appropriateConference = getAppropriateConference(conference);

      if (
        appropriateConference &&
        (appropriateConference !== "All Teams" || allowAllTeams)
      ) {
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
    [
      router,
      searchParams,
      allowAllTeams,
      getAppropriateConference,
      setSelectedConference,
    ]
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

  // Initialize from URL on mount - ONLY ONCE
  useEffect(() => {
    // CRITICAL: Only run once, when we first have URL params
    if (hasInitialized.current) {
      return;
    }

    const confParam = searchParams.get("conf");

    if (confParam) {
      const decodedConf = decodeURIComponent(confParam);
      const appropriateConference = getAppropriateConference(decodedConf);
      console.log(
        `🚀 HOOK DEBUG: Setting conference from URL: "${appropriateConference}"`
      );
      setSelectedConference(appropriateConference);
    } else {
      // No conference in URL, use default
      console.log(`🚀 HOOK DEBUG: No URL param, using default: "Big 12"`);
      setSelectedConference("Big 12");
      // Don't update URL immediately - let it get set when conferences load
    }

    // Mark as initialized
    hasInitialized.current = true;
  }, [searchParams, setSelectedConference, getAppropriateConference]);

  // NEW: Handle page navigation - redirect Independent when not supported
  useEffect(() => {
    if (hasInitialized.current && !supportsIndependent()) {
      const confParam = searchParams.get("conf");
      if (confParam === "Independent") {
        const fallbackConference = getSafeFallbackConference();
        setSelectedConference(fallbackConference);
        updateUrl(fallbackConference);
      }
    }
  }, [
    pathname,
    searchParams,
    supportsIndependent,
    getSafeFallbackConference,
    setSelectedConference,
    updateUrl,
  ]);

  return {
    handleConferenceChange,
    updateUrl,
    filteredConferences: getFilteredConferences(availableConferences),
  };
};
