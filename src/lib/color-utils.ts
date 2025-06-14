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
    return { backgroundColor: "white", color: "transparent" };
  }

  const intensity = Math.min(value / 100, 1);

  const colorSchemes = {
    blue: {
      light: [195, 224, 236],
      dark: [0, 50, 87],
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

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const textColor = brightness > 140 ? "#374151" : "#ffffff";

  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    color: textColor,
  };
}
