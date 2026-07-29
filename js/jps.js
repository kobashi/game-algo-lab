/**
 * Jump Point Search — 一様コスト格子で対称経路を刈り込み
 */
import { JPS_CONFIG as C } from "./maps/jps-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("jps-canvas")
);
const ctx = canvas.getContext("2d");
const statsEl = document.getElementById("jps-stats");
const modeEl = /** @type {HTMLSelectElement} */ (document.getElementById("mode"));
const btnRun = document.getElementById("btn-run");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

const COLS = C.cols;
const ROWS = C.rows;
const CELL = C.cell;

/** @type {boolean[][]} */
let walls = [];
let start = { ...C.start };
let goal = { ...C.goal };
/** @type {Set<string>} */
let expanded = new Set();
/** @type {Set<string>} */
let jumpPts = new Set();
/** @type {{x:number,y:number}[]} */
let path = [];
/** @type {'start'|'goal'|null} */
let drag = null;

const key = (x, y) => `${x},${y}`;

function initWalls() {
  walls = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  for (const [x, y] of C.walls) {
    if (y >= 0 && y < ROWS && x >= 0 && x < COLS) walls[y][x] = true;
  }
  walls[start.y][start.x] = false;
  walls[goal.y][goal.x] = false;
}

function walkable(x, y) {
  return x >= 0 && y >= 0 && x < COLS && y < ROWS && !walls[y][x];
}

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/**
 * Classic A* (8-dir) for comparison. Returns path + expanded count.
 */
export function runAstar(sx, sy, gx, gy) {
  const h = (x, y) => Math.hypot(x - gx, y - gy);
  /** @type {Map<string, number>} */
  const gScore = new Map();
  /** @type {Map<string, string|null>} */
  const parent = new Map();
  /** @type {{x:number,y:number,f:number}[]} */
  const open = [{ x: sx, y: sy, f: h(sx, sy) }];
  gScore.set(key(sx, sy), 0);
  parent.set(key(sx, sy), null);
  const closed = new Set();
  const exp = new Set();

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift();
    if (!cur) break;
    const ck = key(cur.x, cur.y);
    if (closed.has(ck)) continue;
    closed.add(ck);
    exp.add(ck);
    if (cur.x === gx && cur.y === gy) {
      return { path: reconstruct(parent, gx, gy), expanded: exp };
    }
    const g0 = gScore.get(ck) ?? 0;
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!walkable(nx, ny)) continue;
      // block corner cutting
      if (dx !== 0 && dy !== 0) {
        if (!walkable(cur.x + dx, cur.y) || !walkable(cur.x, cur.y + dy)) continue;
      }
      const nk = key(nx, ny);
      const step = dx !== 0 && dy !== 0 ? Math.SQRT2 : 1;
      const ng = g0 + step;
      if (ng < (gScore.get(nk) ?? Infinity)) {
        gScore.set(nk, ng);
        parent.set(nk, ck);
        open.push({ x: nx, y: ny, f: ng + h(nx, ny) });
      }
    }
  }
  return { path: [], expanded: exp };
}

/**
 * Simplified JPS (8-dir). Jump along forced directions.
 */
