// Create hooks/useUrlStateManager.ts

import { useCallback, useEffect, useState } from "react";

interface UrlStateConfig {
  key: string;
  defaultValue: string;
  validate?: (value: string) => boolean;
  transform?: (value: string) => string;
}

class UrlStateManager {
  private static instance: UrlStateManager;
  private listeners = new Map<string, Set<(value: string) => void>>();
  private currentValues = new Map<string, string>();

  static getInstance(): UrlStateManager {
    if (!UrlStateManager.instance) {
      UrlStateManager.instance = new UrlStateManager();
    }
    return UrlStateManager.instance;
  }

  subscribe(key: string, callback: (value: string) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }

  getValue(key: string, defaultValue: string): string {
    return this.currentValues.get(key) || defaultValue;
  }

  setValue(key: string, value: string, config: UrlStateConfig): void {
    // Validate value
    if (config.validate && !config.validate(value)) {
      console.warn(`Invalid value for ${key}: ${value}`);
      return;
    }

    // Transform value
    const transformedValue = config.transform ? config.transform(value) : value;

    // Update internal state
    this.currentValues.set(key, transformedValue);

    // Update URL
    this.updateUrl(key, transformedValue, config.defaultValue);

    // Notify listeners
    this.listeners.get(key)?.forEach((callback) => callback(transformedValue));
  }

  private updateUrl(key: string, value: string, defaultValue: string): void {
    const url = new URL(window.location.href);

    if (value === defaultValue) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }

    const newUrl = url.pathname + (url.search || "");
    window.history.replaceState({}, "", newUrl);
  }

  initialize(): void {
    const params = new URLSearchParams(window.location.search);
    params.forEach((value, key) => {
      this.currentValues.set(key, value);
    });
  }
}

export function useUrlState(
  config: UrlStateConfig
): [string, (value: string) => void] {
  const [value, setValue] = useState(config.defaultValue);
  const manager = UrlStateManager.getInstance();

  useEffect(() => {
    manager.initialize();
    const currentValue = manager.getValue(config.key, config.defaultValue);
    setValue(currentValue);

    const unsubscribe = manager.subscribe(config.key, setValue);
    return unsubscribe;
  }, [config.key, config.defaultValue]);

  const updateValue = useCallback(
    (newValue: string) => {
      manager.setValue(config.key, newValue, config);
    },
    [config]
  );

  return [value, updateValue];
}
