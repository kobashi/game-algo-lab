/**
 * Verlet 積分 + 距離拘束（ロープ）
 */
import { VERLET_INTEGRATION_CONFIG as C } from "./maps/verlet-integration-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("vl-canvas")
);
const ctx = canvas.getContext("2d");
const gravEl = /** @type {HTMLInputElement} */ (document.getElementById("grav"));
const iterEl = /** @type {HTMLInputElement} */ (document.getElementById("iter"));
const gravVal = document.getElementById("grav-val");
const iterVal = document.getElementById("iter-val");
const statsEl = document.getElementById("vl-stats");
const btnPlay = document.getElementById("btn-play");
const btnStep = document.getElementById("btn-step");
const btnReset = document.getElementById("btn-reset");
const pinEl = /** @type {HTMLInputElement} */ (document.getElementById("pin-end"));
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/**
 * @typedef {{ x: number, y: number, px: number, py: number, pinned: boolean }} Particle
 */

/** @type {Particle[]} */
let pts = [];
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
/** @type {number | null} */
let dragIdx = null;

/**
 * Verlet step: x' = x + (x-px)*damp + a*dt^2
 * @param {Particle} p
 * @param {number} ax
 * @param {number} ay
 * @param {number} dt
 * @param {number} damp
 */
export function verletIntegrate(p, ax, ay, dt, damp) {
  if (p.pinned) {
    p.px = p.x;
    p.py = p.y;
    return;
  }
  const vx = (p.x - p.px) * damp;
  const vy = (p.y - p.py) * damp;
  const nx = p.x + vx + ax * dt * dt;
  const ny = p.y + vy + ay * dt * dt;
  p.px = p.x;
  p.py = p.y;
  p.x = nx;
  p.y = ny;
}

/**
 * Satisfy distance constraint between a-b (rest length L)
 * @param {Particle} a
 * @param {Particle} b
 * @param {number} rest
 */
export function solveDistance(a, b, rest) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 1e-6;
  const diff = (dist - rest) / dist;
  const ox = dx * 0.5 * diff;
  const oy = dy * 0.5 * diff;
  if (!a.pinned) {
    a.x += ox;
    a.y += oy;
  }
  if (!b.pinned) {
    b.x -= ox;
    b.y -= oy;
  }
}

function readGrav() {
  return Number(gravEl?.value) || C.gravity;
}
function readIter() {
  return Math.max(1, Number(iterEl?.value) || C.iterations);
}

function syncLabels() {
  if (gravVal) gravVal.textContent = String(readGrav());
  if (iterVal) iterVal.textContent = String(readIter());
}

function initRope() {
  pts = [];
  const n = C.pointCount;
  const startX = 120;
  const startY = 40;
  for (let i = 0; i < n; i++) {
    const x = startX + i * C.restLen * 0.15;
    const y = startY + i * C.restLen * 0.3;
    pts.push({
      x,
      y,
      px: x,
      py: y,
      pinned: i === 0,
    });
  }
  if (pinEl?.checked && pts.length) {
    pts[pts.length - 1].pinned = true;
  }
}

function applyPinEnd() {
  if (!pts.length) return;
  pts[0].pinned = true;
  for (let i = 1; i < pts.length - 1; i++) pts[i].pinned = false;
  pts[pts.length - 1].pinned = !!pinEl?.checked;
}

/**
 * @param {number} dt
 */
export function simulate(dt, g, iters) {
  const damp = C.damping;
  for (const p of pts) {
    verletIntegrate(p, 0, g, dt, damp);
    // floor
    if (!p.pinned && p.y > canvas.height - 12) {
      p.y = canvas.height - 12;
      p.py = p.y;
    }
    if (!p.pinned && p.x < 8) {
      p.x = 8;
      p.px = p.x;
    }
    if (!p.pinned && p.x > canvas.width - 8) {
      p.x = canvas.width - 8;
      p.px = p.x;
    }
  }
  for (let k = 0; k < iters; k++) {
    for (let i = 0; i < pts.length - 1; i++) {
      solveDistance(pts[i], pts[i + 1], C.restLen);
    }
  }
  // re-assert pins
  for (const p of pts) {
    if (p.pinned) {
      p.px = p.x;
      p.py = p.y;
    }
  }
}

function step(dt) {
  applyPinEnd();
  simulate(dt, readGrav(), readIter());
  draw();
  let stretch = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    stretch += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
  }
  const ideal = C.restLen * (pts.length - 1);
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>点</td><td>${pts.length}</td></tr>
        <tr><td>拘束反復</td><td>${readIter()}</td></tr>
        <tr><td>全長 / 理想</td><td>${stretch.toFixed(0)} / ${ideal.toFixed(0)}</td></tr>
      </table>`;
  }
  setStatus(
    `g=${readGrav()} · iters=${readIter()} · ドラッグで点を掴む`
  );
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);
  // floor line
  ctx.strokeStyle = "#3d4f66";
  ctx.beginPath();
  ctx.moveTo(0, H - 12);
  ctx.lineTo(W, H - 12);
  ctx.stroke();

  ctx.strokeStyle = "#5b9fd4";
  ctx.lineWidth = 3;
  ctx.beginPath();
  pts.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  ctx.lineWidth = 1;

  for (const p of pts) {
    ctx.fillStyle = p.pinned ? "#e07a5f" : "#6bcb8f";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

function loop(ts) {
  if (!running) return;
  if (!lastTs) lastTs = ts;
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (dt > 0.033) dt = 0.033;
  step(dt);
  rafId = requestAnimationFrame(loop);
}

function pointerPos(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) * canvas.width) / r.width,
    y: ((e.clientY - r.top) * canvas.height) / r.height,
  };
}

canvas.addEventListener("pointerdown", (e) => {
  const p = pointerPos(e);
  let best = -1;
  let bd = 20;
  for (let i = 0; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - p.x, pts[i].y - p.y);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  if (best >= 0) {
    dragIdx = best;
    canvas.setPointerCapture(e.pointerId);
  }
});
canvas.addEventListener("pointermove", (e) => {
  if (dragIdx == null) return;
  const p = pointerPos(e);
  const pt = pts[dragIdx];
  pt.x = p.x;
  pt.y = p.y;
  pt.px = p.x;
  pt.py = p.y;
  draw();
});
canvas.addEventListener("pointerup", () => {
  dragIdx = null;
});

gravEl?.addEventListener("input", syncLabels);
iterEl?.addEventListener("input", syncLabels);
pinEl?.addEventListener("change", () => {
  applyPinEnd();
  draw();
});

btnPlay?.addEventListener("click", () => {
  if (running) {
    running = false;
    if (rafId != null) cancelAnimationFrame(rafId);
    if (btnPlay) btnPlay.textContent = "再生";
    return;
  }
  running = true;
  lastTs = 0;
  if (btnPlay) btnPlay.textContent = "一時停止";
  rafId = requestAnimationFrame(loop);
});
btnStep?.addEventListener("click", () => step(1 / 60));
btnReset?.addEventListener("click", () => {
  running = false;
  if (rafId != null) cancelAnimationFrame(rafId);
  if (btnPlay) btnPlay.textContent = "再生";
  initRope();
  draw();
  setStatus("リセット");
});

loadTextSample(
  "../samples/VerletIntegrationExample.cs",
  csharpSample,
  "// VerletIntegrationExample.cs"
);
initRope();
syncLabels();
draw();
setStatus("再生で重力 · 赤=固定 · 緑=自由 · 点をドラッグ");
