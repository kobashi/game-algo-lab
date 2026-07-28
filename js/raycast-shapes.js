/**
 * 線分・レイキャストと図形
 * @see docs/topics/raycast-shapes/SPEC.md
 */
import { RAYCAST_SHAPES_CONFIG as C } from "./maps/raycast-shapes-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("rc-canvas")
);
const ctx = canvas.getContext("2d");
const statsEl = document.getElementById("rc-stats");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

let origin = { ...C.origin };
let dirEnd = {
  x: C.origin.x + C.dir.x * 200,
  y: C.origin.y + C.dir.y * 200,
};
let circle = { ...C.circle };
let box = { ...C.box };

/** @type {null | 'origin' | 'dir' | 'circle' | 'box'} */
let drag = null;
let dmx = 0;
let dmy = 0;
let ox = 0;
let oy = 0;

/**
 * @param {number} ox
 * @param {number} oy
 * @param {number} dx
 * @param {number} dy
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 */
export function rayCircle(ox, oy, dx, dy, cx, cy, r) {
  const fx = ox - cx;
  const fy = oy - cy;
  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  const disc = b * b - 4 * a * c;
  if (disc < 0 || a < 1e-12) return null;
  const s = Math.sqrt(disc);
  const t0 = (-b - s) / (2 * a);
  const t1 = (-b + s) / (2 * a);
  const t = t0 >= 0 ? t0 : t1 >= 0 ? t1 : null;
  if (t == null) return null;
  const hx = ox + dx * t;
  const hy = oy + dy * t;
  const nx = (hx - cx) / r;
  const ny = (hy - cy) / r;
  return { t, x: hx, y: hy, nx, ny, target: "circle" };
}

/**
 * slab method
 * @param {number} ox
 * @param {number} oy
 * @param {number} dx
 * @param {number} dy
 * @param {{x:number,y:number,w:number,h:number}} b
 */
export function rayAabb(ox, oy, dx, dy, b) {
  let tmin = 0;
  let tmax = Infinity;
  const slabs = [
    [ox, dx, b.x, b.x + b.w],
    [oy, dy, b.y, b.y + b.h],
  ];
  /** @type {number} */
  let hitAxis = 0;
  for (let i = 0; i < 2; i++) {
    const [o, d, min, max] = slabs[i];
    if (Math.abs(d) < 1e-12) {
      if (o < min || o > max) return null;
      continue;
    }
    let t1 = (min - o) / d;
    let t2 = (max - o) / d;
    let nearIsMin = true;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
      nearIsMin = false;
    }
    if (t1 > tmin) {
      tmin = t1;
      hitAxis = i;
      // normal: entering from min side or max side
      // if d>0 entering min face when nearIsMin after swap logic
    }
    tmax = Math.min(tmax, t2);
    if (tmax < tmin) return null;
  }
  const t = tmin >= 0 ? tmin : tmax >= 0 ? tmax : null;
  if (t == null || t < 0) return null;
  const hx = ox + dx * t;
  const hy = oy + dy * t;
  // approximate normal from closest face
  let nx = 0;
  let ny = 0;
  const eps = 1e-3;
  if (Math.abs(hx - b.x) < eps) nx = -1;
  else if (Math.abs(hx - (b.x + b.w)) < eps) nx = 1;
  else if (Math.abs(hy - b.y) < eps) ny = -1;
  else if (Math.abs(hy - (b.y + b.h)) < eps) ny = 1;
  else {
    // fallback from entry axis
    if (hitAxis === 0) nx = dx > 0 ? -1 : 1;
    else ny = dy > 0 ? -1 : 1;
  }
  return { t, x: hx, y: hy, nx, ny, target: "aabb" };
}

function dirVec() {
  let dx = dirEnd.x - origin.x;
  let dy = dirEnd.y - origin.y;
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  return { dx, dy, len };
}

