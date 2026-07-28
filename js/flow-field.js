/**
 * フローフィールド — コスト場 + 勾配追従
 */
import { FLOW_FIELD_CONFIG as C } from "./maps/flow-field-config.js";
import {
  createStatus,
  loadTextSample,
  mulberry32,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("ff-canvas")
);
const ctx = canvas.getContext("2d");
const statsEl = document.getElementById("ff-stats");
const btnRebuild = document.getElementById("btn-rebuild");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

const COLS = C.cols;
const ROWS = C.rows;
const CELL = C.cell;
/** @type {boolean[][]} */
let walls = [];
/** @type {(number|null)[][]} */
let cost = [];
/** @type {{x:number,y:number}[][]} */
let flow = [];
let goal = { ...C.defaultGoal };
/** @type {{x:number,y:number,vx:number,vy:number}[]} */
let agents = [];
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
let paintWall = false;

/**
 * Multi-source BFS cost from goal (integration field).
 * @param {boolean[][]} w
 * @param {{x:number,y:number}} g
 */
export function buildCostField(w, g) {
  const cols = w[0].length;
  const rows = w.length;
  /** @type {(number|null)[][]} */
  const c = Array.from({ length: rows }, () =>
    Array(cols).fill(null)
  );
  if (g.x < 0 || g.y < 0 || g.x >= cols || g.y >= rows || w[g.y][g.x]) {
    return c;
  }
  const q = [{ ...g }];
  c[g.y][g.x] = 0;
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (q.length) {
    const cur = q.shift();
    if (!cur) break;
    const d0 = c[cur.y][cur.x] ?? 0;
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (w[ny][nx]) continue;
      if (c[ny][nx] != null) continue;
      c[ny][nx] = d0 + 1;
      q.push({ x: nx, y: ny });
    }
  }
  return c;
}

/**
 * Flow vector = toward neighbor with lower cost.
 * @param {(number|null)[][]} c
 * @param {boolean[][]} w
 */
export function buildFlow(c, w) {
  const rows = c.length;
  const cols = c[0].length;
  /** @type {{x:number,y:number}[][]} */
  const f = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ x: 0, y: 0 }))
  );
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (w[y][x] || c[y][x] == null) continue;
      let best = c[y][x];
      let bx = 0;
      let by = 0;
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        if (w[ny][nx] || c[ny][nx] == null) continue;
        if (/** @type {number} */ (c[ny][nx]) < /** @type {number} */ (best)) {
          best = c[ny][nx];
          bx = dx;
          by = dy;
        }
      }
      const len = Math.hypot(bx, by) || 1;
      f[y][x] = { x: bx / len, y: by / len };
    }
  }
  return f;
}

function initWalls() {
  walls = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  // simple obstacles
  for (let y = 3; y < 12; y++) walls[y][8] = true;
  for (let x = 8; x < 16; x++) walls[7][x] = true;
  for (let y = 4; y < 14; y++) walls[y][18] = y !== 9;
  walls[goal.y][goal.x] = false;
}

function rebuildField() {
  cost = buildCostField(walls, goal);
  flow = buildFlow(cost, walls);
  draw();
  setStatus(`コスト場を再計算 · goal=(${goal.x},${goal.y})`);
}

function spawnAgents() {
  const rng = mulberry32(11);
  agents = [];
  for (let i = 0; i < C.agentCount; i++) {
    let x = 0;
    let y = 0;
    for (let t = 0; t < 40; t++) {
      x = Math.floor(rng() * COLS);
      y = Math.floor(rng() * ROWS);
      if (!walls[y][x] && cost[y][x] != null) break;
    }
    agents.push({
      x: (x + 0.5) * CELL,
      y: (y + 0.5) * CELL,
      vx: 0,
      vy: 0,
    });
  }
}

function cellOf(px, py) {
  return {
    x: Math.min(COLS - 1, Math.max(0, Math.floor(px / CELL))),
    y: Math.min(ROWS - 1, Math.max(0, Math.floor(py / CELL))),
  };
}

