/**
 * 回転中の衝突 — OBB + SAT + 簡易応答
 */
import { ROTATING_COLLISION_CONFIG as C } from "./maps/rotating-collision-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("rcoll-canvas")
);
const ctx = canvas.getContext("2d");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const statsEl = document.getElementById("rcoll-stats");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** @typedef {{ x:number,y:number,hw:number,hh:number,angle:number,vx:number,vy:number,omega:number }} Obb */

/** @type {Obb} */
let A = { ...C.a };
/** @type {Obb} */
let B = { ...C.b };
let hit = false;
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;

function corners(o) {
  const c = Math.cos(o.angle);
  const s = Math.sin(o.angle);
  return [
    [-o.hw, -o.hh],
    [o.hw, -o.hh],
    [o.hw, o.hh],
    [-o.hw, o.hh],
  ].map(([lx, ly]) => ({
    x: o.x + lx * c - ly * s,
    y: o.y + lx * s + ly * c,
  }));
}

function axes(o) {
  const c = Math.cos(o.angle);
  const s = Math.sin(o.angle);
  return [
    { x: c, y: s },
    { x: -s, y: c },
  ];
}

function project(cs, axis) {
  let min = Infinity;
  let max = -Infinity;
  for (const p of cs) {
    const d = p.x * axis.x + p.y * axis.y;
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return { min, max };
}

export function satOverlap(a, b) {
  const ca = corners(a);
  const cb = corners(b);
  const axs = [...axes(a), ...axes(b)];
  let minOverlap = Infinity;
  let n = { x: 1, y: 0 };
  for (const ax of axs) {
    const len = Math.hypot(ax.x, ax.y) || 1;
    const u = { x: ax.x / len, y: ax.y / len };
    const pa = project(ca, u);
    const pb = project(cb, u);
    if (pa.max < pb.min || pb.max < pa.min) return { hit: false, n, overlap: 0 };
    const ov = Math.min(pa.max, pb.max) - Math.max(pa.min, pb.min);
    if (ov < minOverlap) {
      minOverlap = ov;
      n = u;
    }
  }
  // normal should push A away from B
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  if (dx * n.x + dy * n.y < 0) {
    n = { x: -n.x, y: -n.y };
  }
  return { hit: true, n, overlap: minOverlap };
}

function walls(o) {
  if (o.x < 60) {
    o.x = 60;
    o.vx = Math.abs(o.vx);
  }
  if (o.x > canvas.width - 60) {
    o.x = canvas.width - 60;
    o.vx = -Math.abs(o.vx);
  }
  if (o.y < 60) {
    o.y = 60;
    o.vy = Math.abs(o.vy);
  }
  if (o.y > canvas.height - 60) {
    o.y = canvas.height - 60;
    o.vy = -Math.abs(o.vy);
  }
}

function integrate(o, dt) {
  o.x += o.vx * dt;
  o.y += o.vy * dt;
  o.angle += o.omega * dt;
  walls(o);
}

function resolve() {
  const r = satOverlap(A, B);
  hit = r.hit;
  if (!r.hit) return;
  const push = r.overlap / 2 + 0.5;
  A.x += r.n.x * push;
  A.y += r.n.y * push;
  B.x -= r.n.x * push;
  B.y -= r.n.y * push;
  // bounce relative velocity along normal
  const rvx = A.vx - B.vx;
  const rvy = A.vy - B.vy;
  const vn = rvx * r.n.x + rvy * r.n.y;
  if (vn < 0) {
    const j = -(1 + C.restitution) * vn * 0.5;
    A.vx += j * r.n.x;
    A.vy += j * r.n.y;
    B.vx -= j * r.n.x;
    B.vy -= j * r.n.y;
  }
  A.omega *= 0.85;
  B.omega *= 0.85;
}

function step(dt) {
  integrate(A, dt);
  integrate(B, dt);
  resolve();
  draw();
  renderStats();
}

function drawObb(o, color, fill) {
  if (!ctx) return;
  const cs = corners(o);
  ctx.beginPath();
  ctx.moveTo(cs[0].x, cs[0].y);
  for (let i = 1; i < 4; i++) ctx.lineTo(cs[i].x, cs[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function draw() {
  if (!ctx) return;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawObb(A, "#5b9fd4", hit ? "rgba(91,159,212,0.45)" : "rgba(91,159,212,0.2)");
  drawObb(B, "#e07a5f", hit ? "rgba(224,122,95,0.45)" : "rgba(224,122,95,0.2)");
  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("回転 OBB × SAT 応答 · 重なると押し戻し+ω減衰", 12, 18);
}

function renderStats() {
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>衝突</td><td>${hit ? "HIT" : "miss"}</td></tr>
        <tr><td>ωA / ωB</td><td>${A.omega.toFixed(2)} / ${B.omega.toFixed(2)}</td></tr>
        <tr><td>θA / θB°</td><td>${((A.angle * 180) / Math.PI).toFixed(0)} / ${((B.angle * 180) / Math.PI).toFixed(0)}</td></tr>
      </table>`;
  }
  setStatus(hit ? "衝突中" : "分離");
}

function loop(ts) {
  if (!running) return;
  if (!lastTs) lastTs = ts;
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (dt > 0.05) dt = 0.05;
  step(dt);
  rafId = requestAnimationFrame(loop);
}

function stop() {
  running = false;
  if (rafId != null) cancelAnimationFrame(rafId);
  rafId = null;
  if (btnPlay) btnPlay.textContent = "再生";
}

function reset() {
  stop();
  A = { ...C.a };
  B = { ...C.b };
  hit = false;
  draw();
  renderStats();
  setStatus("リセット");
}

btnPlay?.addEventListener("click", () => {
  if (running) {
    stop();
    return;
  }
  running = true;
  lastTs = 0;
  if (btnPlay) btnPlay.textContent = "一時停止";
  rafId = requestAnimationFrame(loop);
});
btnReset?.addEventListener("click", reset);

loadTextSample(
  "../samples/RotatingCollisionExample.cs",
  csharpSample,
  "// RotatingCollisionExample.cs"
);
reset();
