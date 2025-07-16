// src/lib/unified-monitoring.ts - Minimal version to prevent errors

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

// Minimal no-op monitoring service
class UnifiedMonitoringService {
  startMeasurement = (_name: string): void => {
    // No-op
  };

  endMeasurement = (_name: string): number => {
    return 0;
  };

  trackEvent = (event: Omit<MonitoringEvent, "timestamp">): void => {
    // Only log errors in development
    if (
      process.env.NODE_ENV === "development" &&
      event.name === "error_occurred"
    ) {
      console.error("🚨 Error:", event.properties);
    }
  };

  trackError = (error: Error, context?: Record<string, unknown>): void => {
    if (process.env.NODE_ENV === "development") {
      console.error("🚨 Error tracked:", error.message, context);
    }
  };

  trackApiCall = (
    _endpoint: string,
    _method: string,
    _duration: number,
    _status: number
  ): void => {
    // No-op
  };

  getMetrics = (): PerformanceMetric[] => {
    return [];
  };

  getEvents = (): MonitoringEvent[] => {
    return [];
  };

  clearMetrics = (): void => {
    // No-op
  };

  getAverageMetric = (_name: string): number => {
    return 0;
  };

  getSlowOperations = (_threshold = 1000): PerformanceMetric[] => {
    return [];
  };

  getRecentAlerts = (_limit = 5): MonitoringEvent[] => {
    return [];
  };

  generatePerformanceReport = () => {
    return {
      totalMetrics: 0,
      averageLoadTime: 0,
      slowOperations: [],
      recentErrors: [],
    };
  };
}

// Create singleton instance
export const monitoring = new UnifiedMonitoringService();

// React hook for easy access
export function useMonitoring() {
  return {
    startMeasurement: monitoring.startMeasurement,
    endMeasurement: monitoring.endMeasurement,
    trackEvent: monitoring.trackEvent,
    trackError: monitoring.trackError,
    trackApiCall: monitoring.trackApiCall,
    getMetrics: monitoring.getMetrics,
    getEvents: monitoring.getEvents,
    clearMetrics: monitoring.clearMetrics,
    getAverageMetric: monitoring.getAverageMetric,
    getSlowOperations: monitoring.getSlowOperations,
    getRecentAlerts: monitoring.getRecentAlerts,
    generatePerformanceReport: monitoring.generatePerformanceReport,
  };
}
