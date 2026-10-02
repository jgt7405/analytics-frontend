import { getImageProps } from "next/image";

// URL of a local logo file (public/images/...) resized by the image
// optimizer for `displayPx` CSS pixels, at 2x: sharp on high-density screens
// and in the 2x image export (src/lib/export/capture.ts). For logos drawn
// with a plain <img> or an SVG <image>, which next/image can't wrap. Team
// and conference logo files are ~500 px (up to 650 kB), so this saves ~95%.
// Other URLs (remote, data:) are returned unchanged.
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
  return getImageProps({ src, alt: "", width: displayPx, height: displayPx })
    .props.src;
}
