/**
 * 障害物回避 + ナビ（BFS 経路）
 */
import { OBSTACLE_AVOIDANCE_NAV_CONFIG as C } from "./maps/obstacle-avoidance-nav-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("oan-canvas")
);
const ctx = canvas.getContext("2d");
const useNavEl = /** @type {HTMLInputElement} */ (
  document.getElementById("use-nav")
);
const useAvoidEl = /** @type {HTMLInputElement} */ (
  document.getElementById("use-avoid")
);
const statsEl = document.getElementById("oan-stats");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** @type {boolean[][]} true=wall */
let walls = [];
let start = { x: 1, y: 1 };
let goal = { x: 18, y: 9 };
/** @type {{x:number,y:number}[]} */
let path = [];
let agent = { x: 0, y: 0, vx: 0, vy: 0 };
let wpIndex = 0;
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;

function parseMap() {
  walls = [];
  for (let y = 0; y < C.rows; y++) {
    const row = [];
    for (let x = 0; x < C.cols; x++) {
      const ch = C.map[y][x];
      if (ch === "S") start = { x, y };
      if (ch === "G") goal = { x, y };
      row.push(ch === "#");
    }
    walls.push(row);
  }
}

/**
 * @param {{x:number,y:number}} s
 * @param {{x:number,y:number}} g
 */
export function bfsPath(s, g) {
  const key = (x, y) => `${x},${y}`;
  const q = [s];
  const prev = new Map();
  prev.set(key(s.x, s.y), null);
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (q.length) {
    const cur = q.shift();
    if (!cur) break;
    if (cur.x === g.x && cur.y === g.y) {
      const out = [];
      let k = key(g.x, g.y);
      while (k) {
        const [x, y] = k.split(",").map(Number);
        out.push({ x, y });
        k = prev.get(k);
      }
      out.reverse();
      return out;
    }
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= C.cols || ny >= C.rows) continue;
      if (walls[ny][nx]) continue;
      const nk = key(nx, ny);
      if (prev.has(nk)) continue;
      prev.set(nk, key(cur.x, cur.y));
      q.push({ x: nx, y: ny });
    }
  }
  return [];
}

function cellCenter(c) {
  return {
    x: c.x * C.cell + C.cell / 2,
    y: c.y * C.cell + C.cell / 2,
  };
}

function clampMag(x, y, max) {
  const m = Math.hypot(x, y);
  if (m > max && m > 1e-9) return { x: (x / m) * max, y: (y / m) * max };
  return { x, y };
}

function seek(tx, ty) {
  const dx = tx - agent.x;
  const dy = ty - agent.y;
  const d = Math.hypot(dx, dy) || 1;
  const dsx = (dx / d) * C.maxSpeed;
  const dsy = (dy / d) * C.maxSpeed;
  return clampMag(dsx - agent.vx, dsy - agent.vy, C.maxForce);
}

function avoidWalls() {
  let ax = 0;
  let ay = 0;
  const feel = C.cell * 1.2;
  const gx = Math.floor(agent.x / C.cell);
  const gy = Math.floor(agent.y / C.cell);
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const cx = gx + ox;
      const cy = gy + oy;
      if (cx < 0 || cy < 0 || cx >= C.cols || cy >= C.rows) continue;
      if (!walls[cy][cx]) continue;
      const c = cellCenter({ x: cx, y: cy });
      const dx = agent.x - c.x;
      const dy = agent.y - c.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < feel) {
        const s = (feel - dist) / feel;
        ax += (dx / dist) * s * C.maxForce;
        ay += (dy / dist) * s * C.maxForce;
      }
    }
  }
  return clampMag(ax, ay, C.maxForce);
}

