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

    if (computed.boxShadow && computed.boxShadow !== "none") {
      replaceBoxShadow(computed, clonedElement);
    }

    if (
      sourceElement instanceof HTMLImageElement &&
      (computed.objectFit === "contain" || computed.objectFit === "scale-down")
    ) {
      letterboxContainedImage(sourceElement, computed, clonedElement);
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

// Elements that can't hold the overlay child a ring is redrawn with.
const NO_CHILDREN = new Set(["IMG", "INPUT", "TEXTAREA", "SELECT", "CANVAS"]);
const SHADOW_LAYER_SPLIT = /,(?![^(]*\))/;
const SOLID_INSET_RING =
  /^(rgba?\([^)]*\)|#[0-9a-f]+)\s+0px\s+0px\s+0px\s+([\d.]+)px\s+inset$/i;

/**
 * html2canvas paints an inset box-shadow as a solid fill over the whole
 * element (a 1px inset ring on a card turned its plot area gray; the
 * conference chips' colored rings filled them with color), and draws large
 * soft drop shadows as gray smudges at the corners. Drop every shadow on the
 * clone, and redraw a solid inset ring (0 offset, 0 blur) as the border of
 * an overlay just inside the element's own border, so the layout doesn't move.
 */
function replaceBoxShadow(
  computed: CSSStyleDeclaration,
  clonedElement: HTMLElement,
): void {
  clonedElement.style.setProperty("box-shadow", "none", "important");

  const ring = computed.boxShadow
    .split(SHADOW_LAYER_SPLIT)
    .map((layer) => layer.trim().match(SOLID_INSET_RING))
    .find(Boolean);
  if (!ring || NO_CHILDREN.has(clonedElement.tagName)) return;
  const [, color, spreadText] = ring;
  const spread = parseFloat(spreadText);
  if (!(spread > 0)) return;

  const px = (property: string) =>
    parseFloat(computed.getPropertyValue(property)) || 0;

  if (computed.position === "static") {
    clonedElement.style.setProperty("position", "relative", "important");
  }
  const overlay = document.createElement("div");
  overlay.setAttribute("aria-hidden", "true");
  overlay.style.cssText = `
    position: absolute;
    inset: 0;
    box-sizing: border-box;
    border: ${spread}px solid ${color};
    pointer-events: none;
  `;
  // Follow the element's own rounded corners, just inside its border.
  (
    [
      ["top", "left"],
      ["top", "right"],
      ["bottom", "right"],
      ["bottom", "left"],
    ] as const
  ).forEach(([y, x]) => {
    const inner =
      px(`border-${y}-${x}-radius`) -
      Math.max(px(`border-${y}-width`), px(`border-${x}-width`));
    overlay.style.setProperty(
      `border-${y}-${x}-radius`,
      `${Math.max(0, inner)}px`,
    );
  });
  clonedElement.appendChild(overlay);
}

/**
 * html2canvas ignores object-fit and stretches every image to fill its box,
 * so a wide or tall logo shown with object-fit: contain comes out squashed.
 * Pin the clone to the size it renders at on screen and pad the image down to
 * the area object-fit: contain actually draws in, centered as on screen.
 */
function letterboxContainedImage(
  source: HTMLImageElement,
  computed: CSSStyleDeclaration,
  clonedElement: HTMLElement,
): void {
  // The export stylesheet in TableActionButtons resizes these with
  // !important, so their on-screen size doesn't apply in the clone.
  if (source.closest('th, [data-screenshot-team-header="true"]')) return;

  const { naturalWidth, naturalHeight } = source;
  const rect = source.getBoundingClientRect();
  if (!naturalWidth || !naturalHeight || !rect.width || !rect.height) return;

  const px = (property: string) =>
    parseFloat(computed.getPropertyValue(property)) || 0;
  const paddingTop = px("padding-top");
  const paddingRight = px("padding-right");
  const paddingBottom = px("padding-bottom");
  const paddingLeft = px("padding-left");
  const contentWidth =
    rect.width -
    paddingLeft -
    paddingRight -
    px("border-left-width") -
    px("border-right-width");
  const contentHeight =
    rect.height -
    paddingTop -
    paddingBottom -
    px("border-top-width") -
    px("border-bottom-width");
  if (contentWidth <= 0 || contentHeight <= 0) return;

  let scale = Math.min(
    contentWidth / naturalWidth,
    contentHeight / naturalHeight,
  );
  if (computed.objectFit === "scale-down") scale = Math.min(scale, 1);
  const extraX = (contentWidth - naturalWidth * scale) / 2;
  const extraY = (contentHeight - naturalHeight * scale) / 2;
  if (extraX < 0.5 && extraY < 0.5) return;

  const set = (property: string, value: number) =>
    clonedElement.style.setProperty(property, `${value}px`, "important");
  clonedElement.style.setProperty("box-sizing", "border-box", "important");
  set("width", rect.width);
  set("height", rect.height);
  set("padding-top", paddingTop + extraY);
  set("padding-bottom", paddingBottom + extraY);
  set("padding-left", paddingLeft + extraX);
  set("padding-right", paddingRight + extraX);
  clonedElement.style.setProperty("object-fit", "fill", "important");
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
