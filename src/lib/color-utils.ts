// src/lib/color-utils.ts
export type ColorScheme = "blue" | "yellow" | "green" | "red";

export interface ColorStyle {
  backgroundColor: string;
  color: string;
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

  const getLuminance = (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const bgLuminance = getLuminance(r, g, b);
  const darkTextLuminance = getLuminance(31, 41, 55);
  const lightTextLuminance = getLuminance(255, 255, 255);

  const darkContrast = (Math.max(bgLuminance, darkTextLuminance) + 0.05) / (Math.min(bgLuminance, darkTextLuminance) + 0.05);
  const lightContrast = (Math.max(bgLuminance, lightTextLuminance) + 0.05) / (Math.min(bgLuminance, lightTextLuminance) + 0.05);

  const textColor = darkContrast >= lightContrast ? "#1f2937" : "#ffffff";

  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    color: textColor,
  };
}
