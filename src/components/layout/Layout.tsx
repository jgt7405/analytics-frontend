// src/components/layout/Layout.tsx
"use client";

import { ReactNode } from "react";
import Header from "./Header";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  controls?: ReactNode;
}

export default function Layout({
  children,
  title,
  subtitle,
  controls,
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main
        id="main-content"
        className="container mx-auto px-4 pt-0 pb-6"
        role="main"
        aria-label="Main content"
      >
        {(title || controls) && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
            {title && (
              <div>
                <h1 className="text-2xl font-normal text-gray-600">
                  {title}
                  {subtitle && (
                    <span className="text-lg ml-2 text-gray-500">
                      {subtitle}
                    </span>
                  )}
                </h1>
              </div>
            )}
            {controls && <div className="flex-shrink-0">{controls}</div>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
