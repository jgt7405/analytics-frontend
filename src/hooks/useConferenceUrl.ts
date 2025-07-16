// Update useConferenceUrl.ts
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";

export const useConferenceUrl = (
  setSelectedConference: (conference: string) => void,
  availableConferences: string[] = [],
  allowAllTeams: boolean = true
) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Check if current page supports Independent conference
  const supportsIndependent = useCallback(() => {
    // Define pages that don't support Independent conference
    const pagesWithoutIndependent = [
      "/schedule",
      "/conf-schedule",
      "/cwv", // Add any other pages that don't work with Independent
    ];

    return !pagesWithoutIndependent.some((page) => pathname.includes(page));
  }, [pathname]); // Only pathname as dependency since pagesWithoutIndependent is now inside the callback

  // Get a safe fallback conference
  const getSafeFallbackConference = useCallback(() => {
    if (availableConferences.includes("Big 12")) {
      return "Big 12";
    }
    return (
      availableConferences.find(
        (conf) =>
          conf !== "Independent" && (allowAllTeams || conf !== "All Teams")
      ) ||
      availableConferences[0] ||
      "Big 12"
    );
  }, [availableConferences, allowAllTeams]);

  // Update URL when conference changes
  const updateUrl = useCallback(
    (conference: string) => {
      const params = new URLSearchParams(searchParams.toString());

      // If switching to a page that doesn't support the current conference, use fallback
      if (!supportsIndependent() && conference === "Independent") {
        conference = getSafeFallbackConference();
      }

      if (conference && (conference !== "All Teams" || allowAllTeams)) {
        params.set("conf", conference);
      } else {
        params.delete("conf");
      }

      const newUrl = `${window.location.pathname}?${params.toString()}`;
      router.replace(newUrl, { scroll: false });
    },
    [
      router,
      searchParams,
      allowAllTeams,
      supportsIndependent,
      getSafeFallbackConference,
    ]
  );

  // Handle conference changes
  const handleConferenceChange = useCallback(
    (conference: string) => {
      setSelectedConference(conference);
      updateUrl(conference);
    },
    [setSelectedConference, updateUrl]
  );

  // Initialize from URL on mount with enhanced validation
  useEffect(() => {
    const confParam = searchParams.get("conf");

    if (confParam && availableConferences.length > 0) {
      const decodedConf = decodeURIComponent(confParam);

      // Check if conference is valid for this page
      const isValidForPage =
        supportsIndependent() || decodedConf !== "Independent";

      if (
        availableConferences.includes(decodedConf) &&
        (decodedConf !== "All Teams" || allowAllTeams) &&
        isValidForPage
      ) {
        setSelectedConference(decodedConf);
      } else {
        // Conference doesn't exist, not allowed, or not valid for this page
        const fallback = getSafeFallbackConference();
        console.log(
          `Conference "${decodedConf}" not available for this page, switching to "${fallback}"`
        );
        setSelectedConference(fallback);
        updateUrl(fallback);
      }
    } else if (availableConferences.length > 0 && !confParam) {
      // No conference in URL, use safe default
      const defaultConf = getSafeFallbackConference();
      setSelectedConference(defaultConf);
      updateUrl(defaultConf);
    }
  }, [
    searchParams,
    availableConferences,
    setSelectedConference,
    updateUrl,
    allowAllTeams,
    supportsIndependent,
    getSafeFallbackConference,
  ]);

  // Additional effect: Check when pathname changes (navigation between pages)
  useEffect(() => {
    if (availableConferences.length > 0) {
      const currentConf = searchParams.get("conf");
      if (currentConf) {
        const decodedConf = decodeURIComponent(currentConf);

        // If navigating to a page that doesn't support current conference, switch
        if (!supportsIndependent() && decodedConf === "Independent") {
          const fallback = getSafeFallbackConference();
          console.log(
            `Navigated to page that doesn't support Independent, switching to "${fallback}"`
          );
          setSelectedConference(fallback);
          updateUrl(fallback);
        }
      }
    }
  }, [
    pathname,
    searchParams,
    availableConferences,
    setSelectedConference,
    updateUrl,
    supportsIndependent,
    getSafeFallbackConference,
  ]);

  return { handleConferenceChange, updateUrl };
};
