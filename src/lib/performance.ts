// src/lib/performance.ts
export interface PerformanceMetrics {
  renderTime: number;
  loadTime: number;
  componentCount: number;
}

export function measureRenderTime<T>(fn: () => T): { result: T; time: number } {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  return { result, time: end - start };
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function (this: any, ...args: Parameters<T>) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function (this: any, ...args: Parameters<T>) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function usePerformanceMonitor() {
  // Placeholder hook for performance monitoring
  return {
    startMeasurement: (name: string) => {
      performance.mark(`${name}-start`);
    },
    endMeasurement: (name: string) => {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    },
  };
}
