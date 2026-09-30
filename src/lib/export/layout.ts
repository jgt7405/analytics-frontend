export interface FullScreenshotDimensions {
  width: number;
  height: number;
}

export function getFullContentWidth(element: Element): number {
  const elements = [element, ...Array.from(element.querySelectorAll("*"))];

  return Math.ceil(
    elements.reduce((widest, candidate) => {
      const htmlCandidate = candidate as HTMLElement;
      const rectWidth = candidate.getBoundingClientRect().width;
      let intrinsicWidth = Math.max(
        rectWidth,
        htmlCandidate.clientWidth || 0,
        htmlCandidate.offsetWidth || 0,
        htmlCandidate.scrollWidth || 0,
      );

      if (candidate instanceof HTMLCanvasElement) {
        intrinsicWidth = Math.max(intrinsicWidth, candidate.width);
      } else if (candidate instanceof SVGSVGElement) {
        intrinsicWidth = Math.max(
          intrinsicWidth,
          candidate.viewBox.baseVal?.width || 0,
        );
      }

      return Math.max(widest, intrinsicWidth);
    }, 0),
  );
}

/** Expand responsive scroll regions and neutralize sticky cells on an export clone. */
export function expandExportClone(
  source: HTMLElement,
  clone: HTMLElement,
): void {
  const sourceElements = [source, ...Array.from(source.querySelectorAll("*"))];
  const cloneElements = [clone, ...Array.from(clone.querySelectorAll("*"))];

  sourceElements.forEach((sourceElement, index) => {
    const clonedElement = cloneElements[index] as HTMLElement | undefined;
    if (!clonedElement) return;

    const sourceHtmlElement = sourceElement as HTMLElement;
    const computed = window.getComputedStyle(sourceElement);
    const fullWidth = sourceHtmlElement.scrollWidth || 0;
    const fullHeight = sourceHtmlElement.scrollHeight || 0;
    const clipsHorizontally =
      fullWidth > (sourceHtmlElement.clientWidth || 0) + 1;
    const clipsVertically =
      fullHeight > (sourceHtmlElement.clientHeight || 0) + 1;

    if (
      clipsHorizontally ||
      computed.overflowX === "auto" ||
      computed.overflowX === "scroll" ||
      computed.overflowX === "hidden"
    ) {
      clonedElement.style.setProperty("overflow-x", "visible", "important");
      clonedElement.style.setProperty("max-width", "none", "important");
      if (clipsHorizontally) {
        clonedElement.style.setProperty("width", `${fullWidth}px`, "important");
      }
    }

    if (
      clipsVertically ||
      computed.overflowY === "auto" ||
      computed.overflowY === "scroll" ||
      computed.overflowY === "hidden"
    ) {
      clonedElement.style.setProperty("overflow-y", "visible", "important");
      clonedElement.style.setProperty("max-height", "none", "important");
      if (clipsVertically) {
        clonedElement.style.setProperty(
          "height",
          `${fullHeight}px`,
          "important",
        );
      }
    }

    if (computed.position === "sticky") {
      clonedElement.style.setProperty("position", "static", "important");
      clonedElement.style.setProperty("inset", "auto", "important");
    }
  });

  clone.dataset.screenshotCapture = "true";

  clone
    .querySelectorAll<HTMLElement>("[data-screenshot-label]")
    .forEach((label) => {
      label.style.setProperty("display", "block", "important");
      label.style.setProperty("visibility", "visible", "important");
      label.style.setProperty("opacity", "1", "important");
      label.style.setProperty("white-space", "normal", "important");
      label.style.setProperty("overflow", "visible", "important");
      label.style.setProperty("text-overflow", "clip", "important");
    });
}

export function getFullScreenshotDimensions(
  element: HTMLElement,
): FullScreenshotDimensions {
  return {
    width: Math.ceil(
      Math.max(element.scrollWidth, element.getBoundingClientRect().width),
    ),
    height: Math.ceil(
      Math.max(element.scrollHeight, element.getBoundingClientRect().height),
    ),
  };
}
