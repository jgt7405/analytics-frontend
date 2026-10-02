// Points an export clone's <img> at its inlined copy. The browser draws a
// `srcset` candidate in preference to `src`, so an image from next/image
// would still show whichever optimizer file was cached (and html2canvas
// would draw that) unless `srcset` and `sizes` go too.
export function setInlinedSrc(img: HTMLImageElement, dataUri: string): void {
  img.removeAttribute("srcset");
  img.removeAttribute("sizes");
  img.src = dataUri;
}
