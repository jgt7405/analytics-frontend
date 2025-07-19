// Unified monitoring service - Production stub
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
    // Only log in development
    if (process.env.NODE_ENV === "development") {
      console.log("📊 Event:", event.name, event.properties);
    }
  },

  trackError: (error: Error, context?: Record<string, unknown>): void => {
    if (process.env.NODE_ENV === "development") {
      console.error("🚨 Error:", error.message, context);
    }
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
