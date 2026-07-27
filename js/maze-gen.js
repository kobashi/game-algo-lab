/**
 * 迷路生成 — Recursive Backtracker / Prim 風
 * @see docs/topics/maze-gen/SPEC.md
 */

import {
  MAZE_GEN_CONFIG as C,
  MAZE_ALGOS,
} from "./maps/maze-gen-config.js";
import {
  createStatus,
  createResultPanel,
  createPlayback,
  loadTextSample,
  mulberry32,
  randomIndex,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("maze-canvas")
);
const ctx = canvas.getContext("2d");
const algoEl = /** @type {HTMLSelectElement} */ (document.getElementById("algo"));
const algoBlurb = document.getElementById("algo-blurb");
const seedEl = /** @type {HTMLInputElement} */ (document.getElementById("seed"));
const sizeEl = /** @type {HTMLInputElement} */ (document.getElementById("size"));
const sizeVal = document.getElementById("size-val");
const btnPlay = document.getElementById("btn-play");
const btnStep = document.getElementById("btn-step");
const btnRun = document.getElementById("btn-run");
const btnReset = document.getElementById("btn-reset");
const speedEl = /** @type {HTMLInputElement} */ (document.getElementById("speed"));
const csharpSample = document.getElementById("csharp-sample");

const setStatus = createStatus(document.getElementById("status"));
const resultPanel = createResultPanel(
  document.getElementById("result-compare")
);

const DIRS = [
  [0, -2],
  [0, 2],
  [-2, 0],
  [2, 0],
];

/** @type {boolean[][]} true=壁 */
let wall = [];
let rows = 0;
let cols = 0;
/** @type {boolean[][]} */
let visited = [];
/** @type {{x:number,y:number}[]} */
let stack = [];
/** Prim frontier: string keys "x,y" */
/** @type {Set<string>} */
let frontier = new Set();
/** @type {{x:number,y:number}|null} */
let current = null;
let finished = false;
let stepCount = 0;
/** @type {() => number} */
let rng = mulberry32(C.defaultSeed);
/** @type {Generator<void, void, void> | null} */
let gen = null;

function key(x, y) {
  return `${x},${y}`;
}

function readSeed() {
  let s = Math.floor(Number(seedEl?.value) || C.defaultSeed);
  if (s <= 0) s = 1;
  return s >>> 0 || 1;
}

function readCells() {
  let n = Math.floor(Number(sizeEl?.value) || C.defaultCells);
  n = Math.min(C.maxCells, Math.max(C.minCells, n));
  if (n % 2 === 0) n += 1;
  return n;
}

function readAlgo() {
  return algoEl?.value || C.defaultAlgo;
}

function syncLabels() {
  if (sizeVal) sizeVal.textContent = String(readCells());
  const a = MAZE_ALGOS.find((x) => x.id === readAlgo());
  if (algoBlurb) algoBlurb.textContent = a?.blurb || "";
}

function initGrid(cells) {
  const n = cells * 2 + 1;
  rows = n;
  cols = n;
  wall = Array.from({ length: rows }, () => Array(cols).fill(true));
  visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  stack = [];
  frontier = new Set();
  current = null;
  finished = false;
  stepCount = 0;
  // canvas size
  const px = Math.min(22, Math.floor(560 / n));
  canvas.width = n * px;
  canvas.height = n * px;
  canvas.dataset.cell = String(px);
}

function inBoundsCell(x, y) {
  return x > 0 && y > 0 && x < cols - 1 && y < rows - 1;
}

function unvisitedNeighbors(x, y) {
  const out = [];
  for (const [dx, dy] of DIRS) {
    const nx = x + dx;
    const ny = y + dy;
    if (inBoundsCell(nx, ny) && !visited[ny][nx]) out.push({ x: nx, y: ny });
  }
  return out;
}

function visitedNeighbors(x, y) {
  const out = [];
  for (const [dx, dy] of DIRS) {
    const nx = x + dx;
    const ny = y + dy;
    if (inBoundsCell(nx, ny) && visited[ny][nx]) out.push({ x: nx, y: ny });
  }
  return out;
}

function carveBetween(x1, y1, x2, y2) {
  wall[y1][x1] = false;
  wall[y2][x2] = false;
  wall[(y1 + y2) >> 1][(x1 + x2) >> 1] = false;
}

function* genBacktracker() {
  const sx = 1;
  const sy = 1;
  visited[sy][sx] = true;
  wall[sy][sx] = false;
  stack = [{ x: sx, y: sy }];
  current = { x: sx, y: sy };
  stepCount = 0;
  yield;

  while (stack.length) {
    const c = stack[stack.length - 1];
    current = c;
    const neigh = unvisitedNeighbors(c.x, c.y);
    if (!neigh.length) {
      stack.pop();
      stepCount += 1;
      yield;
      continue;
    }
    const n = neigh[randomIndex(rng, neigh.length)];
    carveBetween(c.x, c.y, n.x, n.y);
    visited[n.y][n.x] = true;
    stack.push(n);
    current = n;
    stepCount += 1;
    yield;
  }
  finished = true;
  current = null;
}

function* genPrim() {
  const sx = 1;
  const sy = 1;
  visited[sy][sx] = true;
  wall[sy][sx] = false;
  frontier = new Set();
  for (const n of unvisitedNeighbors(sx, sy)) {
    frontier.add(key(n.x, n.y));
  }
  current = { x: sx, y: sy };
  stepCount = 0;
  yield;

  while (frontier.size) {
    const arr = [...frontier];
    const pickKey = arr[randomIndex(rng, arr.length)];
    const [px, py] = pickKey.split(",").map(Number);
    frontier.delete(pickKey);
    const vn = visitedNeighbors(px, py);
    if (!vn.length) {
      stepCount += 1;
      yield;
      continue;
    }
    const from = vn[randomIndex(rng, vn.length)];
    carveBetween(from.x, from.y, px, py);
    visited[py][px] = true;
    current = { x: px, y: py };
    for (const n of unvisitedNeighbors(px, py)) {
      if (!visited[n.y][n.x]) frontier.add(key(n.x, n.y));
    }
    stepCount += 1;
    yield;
  }
  finished = true;
  current = null;
}

