/** @see docs/topics/influence-map/SPEC.md */
export const INFLUENCE_MAP_CONFIG = {
  cols: 28,
  rows: 18,
  cell: 22,
  defaultDecay: 0.12,
  sources: [
    { x: 4, y: 4, strength: 1, kind: "threat" },
    { x: 22, y: 12, strength: 0.9, kind: "interest" },
    { x: 14, y: 8, strength: 0.7, kind: "threat" },
  ],
};
