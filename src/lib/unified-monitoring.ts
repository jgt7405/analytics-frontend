// src/lib/unified-monitoring.ts
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

// Define gtag function type
interface GtagFunction {
  (
    command: string,
    eventName: string,
    properties?: Record<string, unknown>
  ): void;
}

// Extend Window interface to include gtag
declare global {
  interface Window {
    gtag?: GtagFunction;
  }
}

class UnifiedMonitoringService {
  private isDevelopment = process.env.NODE_ENV === "development";
  private isProduction = process.env.NODE_ENV === "production";

  // Performance monitoring (dev only)
  private metrics: PerformanceMetric[] = [];
  private activeTimers = new Map<string, number>();
  private readonly MAX_METRICS = 100;
  private lastCleanup = Date.now();

  // Event tracking (production)
  private events: MonitoringEvent[] = [];

  startMeasurement(name: string): void {
    if (!this.isDevelopment) return;
    this.activeTimers.set(name, performance.now());
  }

  endMeasurement(name: string): number {
    if (!this.isDevelopment) return 0;

    const startTime = this.activeTimers.get(name);
    if (!startTime) return 0;

    const duration = performance.now() - startTime;

    if (duration > 50) {
      this.metrics.push({ name, duration, timestamp: Date.now() });

      if (
        this.metrics.length > this.MAX_METRICS ||
        Date.now() - this.lastCleanup > 120000
      ) {
        this.cleanOldMetrics();
      }
    }

    this.activeTimers.delete(name);
    return duration;
  }

  private cleanOldMetrics(): void {
    const tenMinutesAgo = Date.now() - 600000;
    this.metrics = this.metrics.filter((m) => m.timestamp > tenMinutesAgo);

    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    this.lastCleanup = Date.now();
  }

  trackEvent(event: Omit<MonitoringEvent, "timestamp">): void {
    this.events.push({
      ...event,
      timestamp: Date.now(),
    });

    if (this.isProduction && typeof window !== "undefined" && window.gtag) {
      window.gtag("event", event.name, {
        ...event.properties,
        event_category: "engagement",
        event_label: event.properties?.page || "unknown",
      });
    }

    // Only log important events in development, not all events
    if (this.isDevelopment && this.shouldLogEvent(event.name)) {
      console.log("📊 Event tracked:", event.name, event.properties);
    }
  }

  // Filter which events to log in development
  private shouldLogEvent(eventName: string): boolean {
    const importantEvents = ["error_occurred", "data_load_error"];
    return importantEvents.includes(eventName);
  }

  trackError(error: Error, context?: Record<string, unknown>): void {
    const errorEvent = {
      name: "error_occurred",
      properties: {
        message: error.message,
        stack: error.stack,
        ...context,
      },
    };

    this.trackEvent(errorEvent);

    if (this.isDevelopment) {
      console.error("🚨 Error tracked:", error, context);
    }
  }

  trackApiCall(
    endpoint: string,
    method: string,
    duration: number,
    status: number
  ): void {
    this.trackEvent({
      name: "api_call",
      properties: {
        endpoint,
        method,
        duration,
        status,
        success: status < 400,
      },
    });

    if (this.isDevelopment && (duration > 2000 || status >= 400)) {
      console.warn(
        `🐌 Slow/failed API call: ${method} ${endpoint} - ${duration}ms - ${status}`
      );
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getEvents(): MonitoringEvent[] {
    return [...this.events];
  }

  clearMetrics(): void {
    this.metrics = [];
    this.events = [];
  }

  getAverageMetric(name: string): number {
    const matching = this.metrics.filter((m) => m.name === name);
    if (matching.length === 0) return 0;
    return matching.reduce((sum, m) => sum + m.duration, 0) / matching.length;
  }

  getSlowOperations(threshold = 1000): PerformanceMetric[] {
    return this.metrics.filter((m) => m.duration > threshold);
  }

  // ADD THIS MISSING FUNCTION:
  getRecentAlerts(limit = 5): MonitoringEvent[] {
    return this.events
      .filter(
        (e) => e.name === "error_occurred" || e.name === "data_load_error"
      )
      .slice(-limit);
  }

  generatePerformanceReport(): {
    totalMetrics: number;
    averageLoadTime: number;
    slowOperations: PerformanceMetric[];
    recentErrors: MonitoringEvent[];
  } {
    const loadTimeMetrics = this.metrics.filter((m) => m.name.includes("load"));
    const averageLoadTime =
      loadTimeMetrics.length > 0
        ? loadTimeMetrics.reduce((sum, m) => sum + m.duration, 0) /
          loadTimeMetrics.length
        : 0;

    const recentErrors = this.events
      .filter((e) => e.name === "error_occurred")
      .slice(-10);

    return {
      totalMetrics: this.metrics.length,
      averageLoadTime,
      slowOperations: this.getSlowOperations(),
      recentErrors,
    };
  }
}

// Create singleton instance
export const monitoring = new UnifiedMonitoringService();

// React hook for easy access
export function useMonitoring() {
  return {
    startMeasurement: monitoring.startMeasurement.bind(monitoring),
    endMeasurement: monitoring.endMeasurement.bind(monitoring),
    trackEvent: monitoring.trackEvent.bind(monitoring),
    trackError: monitoring.trackError.bind(monitoring),
    trackApiCall: monitoring.trackApiCall.bind(monitoring),
    getMetrics: monitoring.getMetrics.bind(monitoring),
    getEvents: monitoring.getEvents.bind(monitoring),
    clearMetrics: monitoring.clearMetrics.bind(monitoring),
    getAverageMetric: monitoring.getAverageMetric.bind(monitoring),
    getSlowOperations: monitoring.getSlowOperations.bind(monitoring),
    getRecentAlerts: monitoring.getRecentAlerts.bind(monitoring), // ADD THIS LINE
    generatePerformanceReport:
      monitoring.generatePerformanceReport.bind(monitoring),
  };
}

// Global error handler setup
if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    monitoring.trackError(new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    monitoring.trackError(
      new Error(event.reason?.message || "Unhandled promise rejection"),
      {
        reason: event.reason,
      }
    );
  });
}
