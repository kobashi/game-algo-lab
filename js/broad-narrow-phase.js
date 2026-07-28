/**
 * Broad / Narrow Phase
 * @see docs/topics/broad-narrow-phase/SPEC.md
 */
import { BROAD_NARROW_PHASE_CONFIG as C } from "./maps/broad-narrow-phase-config.js";
import {
  createStatus,
  loadTextSample,
  mulberry32,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("bn-canvas")
);
const ctx = canvas.getContext("2d");
const nEl = /** @type {HTMLInputElement} */ (document.getElementById("count-n"));
const nVal = document.getElementById("n-val");
const showBroadEl = /** @type {HTMLInputElement} */ (
  document.getElementById("show-broad")
);
const statsEl = document.getElementById("bn-stats");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/**
 * @typedef {{ x: number, y: number, vx: number, vy: number, r: number }} Body
 * @type {Body[]}
 */
let bodies = [];
/** @type {[number, number][]} */
let broadPairs = [];
/** @type {[number, number][]} */
let narrowPairs = [];
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;

function readN() {
  const n = Math.min(
    C.maxN,
    Math.max(C.minN, Math.floor(Number(nEl?.value) || C.defaultN))
  );
  if (nVal) nVal.textContent = String(n);
  return n;
}

function spawn(n) {
  const rng = mulberry32(99 + n);
  bodies = [];
  for (let i = 0; i < n; i++) {
    const ang = rng() * Math.PI * 2;
    const sp = C.speed * (0.5 + rng());
    bodies.push({
      x: 50 + rng() * (canvas.width - 100),
      y: 50 + rng() * (canvas.height - 100),
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      r: C.radius,
    });
  }
}

/**
 * Broad: 同一 or 隣接セルのペア
 * @param {Body[]} list
 * @param {number} cell
 */
export function broadPhaseGrid(list, cell) {
  /** @type {Map<string, number[]>} */
  const map = new Map();
  for (let i = 0; i < list.length; i++) {
    const cx = Math.floor(list[i].x / cell);
    const cy = Math.floor(list[i].y / cell);
    const k = `${cx},${cy}`;
    if (!map.has(k)) map.set(k, []);
    map.get(k)?.push(i);
  }
  /** @type {[number, number][]} */
  const pairs = [];
  /** @type {Set<string>} */
  const seen = new Set();
  for (let i = 0; i < list.length; i++) {
    const cx = Math.floor(list[i].x / cell);
    const cy = Math.floor(list[i].y / cell);
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const arr = map.get(`${cx + ox},${cy + oy}`);
        if (!arr) continue;
        for (const j of arr) {
          if (j <= i) continue;
          const pk = `${i},${j}`;
          if (seen.has(pk)) continue;
          seen.add(pk);
          pairs.push([i, j]);
        }
      }
    }
  }
  return pairs;
}

/**
 * Narrow: 円の精密判定
 * @param {Body[]} list
 * @param {[number, number][]} broad
 */
export function narrowPhaseCircles(list, broad) {
  /** @type {[number, number][]} */
  const hits = [];
  for (const [i, j] of broad) {
    const dx = list[j].x - list[i].x;
    const dy = list[j].y - list[i].y;
    const rr = list[i].r + list[j].r;
    if (dx * dx + dy * dy <= rr * rr) hits.push([i, j]);
  }
  return hits;
}

function step(dt) {
  for (const b of bodies) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.x < b.r) {
      b.x = b.r;
      b.vx = Math.abs(b.vx);
    }
    if (b.x > canvas.width - b.r) {
      b.x = canvas.width - b.r;
      b.vx = -Math.abs(b.vx);
    }
    if (b.y < b.r) {
      b.y = b.r;
      b.vy = Math.abs(b.vy);
    }
    if (b.y > canvas.height - b.r) {
      b.y = canvas.height - b.r;
      b.vy = -Math.abs(b.vy);
    }
  }
  broadPairs = broadPhaseGrid(bodies, C.cell);
  narrowPairs = narrowPhaseCircles(bodies, broadPairs);
  draw();
  renderStats();
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const cell = C.cell;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(90, 106, 128, 0.3)";
  for (let x = 0; x < W; x += cell) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += cell) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  if (showBroadEl?.checked) {
    ctx.strokeStyle = "rgba(242, 204, 143, 0.25)";
    ctx.lineWidth = 1;
    for (const [i, j] of broadPairs) {
      ctx.beginPath();
      ctx.moveTo(bodies[i].x, bodies[i].y);
      ctx.lineTo(bodies[j].x, bodies[j].y);
      ctx.stroke();
    }
  }

  ctx.strokeStyle = "rgba(224, 122, 95, 0.85)";
  ctx.lineWidth = 2;
  for (const [i, j] of narrowPairs) {
    ctx.beginPath();
    ctx.moveTo(bodies[i].x, bodies[i].y);
    ctx.lineTo(bodies[j].x, bodies[j].y);
    ctx.stroke();
  }

  for (const b of bodies) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(91, 159, 212, 0.55)";
    ctx.fill();
  }

  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("黄=Broad候補 · 赤=Narrowヒット", 12, 18);
}

function renderStats() {
  const n = bodies.length;
  const brute = (n * (n - 1)) / 2;
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>n</td><td>${n}</td></tr>
        <tr><td>Broad 候補</td><td class="es-log-emit">${broadPairs.length}</td></tr>
        <tr><td>Narrow ヒット</td><td class="es-log-call">${narrowPairs.length}</td></tr>
        <tr><td>総当たりなら</td><td>${brute}</td></tr>
        <tr><td>Narrow/Broad</td><td>${
          broadPairs.length
            ? ((narrowPairs.length / broadPairs.length) * 100).toFixed(0)
            : 0
        }%</td></tr>
      </table>`;
  }
  setStatus(
    `Broad ${broadPairs.length} → Narrow ${narrowPairs.length}（総当 ${brute}）`
  );
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
  spawn(readN());
  step(0);
  setStatus("リセット — Broad と Narrow の件数差を見る");
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
nEl?.addEventListener("input", () => {
  readN();
  reset();
});
showBroadEl?.addEventListener("change", () => draw());

loadTextSample(
  "../samples/BroadNarrowPhaseExample.cs",
  csharpSample,
  "// BroadNarrowPhaseExample.cs"
);
if (nEl) nEl.value = String(C.defaultN);
reset();
