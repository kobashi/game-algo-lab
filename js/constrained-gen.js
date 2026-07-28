/**
 * 制約付き生成 — 乱択 + BFS 到達性
 * @see docs/topics/constrained-gen/SPEC.md
 */
import { CONSTRAINED_GEN_CONFIG as C } from "./maps/constrained-gen-config.js";
import {
  createStatus,
  createResultPanel,
  loadTextSample,
  mulberry32,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("cg-canvas")
);
const ctx = canvas.getContext("2d");
const seedEl = /** @type {HTMLInputElement} */ (document.getElementById("seed"));
const wallProbEl = /** @type {HTMLInputElement} */ (
  document.getElementById("wall-prob")
);
const wallProbVal = document.getElementById("wall-prob-val");
const btnGen = document.getElementById("btn-gen");
const btnOnce = document.getElementById("btn-once");
const btnReset = document.getElementById("btn-reset");
const statsEl = document.getElementById("cg-stats");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));
const resultPanel = createResultPanel(
  document.getElementById("result-compare")
);

/** @type {boolean[][]} true = wall */
let walls = [];
/** @type {Set<string>} */
let reachable = new Set();
let attempts = 0;
let accepted = false;
let lastPathLen = -1;

function key(x, y) {
  return `${x},${y}`;
}

function readSeed() {
  return (Math.floor(Number(seedEl?.value) || C.defaultSeed) >>> 0) || 1;
}
function readWallProb() {
  const p = Number(wallProbEl?.value) || C.wallProb;
  if (wallProbVal) wallProbVal.textContent = p.toFixed(2);
  return Math.min(0.7, Math.max(0.05, p));
}

/**
 * @param {() => number} rng
 * @param {number} wallProb
 */
export function randomWalls(rng, wallProb) {
  /** @type {boolean[][]} */
  const g = [];
  for (let y = 0; y < C.rows; y++) {
    const row = [];
    for (let x = 0; x < C.cols; x++) {
      const border = x === 0 || y === 0 || x === C.cols - 1 || y === C.rows - 1;
      row.push(border ? true : rng() < wallProb);
    }
    g.push(row);
  }
  g[C.start.y][C.start.x] = false;
  g[C.goal.y][C.goal.x] = false;
  return g;
}

/**
 * @param {boolean[][]} wall
 * @param {{x:number,y:number}} s
 * @param {{x:number,y:number}} goal
 */
export function bfsReachable(wall, s, goal) {
  const seen = new Set();
  /** @type {{x:number,y:number,dist:number}[]} */
  const q = [{ x: s.x, y: s.y, dist: 0 }];
  seen.add(key(s.x, s.y));
  const parent = new Map();
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (q.length) {
    const cur = q.shift();
    if (!cur) break;
    if (cur.x === goal.x && cur.y === goal.y) {
      return { ok: true, dist: cur.dist, seen, parent };
    }
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= C.cols || ny >= C.rows) continue;
      if (wall[ny][nx]) continue;
      const k = key(nx, ny);
      if (seen.has(k)) continue;
      seen.add(k);
      parent.set(k, key(cur.x, cur.y));
      q.push({ x: nx, y: ny, dist: cur.dist + 1 });
    }
  }
  return { ok: false, dist: -1, seen, parent };
}

function applyResult(wall, res) {
  walls = wall;
  reachable = res.seen;
  accepted = res.ok;
  lastPathLen = res.dist;
  draw();
  renderStats();
}

