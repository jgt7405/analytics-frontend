export type SaveImageResult = "shared" | "downloaded" | "cancelled";

function isPhoneOrTablet(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return false;
  }

  const navigatorWithUserAgentData = navigator as Navigator & {
    userAgentData?: { mobile?: boolean };
  };

  if (navigatorWithUserAgentData.userAgentData?.mobile) return true;

  const mobileUserAgent =
    /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(navigator.userAgent);
  const touchTablet =
    navigator.maxTouchPoints > 1 &&
    window.matchMedia?.("(pointer: coarse)").matches;

  return mobileUserAgent || touchTablet;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Opens the phone's native share sheet for image files so iOS and Android can
 * expose their system-provided Save to Photos/Images action. Browsers without
 * file sharing support retain the normal download behavior.
 */
export async function saveImageBlob(
  blob: Blob,
  filename: string,
  title = "JThom Analytics",
): Promise<SaveImageResult> {
  const file = new File([blob], filename, { type: blob.type || "image/png" });

  if (
    isPhoneOrTablet() &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }

      // Some mobile browsers advertise file sharing but reject it at runtime.
      // Preserve the existing browser-download fallback in that case.
    }
  }

  downloadBlob(blob, filename);
  return "downloaded";
}

export async function saveCanvasImage(
  canvas: HTMLCanvasElement,
  filename: string,
  title?: string,
): Promise<SaveImageResult> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("Failed to create image"));
    }, "image/png");
  });

  return saveImageBlob(blob, filename, title);
}
