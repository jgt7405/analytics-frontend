import type { Plugin } from "chart.js";

// Option 5-style focus lens: a transient guide and a marker for every team at
// the hovered date. Permanent x-axis grid lines remain disabled in the chart.
export function createHoverLensPlugin(id: string): Plugin<"line"> {
  return {
    id,
    beforeDatasetsDraw(chart) {
      const active = chart.getActiveElements();
      if (active.length === 0) return;

      const point = chart.getDatasetMeta(active[0].datasetIndex).data[
        active[0].index
      ];
      if (!point) return;

      const { x } = point.getProps(["x"], true);
      const { ctx, chartArea } = chart;
      const isDarkMode = document.documentElement.classList.contains("dark");

      ctx.save();
      ctx.fillStyle = isDarkMode
        ? "rgb(56 189 248 / 0.08)"
        : "rgb(14 165 233 / 0.07)";
      ctx.fillRect(x - 18, chartArea.top, 36, chartArea.bottom - chartArea.top);
      ctx.strokeStyle = isDarkMode
        ? "rgb(125 211 252 / 0.75)"
        : "rgb(2 132 199 / 0.65)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.stroke();
      ctx.restore();
    },
    afterDatasetsDraw(chart) {
      const active = chart.getActiveElements();
      if (active.length === 0) return;

      const dataIndex = active[0].index;
      const isDarkMode = document.documentElement.classList.contains("dark");
      const { ctx } = chart;

      ctx.save();
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        const point = meta.data[dataIndex];
        if (!point || meta.hidden) return;

        const { x, y } = point.getProps(["x", "y"], true);
        const datasetColor = Array.isArray(dataset.borderColor)
          ? dataset.borderColor[dataIndex]
          : dataset.borderColor;

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = isDarkMode ? "#0f172a" : "#ffffff";
        ctx.fill();
        ctx.strokeStyle =
          typeof datasetColor === "string" ? datasetColor : "#64748b";
        ctx.lineWidth = 2;
        ctx.stroke();
      });
      ctx.restore();
    },
  };
}
