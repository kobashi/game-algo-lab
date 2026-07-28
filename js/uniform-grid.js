/**
 * 一様グリッド
 * @see docs/topics/uniform-grid/SPEC.md
 */
import { UNIFORM_GRID_CONFIG as C } from "./maps/uniform-grid-config.js";
import {
  createStatus,
  loadTextSample,
  mulberry32,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("ug-canvas")
);
const ctx = canvas.getContext("2d");
const nEl = /** @type {HTMLInputElement} */ (document.getElementById("count-n"));
const cellEl = /** @type {HTMLInputElement} */ (
  document.getElementById("cell-size")
);
const nVal = document.getElementById("n-val");
const cellVal = document.getElementById("cell-val");
const statsEl = document.getElementById("ug-stats");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/**
 * @typedef {{ x: number, y: number, vx: number, vy: number, r: number }} Body
 * @type {Body[]}
 */
let bodies = [];
let gridChecks = 0;
let bruteChecks = 0;
let hits = 0;
/** @type {[number, number][]} */
let hitPairs = [];
/** @type {Map<string, number[]>} */
let grid = new Map();
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
function readCell() {
  const c = Math.floor(Number(cellEl?.value) || C.defaultCell);
  if (cellVal) cellVal.textContent = String(c);
  return Math.max(16, c);
}

function spawn(n) {
  const rng = mulberry32(7 + n * 13);
  bodies = [];
  for (let i = 0; i < n; i++) {
    const ang = rng() * Math.PI * 2;
    const sp = C.speed * (0.5 + rng());
    bodies.push({
      x: 40 + rng() * (canvas.width - 80),
      y: 40 + rng() * (canvas.height - 80),
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      r: C.radius,
    });
  }
}

function cellKey(cx, cy) {
  return `${cx},${cy}`;
}

/**
 * @param {Body[]} list
 * @param {number} cell
 */
export function queryUniformGrid(list, cell) {
  /** @type {Map<string, number[]>} */
  const map = new Map();
  for (let i = 0; i < list.length; i++) {
    const cx = Math.floor(list[i].x / cell);
    const cy = Math.floor(list[i].y / cell);
    const k = cellKey(cx, cy);
    if (!map.has(k)) map.set(k, []);
    map.get(k)?.push(i);
  }

  let checks = 0;
  let h = 0;
  /** @type {[number, number][]} */
  const pairs = [];
  /** @type {Set<string>} */
  const seen = new Set();

  for (const [key, indices] of map) {
    const [cx, cy] = key.split(",").map(Number);
    /** @type {number[]} */
    const candidates = [];
    for (let ox = 0; ox <= 1; ox++) {
      for (let oy = 0; oy <= 1; oy++) {
        // self + right + bottom + bottom-right (avoid double count)
        const nk = cellKey(cx + ox, cy + oy);
        const arr = map.get(nk);
        if (arr) candidates.push(...arr);
      }
    }
    // also include only current cell pairs with itself fully via neighbors trick:
    // better: for each body, check 3x3 and use i<j pair key
  }

  // clearer approach: for each body, scan 3x3 cells
  for (let i = 0; i < list.length; i++) {
    const cx = Math.floor(list[i].x / cell);
    const cy = Math.floor(list[i].y / cell);
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const arr = map.get(cellKey(cx + ox, cy + oy));
        if (!arr) continue;
        for (const j of arr) {
          if (j <= i) continue;
          const pk = `${i},${j}`;
          if (seen.has(pk)) continue;
          seen.add(pk);
          checks += 1;
          const dx = list[j].x - list[i].x;
          const dy = list[j].y - list[i].y;
          const rr = list[i].r + list[j].r;
          if (dx * dx + dy * dy <= rr * rr) {
            h += 1;
            pairs.push([i, j]);
          }
        }
      }
    }
  }

  return { checks, hits: h, pairs, map };
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
  const cell = readCell();
  const res = queryUniformGrid(bodies, cell);
  gridChecks = res.checks;
  hits = res.hits;
  hitPairs = res.pairs;
  grid = res.map;
  const n = bodies.length;
  bruteChecks = (n * (n - 1)) / 2;
  draw(cell);
  renderStats();
}

function draw(cell) {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(90, 106, 128, 0.35)";
  ctx.lineWidth = 1;
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

  // occupied cells tint
  for (const [key, arr] of grid) {
    if (!arr.length) continue;
    const [cx, cy] = key.split(",").map(Number);
    ctx.fillStyle = "rgba(107, 203, 143, 0.08)";
    ctx.fillRect(cx * cell, cy * cell, cell, cell);
  }

  ctx.strokeStyle = "rgba(224, 122, 95, 0.55)";
  for (const [i, j] of hitPairs) {
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
  ctx.fillText("緑=占有セル · 隣接セル内だけ距離判定", 12, 18);
}

function renderStats() {
  const ratio = bruteChecks > 0 ? gridChecks / bruteChecks : 0;
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>n</td><td>${bodies.length}</td></tr>
        <tr><td>グリッド検査</td><td>${gridChecks}</td></tr>
        <tr><td>総当たりなら</td><td>${bruteChecks}</td></tr>
        <tr><td>比率</td><td>${(ratio * 100).toFixed(0)}%</td></tr>
        <tr><td>重なり</td><td>${hits}</td></tr>
        <tr><td>セル辺</td><td>${readCell()} px</td></tr>
      </table>`;
  }
  setStatus(
    `grid ${gridChecks} vs brute ${bruteChecks} (${(ratio * 100).toFixed(0)}%)`
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
  setStatus("リセット — セルサイズと n を変えて比較");
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
cellEl?.addEventListener("input", () => {
  readCell();
  step(0);
});

loadTextSample(
  "../samples/UniformGridExample.cs",
  csharpSample,
  "// UniformGridExample.cs"
);
if (nEl) nEl.value = String(C.defaultN);
if (cellEl) cellEl.value = String(C.defaultCell);
reset();
