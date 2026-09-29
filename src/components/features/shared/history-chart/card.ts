// Matches the gradient/border/shadow "card" look used across the
// modernized Wins/Standings/CWV/etc. pages (PAGE_MODERNIZATION_GUIDE.md §1).
// No `border` property: a real `border` combined with this element's
// `border-radius` can hit a Windows Chrome/Edge sub-pixel rasterization
// artifact (zoom-dependent dark corner/edge fringe, invisible to
// computed-style checks). The 1px ring is folded into the shadow stack as
// an inset layer instead - same visual result, different rasterization path.
export const HISTORY_CARD_CLASS =
  "relative rounded-[1.25rem] bg-gradient-to-br from-white to-[#fbfdff] dark:from-[#111827] dark:to-[#0f172a] shadow-[inset_0_0_0_1px_rgb(226_232_240_/_0.9),0_22px_55px_-36px_rgb(15_23_42_/_0.36),0_8px_22px_-18px_rgb(15_23_42_/_0.24)] dark:shadow-[inset_0_0_0_1px_rgb(51_65_85_/_0.9),0_24px_58px_-34px_rgb(0_0_0_/_0.82)]";