function generateUntilOk() {
  const baseSeed = readSeed();
  const wallProb = readWallProb();
  attempts = 0;
  for (let a = 0; a < C.maxAttempts; a++) {
    attempts = a + 1;
    // diversify each attempt from base seed
    const rng = mulberry32((baseSeed + a * 9973) >>> 0 || 1);
    const wall = randomWalls(rng, wallProb);
    const res = bfsReachable(wall, C.start, C.goal);
    if (res.ok) {
      applyResult(wall, res);
      setStatus(`受理 · 試行 ${attempts} 回 · 経路長 ${res.dist}`);
      resultPanel.show(`
        <p class="result-verdict">制約満足: S→G 到達可能</p>
        <p class="result-note">棄却 ${attempts - 1} 回のあと受理。経路長 ${res.dist}（BFS 最短歩数）</p>
      `);
      return;
    }
  }
  // show last failed
  const rng = mulberry32((baseSeed + C.maxAttempts * 9973) >>> 0 || 1);
  const wall = randomWalls(rng, wallProb);
  const res = bfsReachable(wall, C.start, C.goal);
  applyResult(wall, res);
  setStatus(`最大試行 ${C.maxAttempts} で未達 — 壁確率を下げて再試行`);
  resultPanel.show(`
    <p class="result-verdict">制約未達</p>
    <p class="result-note">壁確率やシードを変えてください</p>
  `);
}

function generateOnce() {
  attempts = 1;
  const rng = mulberry32(readSeed());
  const wall = randomWalls(rng, readWallProb());
  const res = bfsReachable(wall, C.start, C.goal);
  applyResult(wall, res);
  setStatus(
    res.ok
      ? `1回生成 · 到達 OK · 経路長 ${res.dist}`
      : "1回生成 · 到達不可（棄却対象）"
  );
  resultPanel.show(
    res.ok
      ? `<p class="result-verdict">このシードは到達可能</p>`
      : `<p class="result-verdict">このシードは到達不可</p><p class="result-note">「制約まで再生成」で棄却ループを見る</p>`
  );
}

function draw() {
  if (!ctx) return;
  const cell = C.cell;
  const W = C.cols * cell;
  const H = C.rows * cell;
  canvas.width = W;
  canvas.height = H;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < C.rows; y++) {
    for (let x = 0; x < C.cols; x++) {
      const px = x * cell;
      const py = y * cell;
      if (walls[y]?.[x]) {
        ctx.fillStyle = "#3d4f66";
        ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
      } else if (reachable.has(key(x, y))) {
        ctx.fillStyle = accepted
          ? "rgba(107, 203, 143, 0.25)"
          : "rgba(91, 159, 212, 0.2)";
        ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
      }
    }
  }
  // S / G
  const drawMark = (p, label, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(p.x * cell + 4, p.y * cell + 4, cell - 8, cell - 8);
    ctx.fillStyle = "#0a0e14";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(label, p.x * cell + 8, p.y * cell + 18);
  };
  drawMark(C.start, "S", "#6bcb8f");
  drawMark(C.goal, "G", "#e07a5f");
}

function renderStats() {
  if (!statsEl) return;
  statsEl.innerHTML = `
    <table class="coord-table">
      <tr><td>試行</td><td>${attempts}</td></tr>
      <tr><td>受理</td><td>${accepted ? "yes" : "no"}</td></tr>
      <tr><td>BFS 経路長</td><td>${lastPathLen >= 0 ? lastPathLen : "—"}</td></tr>
      <tr><td>到達マス数</td><td>${reachable.size}</td></tr>
    </table>`;
}

function reset() {
  walls = [];
  for (let y = 0; y < C.rows; y++) {
    walls.push(Array(C.cols).fill(false));
  }
  reachable = new Set();
  attempts = 0;
  accepted = false;
  lastPathLen = -1;
  draw();
  renderStats();
  setStatus("準備完了 — 生成または制約まで再生成");
}

btnGen?.addEventListener("click", generateUntilOk);
btnOnce?.addEventListener("click", generateOnce);
btnReset?.addEventListener("click", reset);
wallProbEl?.addEventListener("input", () => readWallProb());

loadTextSample(
  "../samples/ConstrainedGenExample.cs",
  csharpSample,
  "// ConstrainedGenExample.cs"
);
if (seedEl) seedEl.value = String(C.defaultSeed);
if (wallProbEl) wallProbEl.value = String(C.wallProb);
readWallProb();
reset();
