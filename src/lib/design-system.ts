// src/lib/design-system.ts
export const components = {
  button: {
    base: "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    primary:
      "bg-gray-700 text-white hover:bg-gray-800 focus-visible:ring-gray-700",
    outline:
      "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus-visible:ring-gray-500 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700",
    sizes: {
      xs: "h-6 px-2 text-xs",
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    },
  },
  table: {
    container: "overflow-x-auto border border-gray-200 rounded-md dark:border-gray-600",
  },
  states: {
    error: "rounded-md bg-red-50 p-4 border border-red-200 dark:bg-red-900 dark:border-red-800",
    loading: "flex items-center justify-center p-8",
  },
};

export const layout = {
  pageContainer: "container mx-auto px-4 py-8",
  card: "rounded-lg border border-gray-200 bg-white shadow-sm dark:bg-slate-800 dark:border-gray-600",
  flexColCenter: "flex flex-col items-center justify-center",
};

export const typography = {
  pageTitle: "text-2xl font-semibold text-gray-800 dark:text-gray-100",
  body: "text-base text-gray-900 dark:text-gray-300",
  label: "text-sm font-medium text-gray-700 dark:text-gray-300",
  caption: "text-sm text-gray-500 dark:text-gray-300",
};
