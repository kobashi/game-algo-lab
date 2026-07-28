/**
 * ダンジョン生成 — 部屋 + L 字通路
 * @see docs/topics/dungeon-gen/SPEC.md
 */
import { DUNGEON_GEN_CONFIG as C } from "./maps/dungeon-gen-config.js";
import {
  createStatus,
  createResultPanel,
  loadTextSample,
  mulberry32,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("dg-canvas")
);
const ctx = canvas.getContext("2d");
const seedEl = /** @type {HTMLInputElement} */ (document.getElementById("seed"));
const roomsEl = /** @type {HTMLInputElement} */ (
  document.getElementById("room-attempts")
);
const roomsVal = document.getElementById("rooms-val");
const btnGen = document.getElementById("btn-gen");
const btnStep = document.getElementById("btn-step");
const btnReset = document.getElementById("btn-reset");
const statsEl = document.getElementById("dg-stats");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));
const resultPanel = createResultPanel(
  document.getElementById("result-compare")
);

/**
 * @typedef {{ x: number, y: number, w: number, h: number }} Room
 * @typedef {{ kind: 'init'|'room'|'corridor'|'done', room?: Room, i?: number }} Step
 */

/** @type {boolean[][]} true=wall */
let grid = [];
/** @type {Room[]} */
let rooms = [];
/** @type {Step[]} */
let steps = [];
let stepIndex = 0;
/** @type {() => number} */
let rng = mulberry32(1);

function readSeed() {
  return (Math.floor(Number(seedEl?.value) || C.defaultSeed) >>> 0) || 1;
}
function readAttempts() {
  const n = Math.floor(Number(roomsEl?.value) || C.roomAttempts);
  if (roomsVal) roomsVal.textContent = String(n);
  return Math.min(40, Math.max(4, n));
}

function emptyGrid() {
  /** @type {boolean[][]} */
  const g = [];
  for (let y = 0; y < C.rows; y++) {
    g.push(Array(C.cols).fill(true));
  }
  return g;
}

function overlaps(a, b, pad = 1) {
  return !(
    a.x + a.w + pad <= b.x ||
    b.x + b.w + pad <= a.x ||
    a.y + a.h + pad <= b.y ||
    b.y + b.h + pad <= a.y
  );
}

function carveRoom(g, r) {
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      if (y >= 0 && y < C.rows && x >= 0 && x < C.cols) g[y][x] = false;
    }
  }
}

function carveH(g, x0, x1, y) {
  if (x0 > x1) [x0, x1] = [x1, x0];
  for (let x = x0; x <= x1; x++) {
    if (y > 0 && y < C.rows - 1 && x > 0 && x < C.cols - 1) g[y][x] = false;
  }
}
function carveV(g, y0, y1, x) {
  if (y0 > y1) [y0, y1] = [y1, y0];
  for (let y = y0; y <= y1; y++) {
    if (y > 0 && y < C.rows - 1 && x > 0 && x < C.cols - 1) g[y][x] = false;
  }
}

function carveL(g, x0, y0, x1, y1) {
  if (rng() < 0.5) {
    carveH(g, x0, x1, y0);
    carveV(g, y0, y1, x1);
  } else {
    carveV(g, y0, y1, x0);
    carveH(g, x0, x1, y1);
  }
}

/**
 * Build step list without mutating display until applied.
 */
function planDungeon() {
  rng = mulberry32(readSeed());
  const attempts = readAttempts();
  /** @type {Room[]} */
  const placed = [];
  /** @type {Step[]} */
  const plan = [{ kind: "init" }];

  for (let i = 0; i < attempts; i++) {
    const w =
      C.roomMinW + Math.floor(rng() * (C.roomMaxW - C.roomMinW + 1));
    const h =
      C.roomMinH + Math.floor(rng() * (C.roomMaxH - C.roomMinH + 1));
    const x = 1 + Math.floor(rng() * (C.cols - w - 2));
    const y = 1 + Math.floor(rng() * (C.rows - h - 2));
    const room = { x, y, w, h };
    if (placed.some((r) => overlaps(room, r))) continue;
    placed.push(room);
    plan.push({ kind: "room", room, i: placed.length - 1 });
  }

  for (let i = 1; i < placed.length; i++) {
    const a = placed[i - 1];
    const b = placed[i];
    plan.push({
      kind: "corridor",
      i,
      room: {
        x: Math.floor(a.x + a.w / 2),
        y: Math.floor(a.y + a.h / 2),
        w: Math.floor(b.x + b.w / 2),
        h: Math.floor(b.y + b.h / 2),
      },
    });
  }
  plan.push({ kind: "done" });
  return { plan, placed };
}

