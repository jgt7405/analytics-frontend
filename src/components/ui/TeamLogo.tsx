// src/components/ui/TeamLogo.tsx
import Image from "next/image";

interface TeamLogoProps {
  logoUrl: string;
  teamName: string;
  size?: number;
  onClick?: () => void;
  priority?: boolean;
  className?: string;
  showTooltip?: boolean; // New prop to control tooltip display
}

export default function TeamLogo({
  logoUrl,
  teamName,
  size = 24,
  onClick,
  priority = false,
  className = "",
  showTooltip = true, // Default to true - show tooltip everywhere
}: TeamLogoProps) {
  return (
    <Image
      src={logoUrl}
      alt={`${teamName} logo`}
      width={size}
      height={size}
      className={`object-contain ${onClick ? "cursor-pointer" : ""} ${className}`}
      onClick={onClick}
      priority={priority}
      sizes={`${size}px`}
      quality={75}
      style={{ width: `${size}px`, height: `${size}px` }}
      title={showTooltip ? teamName : undefined} // Add tooltip here
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        // Simple gray circle SVG as base64
        target.src =
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='40' fill='%23cccccc'/%3E%3C/svg%3E";
      }}
    />
  );
}
