/**
 * Sweep and Prune（1 軸）
 * @see docs/topics/sweep-and-prune/SPEC.md
 */
import { SWEEP_AND_PRUNE_CONFIG as C } from "./maps/sweep-and-prune-config.js";
import {
  createStatus,
  loadTextSample,
  mulberry32,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("sap-canvas")
);
const ctx = canvas.getContext("2d");
const nEl = /** @type {HTMLInputElement} */ (document.getElementById("count-n"));
const nVal = document.getElementById("n-val");
const statsEl = document.getElementById("sap-stats");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/**
 * @typedef {{ x: number, y: number, vx: number, vy: number, hw: number, hh: number }} Box
 * @type {Box[]}
 */
let boxes = [];
/** @type {[number, number][]} */
let broadPairs = [];
/** @type {[number, number][]} */
let hits = [];
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
  const rng = mulberry32(3 + n * 11);
  boxes = [];
  for (let i = 0; i < n; i++) {
    const ang = rng() * Math.PI * 2;
    const sp = C.speed * (0.4 + rng());
    boxes.push({
      x: 40 + rng() * (canvas.width - 80),
      y: 40 + rng() * (canvas.height - 80),
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      hw: C.halfW * (0.7 + rng() * 0.6),
      hh: C.halfH * (0.7 + rng() * 0.6),
    });
  }
}

/**
 * @param {Box[]} list
 */
export function sweepAndPruneX(list) {
  /** @type {{ id: number, min: number, max: number }[]} */
  const intervals = list.map((b, id) => ({
    id,
    min: b.x - b.hw,
    max: b.x + b.hw,
  }));
  intervals.sort((a, b) => a.min - b.min);
  /** @type {{ id: number, min: number, max: number }[]} */
  const active = [];
  /** @type {[number, number][]} */
  const pairs = [];
  for (const cur of intervals) {
    for (let k = active.length - 1; k >= 0; k--) {
      if (active[k].max < cur.min) active.splice(k, 1);
    }
    for (const a of active) {
      const i = Math.min(a.id, cur.id);
      const j = Math.max(a.id, cur.id);
      pairs.push([i, j]);
    }
    active.push(cur);
  }
  return pairs;
}

function aabbHit(a, b) {
  return (
    Math.abs(a.x - b.x) <= a.hw + b.hw && Math.abs(a.y - b.y) <= a.hh + b.hh
  );
}

function step(dt) {
  for (const b of boxes) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.x - b.hw < 0) {
      b.x = b.hw;
      b.vx = Math.abs(b.vx);
    }
    if (b.x + b.hw > canvas.width) {
      b.x = canvas.width - b.hw;
      b.vx = -Math.abs(b.vx);
    }
    if (b.y - b.hh < 0) {
      b.y = b.hh;
      b.vy = Math.abs(b.vy);
    }
    if (b.y + b.hh > canvas.height) {
      b.y = canvas.height - b.hh;
      b.vy = -Math.abs(b.vy);
    }
  }
  broadPairs = sweepAndPruneX(boxes);
  hits = broadPairs.filter(([i, j]) => aabbHit(boxes[i], boxes[j]));
  draw();
  renderStats();
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  // X projection lanes at bottom
  const laneY = H - 28;
  ctx.strokeStyle = "rgba(90,106,128,0.5)";
  ctx.beginPath();
  ctx.moveTo(0, laneY);
  ctx.lineTo(W, laneY);
  ctx.stroke();

  // broad pairs (x-overlap candidates)
  ctx.strokeStyle = "rgba(242, 204, 143, 0.3)";
  ctx.lineWidth = 1;
  for (const [i, j] of broadPairs) {
    ctx.beginPath();
    ctx.moveTo(boxes[i].x, boxes[i].y);
    ctx.lineTo(boxes[j].x, boxes[j].y);
    ctx.stroke();
  }

  // full AABB hits
  ctx.strokeStyle = "rgba(224, 122, 95, 0.85)";
  ctx.lineWidth = 2;
  for (const [i, j] of hits) {
    ctx.beginPath();
    ctx.moveTo(boxes[i].x, boxes[i].y);
    ctx.lineTo(boxes[j].x, boxes[j].y);
    ctx.stroke();
  }

  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    ctx.strokeStyle = "#5b9fd4";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(b.x - b.hw, b.y - b.hh, b.hw * 2, b.hh * 2);
    // interval on axis
    ctx.strokeStyle = "#f2cc8f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x - b.hw, laneY);
    ctx.lineTo(b.x + b.hw, laneY);
    ctx.stroke();
    ctx.fillStyle = "#9aabbf";
    ctx.font = "10px sans-serif";
    ctx.fillText(String(i), b.x - 4, laneY - 6);
  }

  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("下帯= X 区間 · 黄=X候補 · 赤=AABB ヒット", 12, 18);
}

function renderStats() {
  const n = boxes.length;
  const brute = (n * (n - 1)) / 2;
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>n</td><td>${n}</td></tr>
        <tr><td>X 候補 (SaP)</td><td>${broadPairs.length}</td></tr>
        <tr><td>AABB ヒット</td><td>${hits.length}</td></tr>
        <tr><td>総当たり</td><td>${brute}</td></tr>
        <tr><td>候補/総当</td><td>${
          brute ? ((broadPairs.length / brute) * 100).toFixed(0) : 0
        }%</td></tr>
      </table>`;
  }
  setStatus(`SaP 候補 ${broadPairs.length} → ヒット ${hits.length}`);
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
  setStatus("リセット — X 軸 Sweep and Prune");
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

loadTextSample(
  "../samples/SweepAndPruneExample.cs",
  csharpSample,
  "// SweepAndPruneExample.cs"
);
if (nEl) nEl.value = String(C.defaultN);
reset();
