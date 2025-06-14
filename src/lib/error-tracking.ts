// src/lib/error-tracking.ts
interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  timestamp: number;
  userAgent: string;
  userId?: string;
}

class ErrorTracker {
  private errors: ErrorReport[] = [];
  private maxErrors = 50;

  captureException(error: Error, context?: Record<string, any>) {
    const errorReport: ErrorReport = {
      message: error.message,
      stack: error.stack,
      url: typeof window !== "undefined" ? window.location.href : "",
      timestamp: Date.now(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    };

    this.errors.push(errorReport);

    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error captured:", error, context);
    }

    // Send to monitoring service if available
    this.sendToMonitoring(errorReport, context);
  }

  private async sendToMonitoring(
    errorReport: ErrorReport,
    context?: Record<string, any>
  ) {
    // Send to your monitoring endpoint
    try {
      if (process.env.NODE_ENV === "production") {
        await fetch("/api/errors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: errorReport, context }),
        });
      }
    } catch (err) {
      console.warn("Failed to send error report:", err);
    }
  }

  getRecentErrors(count = 10): ErrorReport[] {
    return this.errors.slice(-count);
  }
}

export const errorTracker = new ErrorTracker();
