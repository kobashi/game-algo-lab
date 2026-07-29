/**
 * Wave Function Collapse 入門 — エントロピー崩壊 + 隣接制約伝播
 */
import { WFC_INTRO_CONFIG as C } from "./maps/wfc-intro-config.js";
import {
  createStatus,
  loadTextSample,
  mulberry32,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("wfc-canvas")
);
const ctx = canvas.getContext("2d");
const seedEl = /** @type {HTMLInputElement} */ (document.getElementById("seed"));
const statsEl = document.getElementById("wfc-stats");
const btnInit = document.getElementById("btn-init");
const btnStep = document.getElementById("btn-step");
const btnRun = document.getElementById("btn-run");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

const COLS = C.cols;
const ROWS = C.rows;
const CELL = C.cell;
const TILES = C.tiles;
const ALL = TILES.map((t) => t.id);

/** @type {number[][][]} wave[y][x] = possible tile ids */
let wave = [];
let collapsed = 0;
let contradiction = false;
let steps = 0;
/** @type {() => number} */
let rng = mulberry32(42);

/**
 * @param {number} a tile id
 * @param {number} b tile id
 * @param {number} dir 0=N of a is S of b's neighbor... dir from a to b: 0N 1E 2S 3W
 */
export function edgesMatch(a, b, dir) {
  const ta = TILES.find((t) => t.id === a);
  const tb = TILES.find((t) => t.id === b);
  if (!ta || !tb) return false;
  const opp = (dir + 2) % 4;
  return ta.edges[dir] === tb.edges[opp];
}

/**
 * Shannon-ish entropy proxy: count of options (lower = more constrained)
 * @param {number[]} opts
 */
export function entropy(opts) {
  if (opts.length <= 1) return opts.length === 1 ? 0 : Infinity;
  let wsum = 0;
  let wlog = 0;
  for (const id of opts) {
    const w = TILES.find((t) => t.id === id)?.weight ?? 1;
    wsum += w;
    wlog += w * Math.log(w);
  }
  return Math.log(wsum) - wlog / wsum;
}

function initWave() {
  wave = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ALL.slice())
  );
  collapsed = 0;
  contradiction = false;
  steps = 0;
}

/**
 * Propagate constraints from seed cell (stack).
 * @returns {boolean} false if contradiction
 */
export function propagate(sy, sx) {
  const stack = [{ y: sy, x: sx }];
  const dirs = [
    [0, -1, 0], // N: dy,dx, edgeDir of current toward neighbor
    [1, 0, 1],
    [0, 1, 2],
    [-1, 0, 3],
  ];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur) break;
    const opts = wave[cur.y][cur.x];
    for (const [dx, dy, dir] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      const nOpts = wave[ny][nx];
      if (nOpts.length <= 1 && nOpts.length === 1) {
        // still filter
      }
      const next = nOpts.filter((nid) =>
        opts.some((oid) => edgesMatch(oid, nid, dir))
      );
      if (next.length === nOpts.length) continue;
      if (next.length === 0) return false;
      wave[ny][nx] = next;
      stack.push({ y: ny, x: nx });
    }
  }
  return true;
}

function pickMinEntropy() {
  let best = null;
  let bestE = Infinity;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const opts = wave[y][x];
      if (opts.length <= 1) continue;
      const e = entropy(opts) + rng() * 1e-6;
      if (e < bestE) {
        bestE = e;
        best = { y, x };
      }
    }
  }
  return best;
}

/**
 * Weighted random pick among options
 * @param {number[]} opts
 */
export function pickTile(opts, rand) {
  let total = 0;
  for (const id of opts) {
    total += TILES.find((t) => t.id === id)?.weight ?? 1;
  }
  let r = rand() * total;
  for (const id of opts) {
    r -= TILES.find((t) => t.id === id)?.weight ?? 1;
    if (r <= 0) return id;
  }
  return opts[opts.length - 1];
}

/**
 * One collapse step. @returns {'ok'|'done'|'fail'}
 */
export function stepOnce() {
  if (contradiction) return "fail";
  const cell = pickMinEntropy();
  if (!cell) {
    collapsed = COLS * ROWS;
    return "done";
  }
  const opts = wave[cell.y][cell.x];
  const choice = pickTile(opts, rng);
  wave[cell.y][cell.x] = [choice];
  steps += 1;
  if (!propagate(cell.y, cell.x)) {
    contradiction = true;
    return "fail";
  }
  let c = 0;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (wave[y][x].length === 1) c += 1;
    }
  }
  collapsed = c;
  if (c === COLS * ROWS) return "done";
  return "ok";
}

function draw() {
  if (!ctx) return;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const opts = wave[y][x];
      const px = x * CELL;
      const py = y * CELL;
      if (opts.length === 1) {
        const t = TILES.find((tt) => tt.id === opts[0]);
        ctx.fillStyle = t?.color ?? "#666";
        ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
        ctx.fillStyle = "#e8eef7";
        ctx.font = "10px sans-serif";
        ctx.fillText(t?.name?.slice(0, 2) ?? "?", px + 4, py + 14);
      } else if (opts.length === 0) {
        ctx.fillStyle = "#e07a5f";
        ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
      } else {
        const t = 1 - opts.length / ALL.length;
        ctx.fillStyle = `rgba(91, 159, 212, ${0.12 + t * 0.5})`;
        ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
        ctx.fillStyle = "#9aabbf";
        ctx.font = "11px sans-serif";
        ctx.fillText(String(opts.length), px + CELL / 2 - 4, py + CELL / 2 + 4);
      }
    }
  }
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>崩壊ステップ</td><td>${steps}</td></tr>
        <tr><td>確定セル</td><td>${collapsed} / ${COLS * ROWS}</td></tr>
        <tr><td>状態</td><td>${contradiction ? "矛盾" : collapsed === COLS * ROWS ? "完了" : "進行中"}</td></tr>
      </table>`;
  }
}

function reset() {
  const seed = Number(seedEl?.value) || 42;
  rng = mulberry32(seed >>> 0);
  initWave();
  draw();
  setStatus(`初期化 seed=${seed} · 各セル候補 ${ALL.length}`);
}

btnInit?.addEventListener("click", reset);
btnStep?.addEventListener("click", () => {
  const r = stepOnce();
  draw();
  setStatus(
    r === "fail"
      ? "矛盾: 候補0 — 再初期化してください"
      : r === "done"
        ? `完了 · ${steps} ステップ`
        : `崩壊 #${steps} · 確定 ${collapsed}`
  );
});
btnRun?.addEventListener("click", () => {
  let guard = COLS * ROWS + 5;
  let r = "ok";
  while (guard-- > 0 && r === "ok") r = stepOnce();
  draw();
  setStatus(
    r === "fail"
      ? "矛盾で停止 — シードを変えて再試行"
      : r === "done"
        ? `完了 · ${steps} ステップ`
        : "打ち切り"
  );
});

loadTextSample("../samples/WfcIntroExample.cs", csharpSample, "// WfcIntroExample.cs");
canvas.width = COLS * CELL;
canvas.height = ROWS * CELL;
reset();
