/**
 * グリッド擬似物理 — マス落下
 * @see docs/topics/grid-pseudo-physics/SPEC.md
 */
import { GRID_PSEUDO_PHYSICS_CONFIG as C } from "./maps/grid-pseudo-physics-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("gpp-canvas")
);
const ctx = canvas.getContext("2d");
const btnPlay = document.getElementById("btn-play");
const btnStep = document.getElementById("btn-step");
const btnReset = document.getElementById("btn-reset");
const statsEl = document.getElementById("gpp-stats");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** @type {number[][]} 0 empty 1 solid 2 sand */
let grid = [];
let tick = 0;
let running = false;
/** @type {number | null} */
let timer = null;

function parseInitial() {
  return C.initial.map((row) =>
    [...row].map((ch) => {
      if (ch === "#") return 1;
      if (ch === "2") return 2;
      return 0;
    })
  );
}

/** 1 tick: sand falls one cell if below empty (bottom-up so chain works) */
export function stepFall(g) {
  const rows = g.length;
  const cols = g[0].length;
  let moved = 0;
  for (let y = rows - 2; y >= 0; y--) {
    for (let x = 0; x < cols; x++) {
      if (g[y][x] !== 2) continue;
      if (g[y + 1][x] === 0) {
        g[y + 1][x] = 2;
        g[y][x] = 0;
        moved += 1;
      }
    }
  }
  return moved;
}

function countSand() {
  let n = 0;
  for (const row of grid) for (const c of row) if (c === 2) n += 1;
  return n;
}

function stepOnce() {
  const moved = stepFall(grid);
  tick += 1;
  draw();
  renderStats();
  setStatus(`tick ${tick} · 移動 ${moved} · 砂 ${countSand()}`);
  if (moved === 0 && running) stop();
  return moved;
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
      const v = grid[y][x];
      if (v === 0) {
        ctx.strokeStyle = "rgba(90,106,128,0.25)";
        ctx.strokeRect(x * cell + 0.5, y * cell + 0.5, cell - 1, cell - 1);
        continue;
      }
      ctx.fillStyle = v === 1 ? "#3d4f66" : "#f2cc8f";
      ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
    }
  }
}

function renderStats() {
  if (!statsEl) return;
  statsEl.innerHTML = `
    <table class="coord-table">
      <tr><td>ティック</td><td>${tick}</td></tr>
      <tr><td>砂ブロック</td><td>${countSand()}</td></tr>
      <tr><td>モデル</td><td>マス単位落下（速度なし）</td></tr>
    </table>`;
}

function stop() {
  running = false;
  if (timer != null) clearInterval(timer);
  timer = null;
  if (btnPlay) btnPlay.textContent = "再生";
}

function reset() {
  stop();
  grid = parseInitial();
  tick = 0;
  draw();
  renderStats();
  setStatus("リセット — 1ステップで1マス落下");
}

btnPlay?.addEventListener("click", () => {
  if (running) {
    stop();
    return;
  }
  running = true;
  if (btnPlay) btnPlay.textContent = "一時停止";
  timer = setInterval(() => stepOnce(), 220);
});
btnStep?.addEventListener("click", () => {
  stop();
  stepOnce();
});
btnReset?.addEventListener("click", reset);

loadTextSample(
  "../samples/GridPseudoPhysicsExample.cs",
  csharpSample,
  "// GridPseudoPhysicsExample.cs"
);
reset();