export function runJps(sx, sy, gx, gy) {
  const h = (x, y) => Math.hypot(x - gx, y - gy);
  const gScore = new Map();
  const parent = new Map();
  const open = [{ x: sx, y: sy, f: h(sx, sy) }];
  gScore.set(key(sx, sy), 0);
  parent.set(key(sx, sy), null);
  const closed = new Set();
  const exp = new Set();
  const jumps = new Set();

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} dx
   * @param {number} dy
   * @returns {{x:number,y:number}|null}
   */
  function jump(sx0, sy0, dx, dy) {
    let x = sx0;
    let y = sy0;
    for (let guard = 0; guard < COLS + ROWS + 2; guard++) {
      const nx = x + dx;
      const ny = y + dy;
      if (!walkable(nx, ny)) return null;
      if (dx !== 0 && dy !== 0) {
        if (!walkable(x + dx, y) && !walkable(x, y + dy)) return null;
      }
      if (nx === gx && ny === gy) return { x: nx, y: ny };

      if (dx !== 0 && dy === 0) {
        if (
          (walkable(nx, ny - 1) && !walkable(x, ny - 1)) ||
          (walkable(nx, ny + 1) && !walkable(x, ny + 1))
        ) {
          return { x: nx, y: ny };
        }
      } else if (dy !== 0 && dx === 0) {
        if (
          (walkable(nx - 1, ny) && !walkable(nx - 1, y)) ||
          (walkable(nx + 1, ny) && !walkable(nx + 1, y))
        ) {
          return { x: nx, y: ny };
        }
      } else {
        if (
          (walkable(nx - dx, ny) && !walkable(nx - dx, y)) ||
          (walkable(nx, ny - dy) && !walkable(x, ny - dy))
        ) {
          return { x: nx, y: ny };
        }
        // diagonal: stop if a cardinal jump would exist from here
        if (jumpCardinal(nx, ny, dx, 0) || jumpCardinal(nx, ny, 0, dy)) {
          return { x: nx, y: ny };
        }
      }
      x = nx;
      y = ny;
    }
    return null;
  }

  /** Cardinal-only jump helper (no diagonal recursion). */
  function jumpCardinal(sx0, sy0, dx, dy) {
    let x = sx0;
    let y = sy0;
    for (let guard = 0; guard < COLS + ROWS + 2; guard++) {
      const nx = x + dx;
      const ny = y + dy;
      if (!walkable(nx, ny)) return null;
      if (nx === gx && ny === gy) return { x: nx, y: ny };
      if (dx !== 0 && dy === 0) {
        if (
          (walkable(nx, ny - 1) && !walkable(x, ny - 1)) ||
          (walkable(nx, ny + 1) && !walkable(x, ny + 1))
        ) {
          return { x: nx, y: ny };
        }
      } else if (dy !== 0 && dx === 0) {
        if (
          (walkable(nx - 1, ny) && !walkable(nx - 1, y)) ||
          (walkable(nx + 1, ny) && !walkable(nx + 1, y))
        ) {
          return { x: nx, y: ny };
        }
      } else {
        return null;
      }
      x = nx;
      y = ny;
    }
    return null;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {string|null} fromK
   */
  function identifySuccessors(x, y, fromK) {
    /** @type {{x:number,y:number}[]} */
    const succs = [];
    let dirs = DIRS;
    if (fromK) {
      const [px, py] = fromK.split(",").map(Number);
      const dx = Math.sign(x - px);
      const dy = Math.sign(y - py);
      dirs = prune(x, y, dx, dy);
    }
    for (const [dx, dy] of dirs) {
      const j = jump(x, y, dx, dy);
      if (j) {
        succs.push(j);
        jumps.add(key(j.x, j.y));
      }
    }
    return succs;
  }

  /**
   * Natural + forced neighbor directions (simplified Harabor JPS)
   */
  function prune(x, y, dx, dy) {
    /** @type {number[][]} */
    const out = [];
    if (dx !== 0 && dy !== 0) {
      out.push([dx, 0], [0, dy], [dx, dy]);
      if (!walkable(x - dx, y)) out.push([-dx, dy]);
      if (!walkable(x, y - dy)) out.push([dx, -dy]);
    } else if (dx !== 0) {
      out.push([dx, 0]);
      if (!walkable(x, y - 1)) out.push([dx, -1]);
      if (!walkable(x, y + 1)) out.push([dx, 1]);
    } else if (dy !== 0) {
      out.push([0, dy]);
      if (!walkable(x - 1, y)) out.push([-1, dy]);
      if (!walkable(x + 1, y)) out.push([1, dy]);
    }
    return out.length ? out : DIRS;
  }

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift();
    if (!cur) break;
    const ck = key(cur.x, cur.y);
    if (closed.has(ck)) continue;
    closed.add(ck);
    exp.add(ck);
    if (cur.x === gx && cur.y === gy) {
      return {
        path: reconstruct(parent, gx, gy),
        expanded: exp,
        jumps,
      };
    }
    const g0 = gScore.get(ck) ?? 0;
    const pk = parent.get(ck) ?? null;
    for (const s of identifySuccessors(cur.x, cur.y, pk)) {
      const nk = key(s.x, s.y);
      const step = Math.hypot(s.x - cur.x, s.y - cur.y);
      const ng = g0 + step;
      if (ng < (gScore.get(nk) ?? Infinity)) {
        gScore.set(nk, ng);
        parent.set(nk, ck);
        open.push({ x: s.x, y: s.y, f: ng + h(s.x, s.y) });
      }
    }
  }
  return { path: [], expanded: exp, jumps };
}

/**
 * @param {Map<string, string|null>} parent
 */
