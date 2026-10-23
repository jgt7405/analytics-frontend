import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { registerChartLookup } from "@/lib/export/desktop-layout-state";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

// Lets a screenshot finish chart animations after re-laying a section out
// for export (lib/export/desktop-layout).
registerChartLookup((canvas) => ChartJS.getChart(canvas));
