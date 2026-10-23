import {
  expandExportClone,
  getFullContentWidth,
  getFullScreenshotDimensions,
} from "../layout";

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

  it("measures a canvas by its layout width, not its pixel buffer", () => {
    const container = document.createElement("div");
    const canvas = document.createElement("canvas");
    // A 360px-wide chart on a 3x phone has a 1080px backing store.
    canvas.width = 1080;
    container.appendChild(canvas);
    setLayout(container, {
      clientWidth: 360,
      clientHeight: 420,
      scrollWidth: 360,
      scrollHeight: 420,
    });
    setLayout(canvas, {
      clientWidth: 360,
      clientHeight: 420,
      scrollWidth: 360,
      scrollHeight: 420,
    });

    expect(getFullContentWidth(container)).toBe(360);
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

  describe("html2canvas workarounds", () => {
    // jsdom doesn't normalize computed styles the way browsers do, so feed
    // expandExportClone the browser's serialized values directly.
    function mockComputedStyle(styles: Map<Element, Record<string, string>>) {
      const real = window.getComputedStyle.bind(window);
      return jest
        .spyOn(window, "getComputedStyle")
        .mockImplementation((element: Element) => {
          const values = styles.get(element);
          if (!values) return real(element);
          const style = real(element);
          return new Proxy(style, {
            get(target, property) {
              if (property === "getPropertyValue") {
                return (name: string) => values[name] ?? "";
              }
              const name = String(property).replace(
                /[A-Z]/g,
                (c) => `-${c.toLowerCase()}`,
              );
              if (name in values) return values[name];
              const value = Reflect.get(target, property);
              return typeof value === "function" ? value.bind(target) : value;
            },
          });
        });
    }

    afterEach(() => jest.restoreAllMocks());

    it("redraws an inset ring as an overlay border and drops shadows", () => {
      const source = document.createElement("button");
      const clone = source.cloneNode(true) as HTMLElement;
      mockComputedStyle(
        new Map([
          [
            source,
            {
              "box-shadow":
                "rgb(0, 136, 206) 0px 0px 0px 2px inset, rgba(15, 23, 42, 0.36) 0px 22px 55px -36px",
              position: "static",
              "border-top-left-radius": "12px",
              "border-top-right-radius": "12px",
              "border-bottom-right-radius": "12px",
              "border-bottom-left-radius": "12px",
              "border-top-width": "2px",
              "border-right-width": "2px",
              "border-bottom-width": "2px",
              "border-left-width": "2px",
            },
          ],
        ]),
      );

      expandExportClone(source, clone);

      expect(clone.style.getPropertyValue("box-shadow")).toBe("none");
      expect(clone.style.position).toBe("relative");
      const overlay = clone.lastElementChild as HTMLElement;
      expect(overlay.style.position).toBe("absolute");
      expect(overlay.style.border).toBe("2px solid rgb(0, 136, 206)");
      expect(overlay.style.borderTopLeftRadius).toBe("10px");
    });

    it("letterboxes an object-fit: contain image instead of stretching it", () => {
      const source = document.createElement("img");
      Object.defineProperty(source, "naturalWidth", { value: 200 });
      Object.defineProperty(source, "naturalHeight", { value: 100 });
      source.getBoundingClientRect = () =>
        ({ width: 20, height: 20 }) as DOMRect;
      const clone = source.cloneNode(true) as HTMLImageElement;
      mockComputedStyle(new Map([[source, { "object-fit": "contain" }]]));

      expandExportClone(source, clone);

      expect(clone.style.width).toBe("20px");
      expect(clone.style.height).toBe("20px");
      expect(clone.style.paddingTop).toBe("5px");
      expect(clone.style.paddingBottom).toBe("5px");
      expect(clone.style.paddingLeft).toBe("0px");
      expect(clone.style.objectFit).toBe("fill");
    });
  });
});
