// Unified monitoring service - Production stub. Events and errors go to the
// shared logger, whose level filter decides what prints.
import { logger } from "@/lib/logger";

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

interface MonitoringEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp: number;
}

export const monitoring = {
  startMeasurement: (_name: string): void => {
    // No-op in development
  },

  endMeasurement: (_name: string): number => {
    return 0;
  },

  trackEvent: (event: Omit<MonitoringEvent, "timestamp">): void => {
    logger.debug(`Event: ${event.name}`, event.properties);
  },

  trackError: (error: Error, context?: Record<string, unknown>): void => {
    logger.error(error.message, error, context);
  },

  trackApiCall: (
    _endpoint: string,
    _method: string,
    _duration: number,
    _status: number
  ): void => {
    // No-op
  },

  getMetrics: (): PerformanceMetric[] => [],
  getEvents: (): MonitoringEvent[] => [],
  clearMetrics: (): void => {},
  getAverageMetric: (_name: string): number => 0,
  getSlowOperations: (_threshold = 1000): PerformanceMetric[] => [],
  getRecentAlerts: (_limit = 5): MonitoringEvent[] => [],

  generatePerformanceReport: () => ({
    totalMetrics: 0,
    averageLoadTime: 0,
    slowOperations: [],
    recentErrors: [],
  }),
};

export function useMonitoring() {
  return monitoring;
}
