/**
 * 調整課題向けの観測ヘルパ（軌跡・速度スケール・円と矩形）
 * @see docs/PLATFORM.md
 */

/**
 * 再生速度 0.1〜1.0（既定 1＝等速）。不正なら fallback。
 * @param {HTMLInputElement | null | undefined} el
 * @param {number} [fallback]
 */
export function readSpeedScale(el, fallback = 1) {
  const n = Number(el?.value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

/**
 * 古い点ほど薄く、1フレームごとの位置を点で残す。
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x:number,y:number}[]} points
 * @param {{ rgb?: string, radius?: number, alphaMin?: number, alphaMax?: number }} [opts]
 */
export function drawTrailDots(ctx, points, opts = {}) {
  if (!ctx || !points || points.length === 0) return;
  const rgb = opts.rgb || "91,159,212";
  const radius = opts.radius ?? 2.2;
  const alphaMin = opts.alphaMin ?? 0.12;
  const alphaMax = opts.alphaMax ?? 0.85;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 1 : (i + 1) / n;
    const a = alphaMin + (alphaMax - alphaMin) * t;
    ctx.fillStyle = `rgba(${rgb},${a})`;
    ctx.beginPath();
    ctx.arc(points[i].x, points[i].y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @param {{x:number,y:number,w:number,h:number}} box
 */
export function circleAabbOverlaps(cx, cy, r, box) {
  const nx = Math.min(Math.max(cx, box.x), box.x + box.w);
  const ny = Math.min(Math.max(cy, box.y), box.y + box.h);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}

/**
 * 移動のバウンディングが矩形と重なるが、現在位置は重ならない → すり抜け。
 * @param {number} px
 * @param {number} py
 * @param {number} x
 * @param {number} y
 * @param {number} r
 * @param {{x:number,y:number,w:number,h:number}} box
 */
export function circleAabbTunneled(px, py, x, y, r, box) {
  if (circleAabbOverlaps(x, y, r, box)) return false;
  const minx = Math.min(px, x) - r;
  const maxx = Math.max(px, x) + r;
  const miny = Math.min(py, y) - r;
  const maxy = Math.max(py, y) + r;
  return !(
    maxx < box.x ||
    minx > box.x + box.w ||
    maxy < box.y ||
    miny > box.y + box.h
  );
}

/**
 * 重なっていれば最小侵入軸で押し出し、その軸の速度を反転。
 * 重なっていなければ何もしない（すり抜けを許す）。
 * @returns {{ x: number, y: number, vx: number, vy: number, hit: boolean }}
 */
export function resolveCircleAabbReflect(x, y, vx, vy, r, box, restitution = 1) {
  const left = box.x;
  const right = box.x + box.w;
  const top = box.y;
  const bottom = box.y + box.h;
  const closestX = Math.min(Math.max(x, left), right);
  const closestY = Math.min(Math.max(y, top), bottom);
  const dx = x - closestX;
  const dy = y - closestY;
  const d2 = dx * dx + dy * dy;
  const e = Number.isFinite(restitution) ? restitution : 1;
  if (d2 > r * r) return { x, y, vx, vy, hit: false };

  if (d2 < 1e-8) {
    const penL = x - left + r;
    const penR = right - x + r;
    const penT = y - top + r;
    const penB = bottom - y + r;
    const m = Math.min(penL, penR, penT, penB);
    if (m === penL) return { x: left - r, y, vx: -Math.abs(vx) * e, vy, hit: true };
    if (m === penR) return { x: right + r, y, vx: Math.abs(vx) * e, vy, hit: true };
    if (m === penT) return { x, y: top - r, vx, vy: -Math.abs(vy) * e, hit: true };
    return { x, y: bottom + r, vx, vy: Math.abs(vy) * e, hit: true };
  }

  const d = Math.sqrt(d2);
  const nx = dx / d;
  const ny = dy / d;
  const overlap = r - d + 0.5;
  x += nx * overlap;
  y += ny * overlap;
  const vn = vx * nx + vy * ny;
  if (vn < 0) {
    vx -= (1 + e) * vn * nx;
    vy -= (1 + e) * vn * ny;
  }
  return { x, y, vx, vy, hit: true };
}

/**
 * 中央の縦長障害物。厚みは横幅。
 * @param {number} canvasW
 * @param {number} canvasH
 * @param {number} thickness
 */
export function centerObstacleBox(canvasW, canvasH, thickness) {
  const w = Math.max(1, thickness);
  const h = Math.max(40, canvasH * 0.5);
  return {
    x: canvasW / 2 - w / 2,
    y: (canvasH - h) / 2,
    w,
    h,
  };
}
