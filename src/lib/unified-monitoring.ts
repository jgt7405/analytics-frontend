// src/lib/unified-monitoring.ts
interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

interface MonitoringEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
}

interface PerformanceAlert {
  type: "slow_operation" | "memory_leak" | "repeated_slow";
  message: string;
  timestamp: number;
  severity: "low" | "medium" | "high";
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

    if (
      this.isProduction &&
      typeof window !== "undefined" &&
      (window as any).gtag
    ) {
      (window as any).gtag("event", event.name, event.properties);
    }

    // ✅ FIXED: Only log important events in development, not all events
    if (this.isDevelopment && this.shouldLogEvent(event.name)) {
      console.log("📊 Event tracked:", event.name, event.properties);
    }
  }

  // ✅ NEW: Filter which events to log in development
  private shouldLogEvent(eventName: string): boolean {
    const importantEvents = [
      "error_occurred",
      "data_load_error",
    ];
    return importantEvents.includes(eventName);
  }

  trackError(error: Error, context?: Record<string, any>): void {
    this.trackEvent({
      name: "error_occurred",
      properties: {
        message: error.message,
        stack: error.stack,
        ...context,
      },
    });

    if (this.isDevelopment) {
      console.error("❌ Error tracked:", error, context);
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
        success: status >= 200 && status < 300,
      },
    });

    // ✅ FIXED: Only log slow API calls in development
    if (this.isDevelopment && duration > 1000) {
      console.warn(
        `🐌 Slow API call: ${endpoint} took ${duration.toFixed(2)}ms`
      );
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getRecentAlerts(minutes: number = 10): PerformanceAlert[] {
    if (!this.isDevelopment) return [];

    const cutoff = Date.now() - minutes * 60 * 1000;
    const recentMetrics = this.metrics.filter((m) => m.timestamp > cutoff);

    return recentMetrics
      .filter((m) => m.duration > 200)
      .map((m) => ({
        type: "slow_operation" as const,
        message: `Slow operation: ${m.name} took ${m.duration.toFixed(2)}ms`,
        timestamp: m.timestamp,
        severity: m.duration > 500 ? ("high" as const) : ("medium" as const),
      }));
  }

  clearAlerts(): void {
    this.cleanOldMetrics();
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  getSummary() {
    return {
      totalEvents: this.events.length,
      totalMetrics: this.metrics.length,
      recentEvents: this.events.slice(-10),
      recentMetrics: this.metrics.slice(-10),
    };
  }
}

export const monitoring = new UnifiedMonitoringService();

export function useMonitoring() {
  return {
    startMeasurement: monitoring.startMeasurement.bind(monitoring),
    endMeasurement: monitoring.endMeasurement.bind(monitoring),
    trackEvent: monitoring.trackEvent.bind(monitoring),
    trackError: monitoring.trackError.bind(monitoring),
    trackApiCall: monitoring.trackApiCall.bind(monitoring),
    getMetrics: monitoring.getMetrics.bind(monitoring),
    getRecentAlerts: monitoring.getRecentAlerts.bind(monitoring),
    clearAlerts: monitoring.clearAlerts.bind(monitoring),
    clearMetrics: monitoring.clearMetrics.bind(monitoring),
  };
}
