// src/components/ui/Button.tsx
"use client";

import { components } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", disabled, ...props },
    ref
  ) => {
    const variantClasses = {
      primary: components.button.primary,
      secondary:
        "bg-blue-500 text-white hover:bg-blue-600 focus-visible:ring-blue-500",
      outline: components.button.outline,
      ghost: "text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-500",
    };

    return (
      <button
        className={cn(
          components.button.base,
          variantClasses[variant],
          components.button.sizes[size],
          className
        )}
        ref={ref}
        disabled={disabled}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