function reconstruct(parent, gx, gy) {
  /** @type {{x:number,y:number}[]} */
  const out = [];
  let k = key(gx, gy);
  while (k) {
    const [x, y] = k.split(",").map(Number);
    out.push({ x, y });
    k = parent.get(k) ?? "";
    if (k === "") break;
  }
  out.reverse();
  // expand jump segments to full cells for drawing
  if (out.length < 2) return out;
  /** @type {{x:number,y:number}[]} */
  const full = [out[0]];
  for (let i = 1; i < out.length; i++) {
    let x = full[full.length - 1].x;
    let y = full[full.length - 1].y;
    const tx = out[i].x;
    const ty = out[i].y;
    const dx = Math.sign(tx - x);
    const dy = Math.sign(ty - y);
    while (x !== tx || y !== ty) {
      x += dx;
      y += dy;
      full.push({ x, y });
    }
  }
  return full;
}

function run() {
  const mode = modeEl?.value || "jps";
  expanded = new Set();
  jumpPts = new Set();
  path = [];
  if (mode === "astar") {
    const r = runAstar(start.x, start.y, goal.x, goal.y);
    path = r.path;
    expanded = r.expanded;
    setStatus(`A* · 展開 ${expanded.size} · 経路 ${path.length || "なし"}`);
  } else {
    const r = runJps(start.x, start.y, goal.x, goal.y);
    path = r.path;
    expanded = r.expanded;
    jumpPts = r.jumps;
    setStatus(
      `JPS · 展開 ${expanded.size} · ジャンプ点 ${jumpPts.size} · 経路 ${path.length || "なし"}`
    );
  }
  // also compute the other for stats compare
  const a = runAstar(start.x, start.y, goal.x, goal.y);
  const j = runJps(start.x, start.y, goal.x, goal.y);
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>表示</td><td>${mode === "astar" ? "A*" : "JPS"}</td></tr>
        <tr><td>A* 展開数</td><td>${a.expanded.size}</td></tr>
        <tr><td>JPS 展開数</td><td>${j.expanded.size}</td></tr>
        <tr><td>経路長（セル）</td><td>${path.length || "—"}</td></tr>
      </table>`;
  }
  draw();
}

function draw() {
  if (!ctx) return;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const px = x * CELL;
      const py = y * CELL;
      if (walls[y][x]) {
        ctx.fillStyle = "#3d4f66";
      } else if (expanded.has(key(x, y))) {
        ctx.fillStyle = "rgba(91, 159, 212, 0.35)";
      } else {
        ctx.fillStyle = "#1a2433";
      }
      ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
      if (jumpPts.has(key(x, y))) {
        ctx.strokeStyle = "#f2cc8f";
        ctx.strokeRect(px + 3, py + 3, CELL - 6, CELL - 6);
      }
    }
  }
  // path
  if (path.length > 1) {
    ctx.strokeStyle = "#6bcb8f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    path.forEach((p, i) => {
      const cx = p.x * CELL + CELL / 2;
      const cy = p.y * CELL + CELL / 2;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.stroke();
    ctx.lineWidth = 1;
  }
  // start / goal
  ctx.fillStyle = "#5b9fd4";
  ctx.fillRect(start.x * CELL + 4, start.y * CELL + 4, CELL - 8, CELL - 8);
  ctx.fillStyle = "#e07a5f";
  ctx.fillRect(goal.x * CELL + 4, goal.y * CELL + 4, CELL - 8, CELL - 8);
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
  if (c.x === start.x && c.y === start.y) drag = "start";
  else if (c.x === goal.x && c.y === goal.y) drag = "goal";
  else if (e.shiftKey) {
    if (
      !(c.x === start.x && c.y === start.y) &&
      !(c.x === goal.x && c.y === goal.y)
    ) {
      walls[c.y][c.x] = !walls[c.y][c.x];
      run();
    }
  }
  if (drag) canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const c = pointerCell(e);
  if (!walkable(c.x, c.y) && !(walls[c.y]?.[c.x])) return;
  if (walls[c.y][c.x]) return;
  if (drag === "start") start = c;
  else goal = c;
  run();
});
canvas.addEventListener("pointerup", () => {
  drag = null;
});

btnRun?.addEventListener("click", run);
modeEl?.addEventListener("change", run);
btnReset?.addEventListener("click", () => {
  start = { ...C.start };
  goal = { ...C.goal };
  initWalls();
  run();
});

loadTextSample("../samples/JpsExample.cs", csharpSample, "// JpsExample.cs");
canvas.width = COLS * CELL;
canvas.height = ROWS * CELL;
initWalls();
run();
