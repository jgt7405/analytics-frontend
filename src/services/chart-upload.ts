// CSV upload for the scatterplot chart page (/basketball/chart). A module of
// its own so the page doesn't load the whole API client for one call.
import { apiUrl } from "@/api/urls";

export interface ChartUploadResult<Point> {
  data?: Point[];
  x_label?: string;
  y_label?: string;
  chart_title?: string;
}

/** Uploads the CSV; the backend returns the points and axis labels. Throws
 *  with the backend's error message. */
export async function uploadChartCsv<Point>(file: File): Promise<ChartUploadResult<Point>> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(apiUrl("basketball.chartUpload"), {
    method: "POST",
    body: formData,
  });
  const text = await response.text();
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      message = JSON.parse(text).error || message;
    } catch {
      message = text || message;
    }
    throw new Error(message);
  }
  return JSON.parse(text);
}