function startGen() {
  playback.stop();
  rng = mulberry32(readSeed());
  initGrid(readCells());
  const algo = readAlgo();
  gen =
    algo === "prim" ? genPrim() : genBacktracker();
  finished = false;
  const r = gen.next();
  draw();
  if (r.done) {
    finished = true;
    onDone();
  } else {
    setStatus(
      `生成開始 · ${algo} · seed=${readSeed()} · ${cols}×${rows}`
    );
    resultPanel.hide();
  }
}

function stepOnce() {
  if (!gen || finished) {
    startGen();
    if (finished) return false;
    return true;
  }
  const r = gen.next();
  draw();
  if (r.done || finished) {
    finished = true;
    onDone();
    return false;
  }
  setStatus(
    `生成中… step=${stepCount} · stack=${stack.length} · frontier=${frontier.size}`
  );
  return true;
}

function runAll() {
  playback.stop();
  if (!gen || finished) startGen();
  if (!gen) return;
  let guard = 0;
  while (!finished && guard < 100000) {
    const r = gen.next();
    guard += 1;
    if (r.done) finished = true;
  }
  draw();
  onDone();
}

function onDone() {
  setStatus(
    `完成 · ${readAlgo()} · seed=${readSeed()} · steps≈${stepCount} · ${cols}×${rows}`
  );
  resultPanel.show(`
    <p class="result-verdict">迷路生成が完了しました</p>
    <p class="result-note">
      同じシード・同じアルゴリズムなら同じ迷路になります。
      アルゴリズムを切替えると廊下が長い（DFS）／枝分かれが多い（Prim）傾向の差を比較できます。
      経路探索デモ（BFS 等）の地図として使う場合は、壁＝#・通路＝. に写像できます。
    </p>
  `);
}

function draw() {
  if (!ctx || !canvas || !wall.length) return;
  const n = rows;
  const cell = Number(canvas.dataset.cell) || C.cellPx;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const px = x * cell;
      const py = y * cell;
      if (wall[y][x]) {
        ctx.fillStyle = "#3d4f66";
        ctx.fillRect(px, py, cell, cell);
      } else {
        ctx.fillStyle = "#1a2433";
        ctx.fillRect(px, py, cell, cell);
      }
      // visited path cells highlight during gen
      if (!wall[y][x] && visited[y] && visited[y][x] && x % 2 === 1 && y % 2 === 1) {
        ctx.fillStyle = "rgba(91,159,212,0.25)";
        ctx.fillRect(px, py, cell, cell);
      }
    }
  }

  // frontier (prim)
  if (readAlgo() === "prim" && frontier.size) {
    ctx.fillStyle = "rgba(242,204,143,0.55)";
    for (const k of frontier) {
      const [x, y] = k.split(",").map(Number);
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }

  // stack highlight (dfs)
  if (stack.length && readAlgo() !== "prim") {
    ctx.fillStyle = "rgba(107,203,143,0.35)";
    for (const s of stack) {
      ctx.fillRect(s.x * cell, s.y * cell, cell, cell);
    }
  }

  if (current) {
    ctx.fillStyle = "#e07a5f";
    ctx.fillRect(current.x * cell, current.y * cell, cell, cell);
  }

  // entrance / exit marks when finished
  if (finished) {
    ctx.fillStyle = "#6bcb8f";
    ctx.fillRect(1 * cell, 1 * cell, cell, cell);
    ctx.fillStyle = "#e07a5f";
    const ex = cols - 2;
    const ey = rows - 2;
    ctx.fillRect(ex * cell, ey * cell, cell, cell);
  }
}

const playback = createPlayback({
  btnPlay,
  speedEl,
  delayFromSpeed: (v) => 450 - v,
  onTick: () => stepOnce(),
});

btnPlay?.addEventListener("click", () => {
  if (playback.running) {
    playback.stop();
    setStatus("一時停止");
    return;
  }
  if (finished || !gen) startGen();
  playback.start();
});
btnStep?.addEventListener("click", () => {
  playback.stop();
  stepOnce();
});
btnRun?.addEventListener("click", () => {
  runAll();
});
btnReset?.addEventListener("click", () => {
  playback.stop();
  gen = null;
  finished = false;
  initGrid(readCells());
  draw();
  resultPanel.hide();
  setStatus("リセット — 生成または 1ステップで開始");
});

algoEl?.addEventListener("change", () => {
  syncLabels();
  btnReset?.click();
});
sizeEl?.addEventListener("input", () => {
  syncLabels();
});

// init selects
for (const a of MAZE_ALGOS) {
  const opt = document.createElement("option");
  opt.value = a.id;
  opt.textContent = a.label;
  if (a.id === C.defaultAlgo) opt.selected = true;
  algoEl?.appendChild(opt);
}
if (seedEl) seedEl.value = String(C.defaultSeed);
if (sizeEl) {
  sizeEl.min = String(C.minCells);
  sizeEl.max = String(C.maxCells);
  sizeEl.value = String(C.defaultCells);
}

loadTextSample(
  "../samples/MazeGenExample.cs",
  csharpSample,
  "// samples/MazeGenExample.cs を読み込めませんでした。"
);

syncLabels();
initGrid(readCells());
draw();
setStatus("準備完了 — シードとアルゴリズムを選び「一括生成」または再生");
