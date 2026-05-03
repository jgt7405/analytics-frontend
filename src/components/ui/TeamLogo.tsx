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
    <div
      className={`inline-flex items-center justify-center rounded-full bg-transparent dark:bg-white p-0.5 ${onClick ? "cursor-pointer" : ""} ${className}`}
      onClick={onClick}
      style={{ width: size + 4, height: size + 4, flexShrink: 0 }}
      title={showTooltip ? teamName : undefined}
    >
      <Image
        src={logoUrl}
        alt={`${teamName} logo`}
        width={size}
        height={size}
        className="object-contain"
        priority={priority}
        sizes={`${size}px`}
        quality={75}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          // Simple gray circle SVG as base64
          target.src =
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='40' fill='%23cccccc'/%3E%3C/svg%3E";
        }}
      />
    </div>
  );
}
