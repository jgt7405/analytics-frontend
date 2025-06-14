import Image from "next/image";

interface TeamLogoProps {
  logoUrl: string;
  teamName: string;
  size?: number;
  onClick?: () => void;
  priority?: boolean;
  className?: string; // ✅ Add className prop
}

export default function TeamLogo({
  logoUrl,
  teamName,
  size = 24,
  onClick,
  priority = false,
  className = "", // ✅ Add className prop
}: TeamLogoProps) {
  return (
    <Image
      src={logoUrl}
      alt={`${teamName} logo`}
      width={size}
      height={size}
      className={`object-contain ${onClick ? "cursor-pointer" : ""} ${className}`} // ✅ Apply className
      onClick={onClick}
      priority={priority}
      sizes={`${size}px`}
      quality={75}
      style={{ width: `${size}px`, height: `${size}px` }} // ✅ Add inline styles to force size
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.src = "/images/default-logo.png";
      }}
    />
  );
}
