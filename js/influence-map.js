/**
 * 影響マップ — 脅威/興味のスカラー場 + 勾配追従
 */
import { INFLUENCE_MAP_CONFIG as C } from "./maps/influence-map-config.js";
import {
  createStatus,
  loadTextSample,
  mulberry32,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("im-canvas")
);
const ctx = canvas.getContext("2d");
const decayEl = /** @type {HTMLInputElement} */ (document.getElementById("decay"));
const modeEl = /** @type {HTMLSelectElement} */ (document.getElementById("mode"));
const decayVal = document.getElementById("decay-val");
const statsEl = document.getElementById("im-stats");
const btnRebuild = document.getElementById("btn-rebuild");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

const COLS = C.cols;
const ROWS = C.rows;
const CELL = C.cell;

/**
 * @typedef {{ x: number, y: number, strength: number, kind: 'threat'|'interest' }} Source
 */

/** @type {Source[]} */
let sources = C.sources.map((s) => ({ ...s }));
/** @type {number[][]} field threat positive, interest as negative for blend display */
/** @type {number[][]} */
let field = [];
/** @type {{x:number,y:number}[]} */
let agents = [];
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
let paintKind = /** @type {'threat'|'interest'|'clear'} */ ("threat");

function readDecay() {
  return Number(decayEl?.value) || C.defaultDecay;
}

/**
 * Build influence: max over sources of strength * exp(-decay * dist)
 * threat +, interest -
 * @param {Source[]} srcs
 * @param {number} decay
 */
export function buildInfluence(srcs, decay, cols = COLS, rows = ROWS) {
  /** @type {number[][]} */
  const f = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let v = 0;
      for (const s of srcs) {
        const d = Math.hypot(x - s.x, y - s.y);
        const contrib = s.strength * Math.exp(-decay * d);
        v += s.kind === "threat" ? contrib : -contrib;
      }
      f[y][x] = v;
    }
  }
  return f;
}

/**
 * Gradient of field at cell (toward higher value).
 */
export function gradientAt(f, x, y) {
  const rows = f.length;
  const cols = f[0].length;
  const c = f[y][x];
  let gx = 0;
  let gy = 0;
  if (x + 1 < cols) gx += f[y][x + 1] - c;
  if (x - 1 >= 0) gx += c - f[y][x - 1];
  if (y + 1 < rows) gy += f[y + 1][x] - c;
  if (y - 1 >= 0) gy += c - f[y - 1][x];
  const len = Math.hypot(gx, gy) || 1;
  return { x: gx / len, y: gy / len };
}

function rebuild() {
  field = buildInfluence(sources, readDecay());
  spawnAgents();
  draw();
}

function spawnAgents() {
  const rng = mulberry32(11);
  agents = [];
  for (let i = 0; i < 10; i++) {
    agents.push({
      x: 20 + rng() * (COLS * CELL - 40),
      y: 20 + rng() * (ROWS * CELL - 40),
    });
  }
}

function step(dt) {
  const mode = modeEl?.value || "flee";
  const sign = mode === "seek" ? 1 : -1; // flee threat = go down threat / up interest
  for (const a of agents) {
    const cx = Math.min(COLS - 1, Math.max(0, Math.floor(a.x / CELL)));
    const cy = Math.min(ROWS - 1, Math.max(0, Math.floor(a.y / CELL)));
    const g = gradientAt(field, cx, cy);
    // flee: move opposite to gradient of threat-heavy field (away from +)
    // seek: follow gradient (toward interest = more negative, or toward high if seeking threats for demo)
    const sp = 90;
    if (mode === "flee") {
      a.x -= g.x * sp * dt; // away from high threat
      a.y -= g.y * sp * dt;
    } else {
      a.x += g.x * sp * dt * sign;
      a.y += g.y * sp * dt * sign;
    }
    a.x = Math.max(8, Math.min(COLS * CELL - 8, a.x));
    a.y = Math.max(8, Math.min(ROWS * CELL - 8, a.y));
  }
  draw();
}

function draw() {
  if (!ctx) return;
  let maxAbs = 0.001;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      maxAbs = Math.max(maxAbs, Math.abs(field[y][x]));
    }
  }
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const v = field[y][x] / maxAbs;
      const px = x * CELL;
      const py = y * CELL;
      if (v >= 0) {
        ctx.fillStyle = `rgba(224, 122, 95, ${0.1 + 0.7 * v})`;
      } else {
        ctx.fillStyle = `rgba(91, 159, 212, ${0.1 + 0.7 * -v})`;
      }
      ctx.fillRect(px, py, CELL - 1, CELL - 1);
    }
  }
  for (const s of sources) {
    ctx.fillStyle = s.kind === "threat" ? "#e07a5f" : "#5b9fd4";
    ctx.beginPath();
    ctx.arc(s.x * CELL + CELL / 2, s.y * CELL + CELL / 2, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const a of agents) {
    ctx.fillStyle = "#6bcb8f";
    ctx.beginPath();
    ctx.arc(a.x, a.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>ソース</td><td>${sources.length}</td></tr>
        <tr><td>減衰</td><td>${readDecay().toFixed(2)}</td></tr>
        <tr><td>モード</td><td>${modeEl?.value || "flee"}</td></tr>
        <tr><td>エージェント</td><td>${agents.length}</td></tr>
      </table>`;
  }
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

function cellAt(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: Math.min(
      COLS - 1,
      Math.max(0, Math.floor((((e.clientX - r.left) * canvas.width) / r.width) / CELL))
    ),
    y: Math.min(
      ROWS - 1,
      Math.max(0, Math.floor((((e.clientY - r.top) * canvas.height) / r.height) / CELL))
    ),
  };
}

canvas.addEventListener("pointerdown", (e) => {
  const c = cellAt(e);
  if (e.shiftKey) {
    sources = sources.filter((s) => !(s.x === c.x && s.y === c.y));
  } else {
    sources.push({
      x: c.x,
      y: c.y,
      strength: 0.85,
      kind: paintKind,
    });
  }
  rebuild();
});

decayEl?.addEventListener("input", () => {
  if (decayVal) decayVal.textContent = readDecay().toFixed(2);
  rebuild();
});
document.querySelectorAll('input[name="paint-kind"]').forEach((el) => {
  el.addEventListener("change", () => {
    const v = /** @type {HTMLInputElement} */ (el).value;
    if (v === "threat" || v === "interest") paintKind = v;
  });
});

btnRebuild?.addEventListener("click", rebuild);
btnReset?.addEventListener("click", () => {
  sources = C.sources.map((s) => ({ ...s }));
  rebuild();
  setStatus("リセット");
});
btnPlay?.addEventListener("click", () => {
  if (running) {
    running = false;
    if (rafId != null) cancelAnimationFrame(rafId);
    if (btnPlay) btnPlay.textContent = "再生";
    return;
  }
  running = true;
  lastTs = 0;
  if (btnPlay) btnPlay.textContent = "一時停止";
  rafId = requestAnimationFrame(loop);
});

loadTextSample(
  "../samples/InfluenceMapExample.cs",
  csharpSample,
  "// InfluenceMapExample.cs"
);
canvas.width = COLS * CELL;
canvas.height = ROWS * CELL;
if (decayVal) decayVal.textContent = readDecay().toFixed(2);
rebuild();
setStatus("クリックでソース追加 · Shift で削除 · 赤=脅威 · 青=興味");
