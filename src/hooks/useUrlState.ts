// src/hooks/useUrlState.ts
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export function useUrlState<T extends string>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState<T>(defaultValue);

  // Initialize value from URL on mount
  useEffect(() => {
    const urlValue = searchParams.get(key) as T;
    if (urlValue) {
      setValue(urlValue);
    }
  }, [key, searchParams]);

  const updateValue = useCallback(
    (newValue: T) => {
      setValue(newValue);

      // Update URL without page reload
      const params = new URLSearchParams(searchParams.toString());
      if (newValue === defaultValue) {
        params.delete(key);
      } else {
        params.set(key, newValue);
      }

      const newUrl = params.toString()
        ? `?${params.toString()}`
        : window.location.pathname;
      router.replace(newUrl, { scroll: false });
    },
    [key, defaultValue, router, searchParams]
  );

  return [value, updateValue];
}
