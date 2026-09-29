// PDF export of the preview (loaded on first use).


// ─── PDF Generation ──────────────────────────────────────────────────────────

declare global {
  interface Window {
    html2canvas?: (
      element: HTMLElement,
      options?: object,
    ) => Promise<HTMLCanvasElement>;
  }
}

export async function generatePDF(
  pdfContainerRef: React.RefObject<HTMLDivElement | null>,
  gameName: string,
) {
  if (!pdfContainerRef.current) return;
  if (typeof window !== "undefined" && !window.html2canvas) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed"));
      document.body.appendChild(s);
    });
  }
  const html2canvas = window.html2canvas;
  if (!html2canvas) return;
  if (!(window as unknown as Record<string, unknown>).jspdf) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src =
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed"));
      document.body.appendChild(s);
    });
  }
  interface JsPDFInstance {
    internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
    addImage: (
      data: string,
      format: string,
      x: number,
      y: number,
      w: number,
      h: number,
    ) => void;
    addPage: () => void;
    save: (filename: string) => void;
  }
  const jspdfModule = (window as unknown as Record<string, unknown>).jspdf as {
    jsPDF: new (options: {
      orientation: string;
      unit: string;
      format: string;
      compress?: boolean;
    }) => JsPDFInstance;
  };
  if (!jspdfModule) return;

  const pages = Array.from(
    pdfContainerRef.current.querySelectorAll<HTMLElement>("[data-pdf-page]"),
  );
  if (pages.length === 0) return;

  const pdf = new jspdfModule.jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
    compress: true,
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 5;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;
  const renderWidth = 1100;

  // Helper: convert image URL to base64
  async function toBase64(url: string): Promise<string | null> {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = url;
        setTimeout(reject, 3000);
      });
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0);
      return c.toDataURL("image/png");
    } catch {
      return null;
    }
  }

  // 1. Temporarily fix overflow on ALL elements in the container
  const overflowEls: { el: HTMLElement; orig: string }[] = [];
  pdfContainerRef.current.querySelectorAll<HTMLElement>("*").forEach((el) => {
    const style = window.getComputedStyle(el);
    if (
      style.overflowX === "auto" ||
      style.overflowX === "hidden" ||
      style.overflowX === "scroll" ||
      style.overflowY === "auto" ||
      style.overflowY === "hidden" ||
      style.overflowY === "scroll" ||
      style.overflow === "hidden"
    ) {
      overflowEls.push({
        el,
        orig:
          el.style.overflow +
          "|" +
          el.style.overflowX +
          "|" +
          el.style.overflowY,
      });
      el.style.overflow = "visible";
      el.style.overflowX = "visible";
      el.style.overflowY = "visible";
    }
  });

  // 2. Convert SVG <image> hrefs to inline base64 (logos inside Wins Breakdown charts)
  const svgImageRestores: {
    el: SVGImageElement;
    origHref: string | null;
    origXlink: string | null;
  }[] = [];
  const svgImages = Array.from(
    pdfContainerRef.current.querySelectorAll("image"),
  );
  await Promise.all(
    svgImages.map(async (svgImg) => {
      const href =
        svgImg.getAttribute("href") ||
        svgImg.getAttributeNS("http://www.w3.org/1999/xlink", "href");
      if (href && !href.startsWith("data:")) {
        const origHref = svgImg.getAttribute("href");
        const origXlink = svgImg.getAttributeNS(
          "http://www.w3.org/1999/xlink",
          "href",
        );
        const fullUrl = href.startsWith("/")
          ? `${window.location.origin}${href}`
          : href;
        const b64 = await toBase64(fullUrl);
        if (b64) {
          svgImageRestores.push({ el: svgImg, origHref, origXlink });
          svgImg.setAttribute("href", b64);
          svgImg.setAttributeNS(
            "http://www.w3.org/1999/xlink",
            "xlink:href",
            b64,
          );
        }
      }
    }),
  );

  // 2b. Convert <img> inside SVG <foreignObject> to inline base64 (logos inside Schedule Difficulty charts)
  const foreignObjImgRestores: { el: HTMLImageElement; origSrc: string }[] = [];
  const foreignObjects = Array.from(
    pdfContainerRef.current.querySelectorAll("foreignObject img"),
  );
  await Promise.all(
    foreignObjects.map(async (imgEl) => {
      const img = imgEl as HTMLImageElement;
      const src = img.getAttribute("src");
      if (src && !src.startsWith("data:")) {
        const fullUrl = src.startsWith("/")
          ? `${window.location.origin}${src}`
          : src;
        const b64 = await toBase64(fullUrl);
        if (b64) {
          foreignObjImgRestores.push({ el: img, origSrc: src });
          img.src = b64;
        }
      }
    }),
  );

  // 3. Wait for all HTML images to be loaded
  const htmlImages = Array.from(
    pdfContainerRef.current.querySelectorAll("img"),
  );
  await Promise.all(
    htmlImages.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        setTimeout(resolve, 3000);
      });
    }),
  );

  // Small delay to let everything settle
  await new Promise((resolve) => setTimeout(resolve, 200));

  // 4. Render each page
  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage();

    const el = pages[i];
    const canvas = await html2canvas(el, {
      scale: 1.5,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: renderWidth,
      width: renderWidth,
      imageTimeout: 5000,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.85);
    const imgRatio = canvas.height / canvas.width;

    let w = usableWidth;
    let h = w * imgRatio;
    if (h > usableHeight) {
      h = usableHeight;
      w = h / imgRatio;
    }
    const x = margin + (usableWidth - w) / 2;
    const y = margin;
    pdf.addImage(imgData, "JPEG", x, y, w, h);
  }

  // 5. Restore SVG image hrefs
  svgImageRestores.forEach(({ el, origHref, origXlink }) => {
    if (origHref !== null) el.setAttribute("href", origHref);
    if (origXlink !== null)
      el.setAttributeNS(
        "http://www.w3.org/1999/xlink",
        "xlink:href",
        origXlink,
      );
  });

  // 5b. Restore foreignObject img src
  foreignObjImgRestores.forEach(({ el, origSrc }) => {
    el.src = origSrc;
  });

  // 6. Restore overflow styles
  overflowEls.forEach(({ el, orig }) => {
    const [ov, ovx, ovy] = orig.split("|");
    el.style.overflow = ov;
    el.style.overflowX = ovx;
    el.style.overflowY = ovy;
  });

  const safeName = gameName
    .replace(/[^a-zA-Z0-9\-_ ]/g, "")
    .replace(/\s+/g, "_");
  pdf.save(`Game_Preview_${safeName}.pdf`);
}
