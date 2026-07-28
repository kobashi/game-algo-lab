/**
 * セルオートマトン — 洞窟生成
 */
import { CELLULAR_AUTOMATA_CONFIG as C } from "./maps/cellular-automata-config.js";
import {
  createStatus,
  loadTextSample,
  mulberry32,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("ca-canvas")
);
const ctx = canvas.getContext("2d");
const seedEl = /** @type {HTMLInputElement} */ (document.getElementById("seed"));
const fillEl = /** @type {HTMLInputElement} */ (document.getElementById("fill"));
const stepsEl = /** @type {HTMLInputElement} */ (
  document.getElementById("steps")
);
const fillVal = document.getElementById("fill-val");
const stepsVal = document.getElementById("steps-val");
const statsEl = document.getElementById("ca-stats");
const btnInit = document.getElementById("btn-init");
const btnStep = document.getElementById("btn-step");
const btnRun = document.getElementById("btn-run");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

const COLS = C.cols;
const ROWS = C.rows;
/** @type {number[][]} 1=wall 0=floor */
let grid = [];
let gen = 0;
let cell = 10;

/**
 * @param {number[][]} g
 * @param {number} x
 * @param {number} y
 */
export function countWallNeighbors(g, x, y) {
  let n = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) {
        n += 1; // border as wall
        continue;
      }
      n += g[ny][nx];
    }
  }
  return n;
}

/**
 * One CA step: birth if neighbors >= birth, survive if >= surviveMin.
 * @param {number[][]} g
 */
export function stepGrid(g, birth = C.defaultBirth, surviveMin = C.defaultSurviveMin) {
  const next = g.map((row) => row.slice());
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const n = countWallNeighbors(g, x, y);
      if (g[y][x]) {
        next[y][x] = n >= surviveMin ? 1 : 0;
      } else {
        next[y][x] = n >= birth ? 1 : 0;
      }
    }
  }
  return next;
}

function readSeed() {
  return (Math.floor(Number(seedEl?.value) || 1) >>> 0) || 1;
}
function readFill() {
  return Number(fillEl?.value) || C.defaultFill;
}
function readSteps() {
  return Math.floor(Number(stepsEl?.value) || C.defaultSteps);
}

function syncLabels() {
  if (fillVal) fillVal.textContent = readFill().toFixed(2);
  if (stepsVal) stepsVal.textContent = String(readSteps());
}

function initGrid() {
  const rng = mulberry32(readSeed());
  const fill = readFill();
  grid = [];
  for (let y = 0; y < ROWS; y++) {
    const row = [];
    for (let x = 0; x < COLS; x++) {
      const border = x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1;
      row.push(border || rng() < fill ? 1 : 0);
    }
    grid.push(row);
  }
  gen = 0;
  draw();
  setStatus(`初期化 seed=${readSeed()} fill=${fill.toFixed(2)}`);
}

function stepOnce() {
  grid = stepGrid(grid);
  gen += 1;
  draw();
  setStatus(`世代 ${gen}`);
}

function runN() {
  const n = readSteps();
  for (let i = 0; i < n; i++) grid = stepGrid(grid);
  gen += n;
  draw();
  setStatus(`+${n} 世代 → ${gen}`);
}

function draw() {
  if (!ctx) return;
  cell = Math.floor(Math.min(canvas.width / COLS, canvas.height / ROWS));
  const W = COLS * cell;
  const H = ROWS * cell;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  let walls = 0;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (grid[y][x]) {
        walls += 1;
        ctx.fillStyle = "#3d4f66";
      } else {
        ctx.fillStyle = "#1a2838";
      }
      ctx.fillRect(x * cell, y * cell, cell - 1, cell - 1);
    }
  }
  if (statsEl) {
    const floor = COLS * ROWS - walls;
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>世代</td><td>${gen}</td></tr>
        <tr><td>壁 / 床</td><td>${walls} / ${floor}</td></tr>
        <tr><td>規則</td><td>birth≥${C.defaultBirth} · survive≥${C.defaultSurviveMin}</td></tr>
      </table>`;
  }
}

btnInit?.addEventListener("click", () => {
  syncLabels();
  initGrid();
});
btnStep?.addEventListener("click", stepOnce);
btnRun?.addEventListener("click", runN);
for (const el of [fillEl, stepsEl, seedEl]) {
  el?.addEventListener("input", syncLabels);
}

loadTextSample(
  "../samples/CellularAutomataExample.cs",
  csharpSample,
  "// CellularAutomataExample.cs"
);
if (seedEl) seedEl.value = "42";
if (fillEl) fillEl.value = String(C.defaultFill);
if (stepsEl) stepsEl.value = String(C.defaultSteps);
syncLabels();
initGrid();
