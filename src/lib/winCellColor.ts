// Heat-tile color for the win-distribution and standings-distribution grids.
// Same blue hues as the shared color scale, but these values rarely exceed
// ~45-50%, so the ramp saturates to its darkest shade by 45% rather than by
// 100%, and a sub-linear curve keeps low percentages (1-2%) noticeably
// lighter than a linear mapping. Matches the football tables' local copies,
// so basketball and football grids read as one visual system. Text color
// relies on the --wins-cell-text custom property each table's CSS module sets.
const WIN_CELL_MAX = 45;
const WIN_CELL_LIGHT = [195, 224, 236];
const WIN_CELL_DARK = [24, 98, 123];

export function getWinCellColor(value: number): {
  backgroundColor: string;
  color: string;
} {
  const normalized = Math.min(Math.max(value, 0) / WIN_CELL_MAX, 1);
  const intensity = Math.pow(normalized, 0.6);

  const r = Math.round(
    WIN_CELL_LIGHT[0] + (WIN_CELL_DARK[0] - WIN_CELL_LIGHT[0]) * intensity,
  );
  const g = Math.round(
    WIN_CELL_LIGHT[1] + (WIN_CELL_DARK[1] - WIN_CELL_LIGHT[1]) * intensity,
  );
  const b = Math.round(
    WIN_CELL_LIGHT[2] + (WIN_CELL_DARK[2] - WIN_CELL_LIGHT[2]) * intensity,
  );

  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    color: intensity >= 0.45 ? "#ffffff" : "var(--wins-cell-text)",
  };
}
