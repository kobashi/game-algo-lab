/** @see docs/topics/coyote-time/SPEC.md */
export const COYOTE_TIME_CONFIG = {
  gravity: 1400,
  jumpVy: -420,
  moveSpeed: 180,
  playerW: 22,
  playerH: 28,
  defaultCoyoteMs: 120,
  minCoyoteMs: 0,
  maxCoyoteMs: 400,
  groundY: 240,
  platforms: [
    { x: 0, y: 260, w: 640, h: 20 },
    { x: 180, y: 190, w: 120, h: 14 },
    { x: 380, y: 140, w: 100, h: 14 },
    { x: 520, y: 200, w: 90, h: 14 },
  ],
};
