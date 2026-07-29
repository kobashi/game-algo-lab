/**
 * Poisson disk — Bridson 風サンプリング
 */
import { POISSON_DISK_CONFIG as C } from "./maps/poisson-disk-config.js";
import {
  createStatus,
  loadTextSample,
  mulberry32,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("pd-canvas")
);
const ctx = canvas.getContext("2d");
const minEl = /** @type {HTMLInputElement} */ (document.getElementById("min-dist"));
const kEl = /** @type {HTMLInputElement} */ (document.getElementById("k-tries"));
const seedEl = /** @type {HTMLInputElement} */ (document.getElementById("seed"));
const minVal = document.getElementById("min-val");
const kVal = document.getElementById("k-val");
const statsEl = document.getElementById("pd-stats");
const btnGen = document.getElementById("btn-gen");
const btnUniform = document.getElementById("btn-uniform");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

const W = C.width;
const H = C.height;

/** @type {{x:number,y:number}[]} */
let points = [];
/** @type {{x:number,y:number}[]} */
let uniformPts = [];
let showUniform = false;

function readMin() {
  return Number(minEl?.value) || C.defaultMinDist;
}
function readK() {
  return Math.floor(Number(kEl?.value) || C.defaultK);
}
function readSeed() {
  return Number(seedEl?.value) || 42;
}

/**
 * Bridson Poisson disk sampling.
 * @param {number} width
 * @param {number} height
 * @param {number} r min distance
 * @param {number} k attempts
 * @param {() => number} rand
 */
export function poissonDisk(width, height, r, k, rand) {
  const cell = r / Math.SQRT2;
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  /** @type {(number|null)[][]} */
  const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
  /** @type {{x:number,y:number}[]} */
  const pts = [];
  /** @type {number[]} */
  const active = [];

  function gi(x, y) {
    return {
      i: Math.floor(x / cell),
      j: Math.floor(y / cell),
    };
  }

  function far(x, y) {
    const { i, j } = gi(x, y);
    for (let jj = Math.max(0, j - 2); jj <= Math.min(rows - 1, j + 2); jj++) {
      for (let ii = Math.max(0, i - 2); ii <= Math.min(cols - 1, i + 2); ii++) {
        const idx = grid[jj][ii];
        if (idx == null) continue;
        const p = pts[idx];
        if (Math.hypot(p.x - x, p.y - y) < r) return false;
      }
    }
    return true;
  }

  const x0 = rand() * width;
  const y0 = rand() * height;
  pts.push({ x: x0, y: y0 });
  const g0 = gi(x0, y0);
  if (g0.i >= 0 && g0.i < cols && g0.j >= 0 && g0.j < rows) {
    grid[g0.j][g0.i] = 0;
  }
  active.push(0);

  while (active.length) {
    const ai = Math.floor(rand() * active.length);
    const pi = active[ai];
    const p = pts[pi];
    let found = false;
    for (let t = 0; t < k; t++) {
      const ang = rand() * Math.PI * 2;
      const rad = r * (1 + rand());
      const nx = p.x + Math.cos(ang) * rad;
      const ny = p.y + Math.sin(ang) * rad;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      if (!far(nx, ny)) continue;
      const ni = pts.length;
      pts.push({ x: nx, y: ny });
      const g = gi(nx, ny);
      grid[g.j][g.i] = ni;
      active.push(ni);
      found = true;
      break;
    }
    if (!found) {
      active.splice(ai, 1);
    }
  }
  return pts;
}

/**
 * Uniform random points (same count target approx via fixed N).
 */
export function uniformSample(width, height, n, rand) {
  /** @type {{x:number,y:number}[]} */
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ x: rand() * width, y: rand() * height });
  }
  return out;
}

/**
 * Min pairwise distance in set.
 */
export function minPairDist(pts) {
  let m = Infinity;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      m = Math.min(m, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y));
    }
  }
  return m === Infinity ? 0 : m;
}

function generate() {
  const rng = mulberry32(readSeed() >>> 0);
  points = poissonDisk(W, H, readMin(), readK(), rng);
  const rng2 = mulberry32((readSeed() + 1) >>> 0);
  uniformPts = uniformSample(W, H, points.length, rng2);
  showUniform = false;
  draw();
  const md = minPairDist(points);
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>点数</td><td>${points.length}</td></tr>
        <tr><td>最小距離 r</td><td>${readMin()}</td></tr>
        <tr><td>実測 min ペア</td><td>${md.toFixed(1)}</td></tr>
        <tr><td>k 試行</td><td>${readK()}</td></tr>
      </table>`;
  }
  setStatus(`Poisson ${points.length} 点 · minペア ${md.toFixed(1)} ≥ r≈${readMin()}`);
}

function draw() {
  if (!ctx) return;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);
  const r = readMin() / 2;
  const list = showUniform ? uniformPts : points;
  const col = showUniform ? "#e07a5f" : "#6bcb8f";
  for (const p of list) {
    if (!showUniform) {
      ctx.strokeStyle = "rgba(91, 159, 212, 0.15)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

minEl?.addEventListener("input", () => {
  if (minVal) minVal.textContent = String(readMin());
});
kEl?.addEventListener("input", () => {
  if (kVal) kVal.textContent = String(readK());
});
btnGen?.addEventListener("click", generate);
btnUniform?.addEventListener("click", () => {
  showUniform = !showUniform;
  draw();
  if (showUniform) {
    const md = minPairDist(uniformPts);
    setStatus(`一様乱択 ${uniformPts.length} 点 · minペア ${md.toFixed(1)}（クラスタしやすい）`);
    if (btnUniform) btnUniform.textContent = "Poisson を表示";
  } else {
    setStatus(`Poisson ${points.length} 点`);
    if (btnUniform) btnUniform.textContent = "一様と比較";
  }
});

loadTextSample(
  "../samples/PoissonDiskExample.cs",
  csharpSample,
  "// PoissonDiskExample.cs"
);
canvas.width = W;
canvas.height = H;
if (minVal) minVal.textContent = String(readMin());
if (kVal) kVal.textContent = String(readK());
generate();