function cast() {
  const { dx, dy } = dirVec();
  const hits = [];
  const hc = rayCircle(origin.x, origin.y, dx, dy, circle.x, circle.y, circle.r);
  if (hc) hits.push(hc);
  const hb = rayAabb(origin.x, origin.y, dx, dy, box);
  if (hb) hits.push(hb);
  hits.sort((a, b) => a.t - b.t);
  return { dx, dy, hits, nearest: hits[0] || null };
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const { dx, dy, nearest } = cast();
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  // box
  ctx.fillStyle = nearest?.target === "aabb" ? "rgba(224,122,95,0.35)" : "#3d4f66";
  ctx.strokeStyle = "#e07a5f";
  ctx.lineWidth = 2;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.strokeRect(box.x, box.y, box.w, box.h);

  // circle
  ctx.beginPath();
  ctx.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2);
  ctx.fillStyle =
    nearest?.target === "circle" ? "rgba(107,203,143,0.3)" : "rgba(91,159,212,0.25)";
  ctx.fill();
  ctx.strokeStyle = "#5b9fd4";
  ctx.stroke();

  // full ray
  const maxT = C.rayLen;
  ctx.strokeStyle = "rgba(154,171,191,0.35)";
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(origin.x + dx * maxT, origin.y + dy * maxT);
  ctx.stroke();
  ctx.setLineDash([]);

  // ray to hit or dir handle
  const endX = nearest ? nearest.x : dirEnd.x;
  const endY = nearest ? nearest.y : dirEnd.y;
  ctx.strokeStyle = nearest ? "#f2cc8f" : "#9aabbf";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // origin
  ctx.fillStyle = "#6bcb8f";
  ctx.beginPath();
  ctx.arc(origin.x, origin.y, 8, 0, Math.PI * 2);
  ctx.fill();

  // dir handle
  ctx.fillStyle = "#f2cc8f";
  ctx.beginPath();
  ctx.arc(dirEnd.x, dirEnd.y, 7, 0, Math.PI * 2);
  ctx.fill();

  if (nearest) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(nearest.x, nearest.y, 5, 0, Math.PI * 2);
    ctx.fill();
    // normal
    ctx.strokeStyle = "#e07a5f";
    ctx.beginPath();
    ctx.moveTo(nearest.x, nearest.y);
    ctx.lineTo(nearest.x + nearest.nx * 40, nearest.y + nearest.ny * 40);
    ctx.stroke();
  }

  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("緑=原点 · 黄=方向 · 白=ヒット · 赤線=法線", 12, H - 12);

  renderStats(nearest, dx, dy);
}

function renderStats(nearest, dx, dy) {
  if (statsEl) {
    statsEl.innerHTML = nearest
      ? `<table class="coord-table">
          <tr><td>ヒット</td><td>${nearest.target}</td></tr>
          <tr><td>t</td><td>${nearest.t.toFixed(2)}</td></tr>
          <tr><td>点</td><td>(${nearest.x.toFixed(0)}, ${nearest.y.toFixed(0)})</td></tr>
          <tr><td>法線</td><td>(${nearest.nx.toFixed(2)}, ${nearest.ny.toFixed(2)})</td></tr>
          <tr><td>方向</td><td>(${dx.toFixed(2)}, ${dy.toFixed(2)})</td></tr>
        </table>`
      : `<table class="coord-table">
          <tr><td>ヒット</td><td>なし</td></tr>
          <tr><td>方向</td><td>(${dx.toFixed(2)}, ${dy.toFixed(2)})</td></tr>
        </table>`;
  }
  setStatus(
    nearest
      ? `HIT ${nearest.target} t=${nearest.t.toFixed(2)}`
      : "ミス — 方向や図形を動かして"
  );
}

function pointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) * canvas.width) / rect.width,
    y: ((e.clientY - rect.top) * canvas.height) / rect.height,
  };
}

function hitKind(mx, my) {
  if (Math.hypot(mx - origin.x, my - origin.y) < 14) return "origin";
  if (Math.hypot(mx - dirEnd.x, my - dirEnd.y) < 14) return "dir";
  if (Math.hypot(mx - circle.x, my - circle.y) < circle.r) return "circle";
  if (
    mx >= box.x &&
    mx <= box.x + box.w &&
    my >= box.y &&
    my <= box.y + box.h
  ) {
    return "box";
  }
  return null;
}

canvas?.addEventListener("pointerdown", (e) => {
  const p = pointerPos(e);
  const k = hitKind(p.x, p.y);
  if (!k) return;
  canvas.setPointerCapture(e.pointerId);
  drag = k;
  dmx = p.x;
  dmy = p.y;
  if (k === "origin") {
    ox = origin.x;
    oy = origin.y;
  } else if (k === "dir") {
    ox = dirEnd.x;
    oy = dirEnd.y;
  } else if (k === "circle") {
    ox = circle.x;
    oy = circle.y;
  } else {
    ox = box.x;
    oy = box.y;
  }
});

canvas?.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const p = pointerPos(e);
  const dx = p.x - dmx;
  const dy = p.y - dmy;
  if (drag === "origin") {
    origin.x = ox + dx;
    origin.y = oy + dy;
  } else if (drag === "dir") {
    dirEnd.x = ox + dx;
    dirEnd.y = oy + dy;
  } else if (drag === "circle") {
    circle.x = ox + dx;
    circle.y = oy + dy;
  } else {
    box.x = ox + dx;
    box.y = oy + dy;
  }
  draw();
});

canvas?.addEventListener("pointerup", () => {
  drag = null;
});
canvas?.addEventListener("pointercancel", () => {
  drag = null;
});

function reset() {
  origin = { ...C.origin };
  dirEnd = {
    x: C.origin.x + C.dir.x * 200,
    y: C.origin.y + C.dir.y * 200,
  };
  circle = { ...C.circle };
  box = { ...C.box };
  drag = null;
  draw();
  setStatus("リセット");
}

btnReset?.addEventListener("click", reset);

loadTextSample(
  "../samples/RaycastShapesExample.cs",
  csharpSample,
  "// RaycastShapesExample.cs"
);
draw();