function step(dt) {
  let fx = 0;
  let fy = 0;
  if (useNavEl?.checked && path.length) {
    if (wpIndex >= path.length) wpIndex = path.length - 1;
    const wp = cellCenter(path[wpIndex]);
    const d = Math.hypot(wp.x - agent.x, wp.y - agent.y);
    if (d < C.cell * 0.4 && wpIndex < path.length - 1) wpIndex += 1;
    const s = seek(wp.x, wp.y);
    fx += s.x;
    fy += s.y;
  } else {
    const g = cellCenter(goal);
    const s = seek(g.x, g.y);
    fx += s.x;
    fy += s.y;
  }
  if (useAvoidEl?.checked) {
    const a = avoidWalls();
    fx += a.x * 1.4;
    fy += a.y * 1.4;
  }
  const f = clampMag(fx, fy, C.maxForce);
  agent.vx += f.x * dt;
  agent.vy += f.y * dt;
  const cl = clampMag(agent.vx, agent.vy, C.maxSpeed);
  agent.vx = cl.x;
  agent.vy = cl.y;
  agent.x += agent.vx * dt;
  agent.y += agent.vy * dt;
  // soft block into walls
  const cx = Math.floor(agent.x / C.cell);
  const cy = Math.floor(agent.y / C.cell);
  if (cx >= 0 && cy >= 0 && cx < C.cols && cy < C.rows && walls[cy][cx]) {
    agent.x -= agent.vx * dt * 2;
    agent.y -= agent.vy * dt * 2;
    agent.vx *= -0.3;
    agent.vy *= -0.3;
  }
  draw();
  renderStats();
}

function draw() {
  if (!ctx) return;
  canvas.width = C.cols * C.cell;
  canvas.height = C.rows * C.cell;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < C.rows; y++) {
    for (let x = 0; x < C.cols; x++) {
      if (walls[y][x]) {
        ctx.fillStyle = "#3d4f66";
        ctx.fillRect(x * C.cell, y * C.cell, C.cell, C.cell);
      }
    }
  }
  // path
  if (useNavEl?.checked && path.length > 1) {
    ctx.strokeStyle = "rgba(107, 203, 143, 0.7)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    const p0 = cellCenter(path[0]);
    ctx.moveTo(p0.x, p0.y);
    for (const p of path) {
      const c = cellCenter(p);
      ctx.lineTo(c.x, c.y);
    }
    ctx.stroke();
  }
  const gs = cellCenter(start);
  const gg = cellCenter(goal);
  ctx.fillStyle = "#6bcb8f";
  ctx.beginPath();
  ctx.arc(gs.x, gs.y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e07a5f";
  ctx.beginPath();
  ctx.arc(gg.x, gg.y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5b9fd4";
  ctx.beginPath();
  ctx.arc(agent.x, agent.y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#f2cc8f";
  ctx.beginPath();
  ctx.moveTo(agent.x, agent.y);
  ctx.lineTo(agent.x + agent.vx * 0.2, agent.y + agent.vy * 0.2);
  ctx.stroke();
}

function renderStats() {
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>経路長</td><td>${path.length || "—"}</td></tr>
        <tr><td>WP</td><td>${wpIndex}/${Math.max(0, path.length - 1)}</td></tr>
        <tr><td>ナビ</td><td>${useNavEl?.checked ? "ON" : "OFF"}</td></tr>
        <tr><td>局所回避</td><td>${useAvoidEl?.checked ? "ON" : "OFF"}</td></tr>
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

function stop() {
  running = false;
  if (rafId != null) cancelAnimationFrame(rafId);
  rafId = null;
  if (btnPlay) btnPlay.textContent = "再生";
}

function reset() {
  stop();
  parseMap();
  path = bfsPath(start, goal);
  const s = cellCenter(start);
  agent = { x: s.x, y: s.y, vx: 0, vy: 0 };
  wpIndex = 0;
  draw();
  renderStats();
  setStatus(`BFS 経路 ${path.length} 点 — ナビ+回避を比較`);
}

btnPlay?.addEventListener("click", () => {
  if (running) {
    stop();
    return;
  }
  running = true;
  lastTs = 0;
  if (btnPlay) btnPlay.textContent = "一時停止";
  rafId = requestAnimationFrame(loop);
});
btnReset?.addEventListener("click", reset);

loadTextSample(
  "../samples/ObstacleAvoidanceNavExample.cs",
  csharpSample,
  "// ObstacleAvoidanceNavExample.cs"
);
reset();
