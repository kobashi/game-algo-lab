/**
 * 空間ハッシュ — 近傍候補
 */
import { SPATIAL_HASH_CONFIG as C } from "./maps/spatial-hash-config.js";
import {
  createStatus,
  loadTextSample,
  mulberry32,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("sh-canvas")
);
const ctx = canvas.getContext("2d");
const cellEl = /** @type {HTMLInputElement} */ (
  document.getElementById("cell-size")
);
const nEl = /** @type {HTMLInputElement} */ (document.getElementById("count"));
const cellVal = document.getElementById("cell-val");
const nVal = document.getElementById("count-val");
const statsEl = document.getElementById("sh-stats");
const btnRebuild = document.getElementById("btn-rebuild");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** @typedef {{ id: number, x: number, y: number }} Body */

/** @type {Body[]} */
let bodies = [];
/** @type {Map<string, number[]>} */
let buckets = new Map();
let queryId = 0;
let cellSize = C.defaultCell;

/**
 * @param {number} x
 * @param {number} y
 * @param {number} cs
 */
export function cellKey(x, y, cs) {
  const cx = Math.floor(x / cs);
  const cy = Math.floor(y / cs);
  return `${cx},${cy}`;
}

/**
 * @param {Body[]} list
 * @param {number} cs
 */
export function buildHash(list, cs) {
  /** @type {Map<string, number[]>} */
  const m = new Map();
  for (const b of list) {
    const k = cellKey(b.x, b.y, cs);
    if (!m.has(k)) m.set(k, []);
    m.get(k)?.push(b.id);
  }
  return m;
}

/**
 * Neighbor keys including self (3×3).
 */
export function neighborKeys(x, y, cs) {
  const cx = Math.floor(x / cs);
  const cy = Math.floor(y / cs);
  /** @type {string[]} */
  const keys = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      keys.push(`${cx + dx},${cy + dy}`);
    }
  }
  return keys;
}

/**
 * @returns {{ candidates: number, brute: number, hits: number }}
 */
export function queryStats(list, map, q, cs, rad) {
  const keys = neighborKeys(q.x, q.y, cs);
  const candSet = new Set();
  for (const k of keys) {
    const arr = map.get(k);
    if (arr) for (const id of arr) candSet.add(id);
  }
  let hits = 0;
  for (const id of candSet) {
    if (id === q.id) continue;
    const b = list[id];
    if (Math.hypot(b.x - q.x, b.y - q.y) < rad * 2) hits += 1;
  }
  let bruteHits = 0;
  for (const b of list) {
    if (b.id === q.id) continue;
    if (Math.hypot(b.x - q.x, b.y - q.y) < rad * 2) bruteHits += 1;
  }
  return {
    candidates: candSet.size - 1,
    brute: list.length - 1,
    hits: hits,
  };
}

function readCell() {
  return Math.max(16, Math.floor(Number(cellEl?.value) || C.defaultCell));
}
function readN() {
  return Math.max(5, Math.min(120, Math.floor(Number(nEl?.value) || C.defaultN)));
}

function syncLabels() {
  if (cellVal) cellVal.textContent = String(readCell());
  if (nVal) nVal.textContent = String(readN());
}

function rebuild() {
  const rng = mulberry32(7);
  const n = readN();
  cellSize = readCell();
  bodies = [];
  for (let i = 0; i < n; i++) {
    bodies.push({
      id: i,
      x: 20 + rng() * (C.worldSize - 40),
      y: 20 + rng() * (C.worldSize - 40),
    });
  }
  buckets = buildHash(bodies, cellSize);
  queryId = 0;
  draw();
  setStatus(`再構築 n=${n} cell=${cellSize}`);
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const scale = Math.min(W, H) / C.worldSize;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  // grid
  ctx.strokeStyle = "rgba(90,106,128,0.35)";
  for (let x = 0; x <= C.worldSize; x += cellSize) {
    ctx.beginPath();
    ctx.moveTo(x * scale, 0);
    ctx.lineTo(x * scale, C.worldSize * scale);
    ctx.stroke();
  }
  for (let y = 0; y <= C.worldSize; y += cellSize) {
    ctx.beginPath();
    ctx.moveTo(0, y * scale);
    ctx.lineTo(C.worldSize * scale, y * scale);
    ctx.stroke();
  }

  const q = bodies[queryId];
  if (!q) return;
  const nkeys = new Set(neighborKeys(q.x, q.y, cellSize));
  const cand = new Set();
  for (const k of nkeys) {
    const arr = buckets.get(k);
    if (arr) for (const id of arr) cand.add(id);
  }

  // highlight neighbor cells
  for (const k of nkeys) {
    const [cx, cy] = k.split(",").map(Number);
    ctx.fillStyle = "rgba(107,203,143,0.12)";
    ctx.fillRect(
      cx * cellSize * scale,
      cy * cellSize * scale,
      cellSize * scale,
      cellSize * scale
    );
  }

  for (const b of bodies) {
    const isQ = b.id === queryId;
    const isCand = cand.has(b.id);
    ctx.fillStyle = isQ ? "#e07a5f" : isCand ? "#f2cc8f" : "#5b9fd4";
    ctx.beginPath();
    ctx.arc(b.x * scale, b.y * scale, C.radius * scale * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  // query radius
  ctx.strokeStyle = "rgba(224,122,95,0.6)";
  ctx.beginPath();
  ctx.arc(q.x * scale, q.y * scale, C.radius * 2 * scale, 0, Math.PI * 2);
  ctx.stroke();

  const st = queryStats(bodies, buckets, q, cellSize, C.radius);
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>クエリ</td><td>#${queryId}</td></tr>
        <tr><td>候補（3×3）</td><td>${st.candidates}</td></tr>
        <tr><td>総当たり</td><td>${st.brute}</td></tr>
        <tr><td>実際の近傍ヒット</td><td>${st.hits}</td></tr>
        <tr><td>バケット数</td><td>${buckets.size}</td></tr>
      </table>`;
  }
  setStatus(
    `候補 ${st.candidates} / 総当り ${st.brute}（cell=${cellSize}）`
  );
}

canvas.addEventListener("pointerdown", (e) => {
  const r = canvas.getBoundingClientRect();
  const scale = Math.min(canvas.width, canvas.height) / C.worldSize;
  const x = ((e.clientX - r.left) * canvas.width) / r.width / scale;
  const y = ((e.clientY - r.top) * canvas.height) / r.height / scale;
  let best = 0;
  let bestD = Infinity;
  for (const b of bodies) {
    const d = Math.hypot(b.x - x, b.y - y);
    if (d < bestD) {
      bestD = d;
      best = b.id;
    }
  }
  queryId = best;
  draw();
});

btnRebuild?.addEventListener("click", () => {
  syncLabels();
  rebuild();
});
for (const el of [cellEl, nEl]) {
  el?.addEventListener("input", () => {
    syncLabels();
  });
  el?.addEventListener("change", () => {
    syncLabels();
    rebuild();
  });
}

loadTextSample(
  "../samples/SpatialHashExample.cs",
  csharpSample,
  "// SpatialHashExample.cs"
);
if (cellEl) cellEl.value = String(C.defaultCell);
if (nEl) nEl.value = String(C.defaultN);
syncLabels();
rebuild();