function applyUpTo(index) {
  grid = emptyGrid();
  rooms = [];
  rng = mulberry32(readSeed()); // re-sync corridor coin flips
  // re-run placements only for corridor randomness consistency:
  // corridors use rng after all room attempts in planDungeon — need same sequence
  // Simpler: store corridor endpoints in step and don't re-rng for carve L order
  for (let s = 0; s <= index && s < steps.length; s++) {
    const st = steps[s];
    if (st.kind === "room" && st.room) {
      carveRoom(grid, st.room);
      rooms.push(st.room);
    } else if (st.kind === "corridor" && st.room) {
      // room fields repurposed: x,y = from center; w,h = to center
      const x0 = st.room.x;
      const y0 = st.room.y;
      const x1 = st.room.w;
      const y1 = st.room.h;
      // deterministic L orientation from seed+i
      const flip = ((readSeed() + (st.i || 0) * 17) & 1) === 0;
      if (flip) {
        carveH(grid, x0, x1, y0);
        carveV(grid, y0, y1, x1);
      } else {
        carveV(grid, y0, y1, x0);
        carveH(grid, x0, x1, y1);
      }
    }
  }
}

function generateAll() {
  const { plan, placed } = planDungeon();
  steps = plan;
  stepIndex = steps.length - 1;
  applyUpTo(stepIndex);
  draw();
  renderStats();
  setStatus(`生成完了 · 部屋 ${placed.length} · seed=${readSeed()}`);
  resultPanel.show(`
    <p class="result-verdict">部屋 ${placed.length} + 通路 ${Math.max(0, placed.length - 1)}</p>
    <p class="result-note">1ステップで部屋配置→通路の順を再生できます</p>
  `);
}

function stepOnce() {
  if (!steps.length) {
    const { plan } = planDungeon();
    steps = plan;
    stepIndex = -1;
  }
  if (stepIndex >= steps.length - 1) {
    setStatus("最後まで到達 — 再生成してください");
    return;
  }
  stepIndex += 1;
  applyUpTo(stepIndex);
  const st = steps[stepIndex];
  draw();
  renderStats();
  setStatus(
    st.kind === "room"
      ? `部屋 #${(st.i ?? 0) + 1}`
      : st.kind === "corridor"
        ? `通路 #${st.i}`
        : st.kind === "done"
          ? "完了"
          : "初期化（全壁）"
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
      if (!grid[y]?.[x]) {
        ctx.fillStyle = "#1e2a3a";
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  }
  // room outlines
  ctx.strokeStyle = "rgba(107, 203, 143, 0.55)";
  for (const r of rooms) {
    ctx.strokeRect(
      r.x * cell + 0.5,
      r.y * cell + 0.5,
      r.w * cell - 1,
      r.h * cell - 1
    );
  }
}

function renderStats() {
  if (!statsEl) return;
  let floor = 0;
  for (const row of grid) for (const w of row) if (!w) floor += 1;
  statsEl.innerHTML = `
    <table class="coord-table">
      <tr><td>シード</td><td>${readSeed()}</td></tr>
      <tr><td>部屋</td><td>${rooms.length}</td></tr>
      <tr><td>床マス</td><td>${floor}</td></tr>
      <tr><td>ステップ</td><td>${stepIndex + 1} / ${steps.length || "—"}</td></tr>
    </table>`;
}

function reset() {
  grid = emptyGrid();
  rooms = [];
  steps = [];
  stepIndex = -1;
  draw();
  renderStats();
  setStatus("リセット — 生成または 1ステップ");
  resultPanel.hide?.();
  const el = document.getElementById("result-compare");
  if (el) el.hidden = true;
}

btnGen?.addEventListener("click", generateAll);
btnStep?.addEventListener("click", stepOnce);
btnReset?.addEventListener("click", reset);
roomsEl?.addEventListener("input", () => readAttempts());

loadTextSample(
  "../samples/DungeonGenExample.cs",
  csharpSample,
  "// DungeonGenExample.cs"
);
if (seedEl) seedEl.value = String(C.defaultSeed);
if (roomsEl) roomsEl.value = String(C.roomAttempts);
readAttempts();
reset();
