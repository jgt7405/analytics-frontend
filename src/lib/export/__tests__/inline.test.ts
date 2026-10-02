import { setInlinedSrc } from "../inline";

describe("setInlinedSrc", () => {
  it("replaces src and drops srcset and sizes so only the inlined copy can be drawn", () => {
    const img = document.createElement("img");
    img.src = "/_next/image/?url=%2Fimages%2Fteam_logos%2Fduke.png&w=3840&q=75";
    img.srcset = "/_next/image/?url=%2Fimages%2Fteam_logos%2Fduke.png&w=48&q=75 48w";
    img.sizes = "24px";

    setInlinedSrc(img, "data:image/png;base64,AAAA");

    expect(img.getAttribute("src")).toBe("data:image/png;base64,AAAA");
    expect(img.hasAttribute("srcset")).toBe(false);
    expect(img.hasAttribute("sizes")).toBe(false);
  });

  it("leaves an image without srcset otherwise unchanged", () => {
    const img = document.createElement("img");
    img.src = "/images/team_logos/duke.png";
    img.alt = "Duke";

    setInlinedSrc(img, "data:image/png;base64,BBBB");

    expect(img.getAttribute("src")).toBe("data:image/png;base64,BBBB");
    expect(img.alt).toBe("Duke");
  });
});
