/** @see docs/topics/concave-compound/SPEC.md */
// L-shape as two AABB convex parts + outline vertices
export const CONCAVE_COMPOUND_CONFIG = {
  parts: [
    { x: 280, y: 140, w: 120, h: 40 },
    { x: 280, y: 180, w: 40, h: 100 },
  ],
  outline: [
    [280, 140],
    [400, 140],
    [400, 180],
    [320, 180],
    [320, 280],
    [280, 280],
  ],
};
