/** @see docs/topics/wfc-intro/SPEC.md */
/** Edge labels: N,E,S,W — matching edges may adjoin */
export const WFC_INTRO_CONFIG = {
  cols: 12,
  rows: 8,
  cell: 36,
  /** tiles: id, edges [N,E,S,W], color, weight */
  tiles: [
    { id: 0, name: "空", edges: ["A", "A", "A", "A"], color: "#1a2433", weight: 3 },
    { id: 1, name: "草", edges: ["G", "G", "G", "G"], color: "#3d7a4a", weight: 4 },
    { id: 2, name: "道横", edges: ["A", "R", "A", "R"], color: "#8b7355", weight: 2 },
    { id: 3, name: "道縦", edges: ["R", "A", "R", "A"], color: "#9a8060", weight: 2 },
    { id: 4, name: "十字", edges: ["R", "R", "R", "R"], color: "#a89070", weight: 1 },
    { id: 5, name: "水", edges: ["W", "W", "W", "W"], color: "#3a6ea5", weight: 2 },
  ],
};