function step(dt) {
  const speed = 70;
  for (const a of agents) {
    const c = cellOf(a.x, a.y);
    const f = flow[c.y]?.[c.x] || { x: 0, y: 0 };
    a.vx = f.x * speed;
    a.vy = f.y * speed;
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.x = Math.max(4, Math.min(COLS * CELL - 4, a.x));
    a.y = Math.max(4, Math.min(ROWS * CELL - 4, a.y));
    // slide out of walls
    const nc = cellOf(a.x, a.y);
    if (walls[nc.y][nc.x]) {
      a.x -= a.vx * dt * 2;
      a.y -= a.vy * dt * 2;
    }
  }
  draw();
}

function draw() {
  if (!ctx) return;
  const W = COLS * CELL;
  const H = ROWS * CELL;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let maxC = 1;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (cost[y][x] != null) maxC = Math.max(maxC, /** @type {number} */ (cost[y][x]));
    }
  }

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const px = x * CELL;
      const py = y * CELL;
      if (walls[y][x]) {
        ctx.fillStyle = "#3d4f66";
        ctx.fillRect(px, py, CELL - 1, CELL - 1);
        continue;
      }
      const cv = cost[y][x];
      if (cv == null) {
        ctx.fillStyle = "#1a1520";
        ctx.fillRect(px, py, CELL - 1, CELL - 1);
        continue;
      }
      const t = cv / maxC;
      ctx.fillStyle = `rgba(91, 159, 212, ${0.15 + 0.55 * (1 - t)})`;
      ctx.fillRect(px, py, CELL - 1, CELL - 1);
      // arrow
      const f = flow[y][x];
      if (f.x || f.y) {
        const cx = px + CELL / 2;
        const cy = py + CELL / 2;
        ctx.strokeStyle = "rgba(242,204,143,0.7)";
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + f.x * 10, cy + f.y * 10);
        ctx.stroke();
      }
    }
  }

  // goal
  ctx.fillStyle = "#e07a5f";
  ctx.fillRect(goal.x * CELL + 4, goal.y * CELL + 4, CELL - 8, CELL - 8);

  for (const a of agents) {
    ctx.fillStyle = "#6bcb8f";
    ctx.beginPath();
    ctx.arc(a.x, a.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  if (statsEl) {
    let reachable = 0;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (cost[y][x] != null) reachable += 1;
      }
    }
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>ゴール</td><td>${goal.x}, ${goal.y}</td></tr>
        <tr><td>到達セル</td><td>${reachable}</td></tr>
        <tr><td>エージェント</td><td>${agents.length}</td></tr>
        <tr><td>最大コスト</td><td>${maxC}</td></tr>
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

function pointerCell(e) {
  const r = canvas.getBoundingClientRect();
  const x = Math.floor(
    (((e.clientX - r.left) * canvas.width) / r.width) / CELL
  );
  const y = Math.floor(
    (((e.clientY - r.top) * canvas.height) / r.height) / CELL
  );
  return {
    x: Math.min(COLS - 1, Math.max(0, x)),
    y: Math.min(ROWS - 1, Math.max(0, y)),
  };
}

canvas.addEventListener("pointerdown", (e) => {
  const c = pointerCell(e);
  if (e.shiftKey) {
    walls[c.y][c.x] = !walls[c.y][c.x];
    if (c.x === goal.x && c.y === goal.y) walls[c.y][c.x] = false;
    rebuildField();
    spawnAgents();
    return;
  }
  if (!walls[c.y][c.x]) {
    goal = c;
    rebuildField();
  }
});

btnRebuild?.addEventListener("click", () => {
  rebuildField();
  spawnAgents();
});
btnReset?.addEventListener("click", () => {
  initWalls();
  goal = { ...C.defaultGoal };
  rebuildField();
  spawnAgents();
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
  "../samples/FlowFieldExample.cs",
  csharpSample,
  "// FlowFieldExample.cs"
);
canvas.width = COLS * CELL;
canvas.height = ROWS * CELL;
initWalls();
rebuildField();
spawnAgents();
setStatus("クリックでゴール · Shift+クリックで壁 · 再生でエージェント");
