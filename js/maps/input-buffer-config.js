/** @see docs/topics/input-buffer/SPEC.md */
export const INPUT_BUFFER_CONFIG = {
  gravity: 1400,
  jumpVy: -420,
  moveSpeed: 180,
  playerW: 22,
  playerH: 28,
  defaultBufferMs: 150,
  minBufferMs: 0,
  maxBufferMs: 400,
  groundY: 240,
  platforms: [
    { x: 0, y: 260, w: 640, h: 20 },
    { x: 200, y: 180, w: 140, h: 14 },
    { x: 420, y: 130, w: 110, h: 14 },
  ],
};
