"use client";

import { AlertTriangle, Home, RefreshCw } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { Component, ReactNode } from "react";
import { Button } from "./Button";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
  level?: "page" | "component" | "critical";
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Log error in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error caught by boundary:", error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    this.props.onRetry?.();
  };

  handleGoHome = () => {
    window.location.href = "/basketball/wins";
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { level = "component" } = this.props;

      // Custom fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Page-level error (full page replacement)
      if (level === "page") {
        return (
          <div className="container mx-auto px-4 py-8">
            <div
              className={cn(
                "flex flex-col items-center justify-center min-h-[60vh] space-y-6"
              )}
            >
              <div className="rounded-full bg-red-100 p-4">
                <AlertTriangle className="h-16 w-16 text-red-600" />
              </div>

              <div className="text-center space-y-4 max-w-md">
                <h1 className="text-2xl font-semibold text-gray-800">
                  Something went wrong
                </h1>
                <p className="text-base text-gray-900">
                  We encountered an unexpected error while loading this page.
                  Please try refreshing or go back to the home page.
                </p>

                {process.env.NODE_ENV === "development" && this.state.error && (
                  <details className="mt-4 p-4 bg-red-50 rounded-md text-left">
                    <summary className="cursor-pointer font-medium text-red-800">
                      Error Details (Development)
                    </summary>
                    <pre className="mt-2 text-xs text-red-700 overflow-auto whitespace-pre-wrap">
                      {this.state.error.message}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </details>
                )}
              </div>

              <div className="flex gap-4 flex-wrap justify-center">
                <Button onClick={this.handleRetry} variant="primary">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button onClick={this.handleGoHome} variant="outline">
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
              </div>
            </div>
          </div>
        );
      }

      // Component-level error (smaller inline error)
      return (
        <div
          className={cn("rounded-md bg-red-50 border border-red-200 p-4 my-4")}
        >
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className={cn("text-sm font-medium text-red-800")}>
                Component Error
              </h3>
              <p className={cn("text-xs text-red-700 mt-1")}>
                {this.state.error?.message ||
                  "An error occurred in this component"}
              </p>
              <div className="mt-3">
                <Button onClick={this.handleRetry} size="sm" variant="outline">
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Simple async error boundary for dynamic imports
export function AsyncErrorBoundary({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <ErrorBoundary
      level="component"
      fallback={
        fallback || (
          <div className="p-4 text-center">Failed to load component</div>
        )
      }
    >
      {children}
    </ErrorBoundary>
  );
}
