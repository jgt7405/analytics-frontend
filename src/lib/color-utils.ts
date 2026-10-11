// src/lib/color-utils.ts
export type ColorScheme = "blue" | "yellow" | "green" | "red";

export interface ColorStyle {
  backgroundColor: string;
  color: string;
}

const channel = (c: number) => {
  c = c / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const luminance = (r: number, g: number, b: number) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** WCAG contrast ratio between two luminances. */
const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/**
 * Text color for a filled cell: `preferred` (a #rrggbb color) when it reaches
 * the WCAG AA 4.5:1 minimum against rgb(r, g, b), otherwise black or white,
 * whichever reads better. Mid-tone tiles are where neither white nor a dark
 * gray reaches 4.5:1 (plan step 10, finding 6).
 */
export function readableTextColor(r: number, g: number, b: number, preferred: string): string {
  const bg = luminance(r, g, b);
  if (ratio(bg, luminance(...hexToRgb(preferred))) >= 4.5) return preferred;
  return ratio(bg, 0) >= ratio(bg, 1) ? "#000000" : "#ffffff";
}

export function getCellColor(
  value: number,
  scheme: ColorScheme = "blue"
): ColorStyle {
  if (value === 0) {
    return { backgroundColor: "var(--bg-primary)", color: "transparent" };
  }

  const intensity = Math.min(value / 100, 1);

  const colorSchemes = {
    blue: {
      light: [195, 224, 236],
      dark: [24, 98, 123],
    },
    yellow: {
      light: [255, 255, 255],
      dark: [255, 230, 113],
    },
    green: {
      light: [220, 252, 231],
      dark: [34, 197, 94],
    },
    red: {
      light: [254, 226, 226],
      dark: [239, 68, 68],
    },
  };

  const colors = colorSchemes[scheme];
  const r = Math.round(
    colors.light[0] + (colors.dark[0] - colors.light[0]) * intensity
  );
  const g = Math.round(
    colors.light[1] + (colors.dark[1] - colors.light[1]) * intensity
  );
  const b = Math.round(
    colors.light[2] + (colors.dark[2] - colors.light[2]) * intensity
  );

  const bgLuminance = luminance(r, g, b);
  const darkContrast = ratio(bgLuminance, luminance(31, 41, 55));
  const lightContrast = ratio(bgLuminance, 1);
  const textColor = readableTextColor(r, g, b, darkContrast >= lightContrast ? "#1f2937" : "#ffffff");

  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    color: textColor,
  };
}
