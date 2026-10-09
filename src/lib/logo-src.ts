// URL to draw a logo with a plain <img> or an SVG <image>, which next/image
// can't wrap. Logo files in public/images are already shrunk to the size the
// site shows them at, 2x (scripts/shrink-logos.mjs), so they're used as they
// are; empty values become undefined so callers don't render src="".
// `displayPx` documents the size each caller draws the logo at.
export function resizedLogoSrc(src: string, displayPx: number): string;
export function resizedLogoSrc(
  src: string | null | undefined,
  displayPx: number,
): string | undefined;
export function resizedLogoSrc(
  src: string | null | undefined,
  _displayPx: number,
): string | undefined {
  return src || undefined;
}
