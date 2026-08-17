import {
  expandExportClone,
  getFullContentWidth,
  getFullScreenshotDimensions,
} from "../screenshot-layout";

function setLayout(
  element: HTMLElement,
  dimensions: {
    clientWidth: number;
    clientHeight: number;
    scrollWidth: number;
    scrollHeight: number;
  },
) {
  Object.entries(dimensions).forEach(([property, value]) => {
    Object.defineProperty(element, property, { configurable: true, value });
  });
  element.getBoundingClientRect = () =>
    ({
      width: dimensions.clientWidth,
      height: dimensions.clientHeight,
    }) as DOMRect;
}

describe("screenshot layout helpers", () => {
  it("measures content beyond a scroll viewport", () => {
    const viewport = document.createElement("div");
    setLayout(viewport, {
      clientWidth: 320,
      clientHeight: 240,
      scrollWidth: 1280,
      scrollHeight: 900,
    });

    expect(getFullContentWidth(viewport)).toBe(1280);
    expect(getFullScreenshotDimensions(viewport)).toEqual({
      width: 1280,
      height: 900,
    });
  });

  it("expands clipped regions and restores export-critical labels", () => {
    const source = document.createElement("section");
    const viewport = document.createElement("div");
    const sticky = document.createElement("div");
    const label = document.createElement("span");

    viewport.style.overflow = "auto";
    sticky.style.position = "sticky";
    label.dataset.screenshotLabel = "true";
    label.style.display = "none";
    sticky.appendChild(label);
    viewport.appendChild(sticky);
    source.appendChild(viewport);

    setLayout(source, {
      clientWidth: 320,
      clientHeight: 240,
      scrollWidth: 320,
      scrollHeight: 240,
    });
    setLayout(viewport, {
      clientWidth: 320,
      clientHeight: 240,
      scrollWidth: 1100,
      scrollHeight: 760,
    });
    setLayout(sticky, {
      clientWidth: 100,
      clientHeight: 40,
      scrollWidth: 100,
      scrollHeight: 40,
    });
    setLayout(label, {
      clientWidth: 80,
      clientHeight: 20,
      scrollWidth: 80,
      scrollHeight: 20,
    });

    const clone = source.cloneNode(true) as HTMLElement;
    expandExportClone(source, clone);

    const clonedViewport = clone.firstElementChild as HTMLElement;
    const clonedSticky = clonedViewport.firstElementChild as HTMLElement;
    const clonedLabel = clonedSticky.firstElementChild as HTMLElement;

    expect(clone.dataset.screenshotCapture).toBe("true");
    expect(clonedViewport.style.getPropertyValue("overflow-x")).toBe("visible");
    expect(clonedViewport.style.width).toBe("1100px");
    expect(clonedViewport.style.height).toBe("760px");
    expect(clonedSticky.style.position).toBe("static");
    expect(clonedLabel.style.display).toBe("block");
    expect(clonedLabel.style.visibility).toBe("visible");
    expect(clonedLabel.style.whiteSpace).toBe("normal");
  });
});
