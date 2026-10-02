// URL of a local logo file (public/images/...) resized by the image
// optimizer for `displayPx` CSS pixels, at 2x: sharp on high-density screens
// and in the 2x image export (src/lib/export/capture.ts). For logos drawn
// with a plain <img> or an SVG <image>, which next/image can't wrap. Team
// and conference logo files are ~500 px (up to 650 kB), so this saves ~95%.
// Other URLs (remote, data:) are returned unchanged.
//
// Built here rather than with next/image's getImageProps, which adds ~3 kB
// to pages that don't otherwise load next/image (the football archive
// compare page went over its JS budget). The result is the `src` next/image
// gives a `displayPx` square: the smallest configured width >= 2x, at the
// default quality. OPTIMIZER_WIDTHS and the trailing slash mirror
// next.config.ts (images.imageSizes + deviceSizes, trailingSlash: true);
// src/lib/__tests__/logo-src.test.ts checks both against Next.
export const OPTIMIZER_WIDTHS = [
  16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840,
];

export function resizedLogoSrc(src: string, displayPx: number): string;
export function resizedLogoSrc(
  src: string | null | undefined,
  displayPx: number,
): string | undefined;
export function resizedLogoSrc(
  src: string | null | undefined,
  displayPx: number,
): string | undefined {
  if (!src) return undefined;
  if (!src.startsWith("/images/")) return src;
  const width =
    OPTIMIZER_WIDTHS.find((w) => w >= displayPx * 2) ??
    OPTIMIZER_WIDTHS[OPTIMIZER_WIDTHS.length - 1];
  return `/_next/image/?url=${encodeURIComponent(src)}&w=${width}&q=75`;
}
