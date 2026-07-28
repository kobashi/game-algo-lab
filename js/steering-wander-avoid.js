/**
 * Wander + Obstacle Avoidance
 * @see docs/topics/steering-wander-avoid/SPEC.md
 */
import { STEERING_WANDER_AVOID_CONFIG as C } from "./maps/steering-wander-avoid-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("wa-canvas")
);
const ctx = canvas.getContext("2d");
const wanderOnEl = /** @type {HTMLInputElement} */ (
  document.getElementById("wander-on")
);
const avoidOnEl = /** @type {HTMLInputElement} */ (
  document.getElementById("avoid-on")
);
const jitterEl = /** @type {HTMLInputElement} */ (
  document.getElementById("jitter")
);
const jitterVal = document.getElementById("jitter-val");
const statsEl = document.getElementById("wa-stats");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

let px = 80;
let py = 200;
let vx = 80;
let vy = 10;
let wanderTheta = 0;
let wanderTarget = { x: 0, y: 0 };
let avoidForce = { x: 0, y: 0 };
let wanderForce = { x: 0, y: 0 };
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
/** @type {{x:number,y:number}[]} */
let trail = [];

function readJitter() {
  const v = Number(jitterEl?.value) || C.wanderJitter;
  if (jitterVal) jitterVal.textContent = String(v);
  return v;
}

function clampMag(x, y, max) {
  const m = Math.hypot(x, y);
  if (m > max && m > 1e-9) return { x: (x / m) * max, y: (y / m) * max };
  return { x, y };
}

function seek(tx, ty) {
  const dx = tx - px;
  const dy = ty - py;
  const dist = Math.hypot(dx, dy) || 1;
  const dsx = (dx / dist) * C.maxSpeed;
  const dsy = (dy / dist) * C.maxSpeed;
  return clampMag(dsx - vx, dsy - vy, C.maxForce);
}

/**
 * @param {number} dt
 */
export function computeWander(dt, jitter) {
  wanderTheta += (Math.random() * 2 - 1) * jitter * dt;
  const spd = Math.hypot(vx, vy) || 1;
  const hx = vx / spd;
  const hy = vy / spd;
  const cx = px + hx * C.wanderDistance;
  const cy = py + hy * C.wanderDistance;
  const tx = cx + Math.cos(wanderTheta) * C.wanderRadius;
  const ty = cy + Math.sin(wanderTheta) * C.wanderRadius;
  wanderTarget = { x: tx, y: ty };
  return seek(tx, ty);
}

export function computeAvoid() {
  const spd = Math.hypot(vx, vy) || 1;
  const hx = vx / spd;
  const hy = vy / spd;
  const fx = px + hx * C.avoidDistance;
  const fy = py + hy * C.avoidDistance;
  let ax = 0;
  let ay = 0;
  let hit = false;
  for (const o of C.obstacles) {
    const dx = fx - o.x;
    const dy = fy - o.y;
    const d = Math.hypot(dx, dy);
    const limit = o.r + C.avoidRadius;
    if (d < limit && d > 1e-6) {
      // push sideways away from obstacle center
      const strength = (limit - d) / limit;
      ax += (dx / d) * strength * C.maxForce;
      ay += (dy / d) * strength * C.maxForce;
      hit = true;
    }
  }
  return { force: clampMag(ax, ay, C.maxForce), hit, look: { x: fx, y: fy } };
}

function step(dt) {
  let fx = 0;
  let fy = 0;
  if (wanderOnEl?.checked) {
    wanderForce = computeWander(dt, readJitter());
    fx += wanderForce.x;
    fy += wanderForce.y;
  } else {
    wanderForce = { x: 0, y: 0 };
  }
  let look = { x: px, y: py };
  if (avoidOnEl?.checked) {
    const a = computeAvoid();
    avoidForce = a.force;
    look = a.look;
    fx += avoidForce.x * 1.6;
    fy += avoidForce.y * 1.6;
  } else {
    avoidForce = { x: 0, y: 0 };
  }
  const f = clampMag(fx, fy, C.maxForce * 1.5);
  vx += f.x * dt;
  vy += f.y * dt;
  const cl = clampMag(vx, vy, C.maxSpeed);
  vx = cl.x;
  vy = cl.y;
  px += vx * dt;
  py += vy * dt;
  // wrap
  if (px < 0) px = canvas.width;
  if (px > canvas.width) px = 0;
  if (py < 0) py = canvas.height;
  if (py > canvas.height) py = 0;
  trail.push({ x: px, y: py });
  if (trail.length > 50) trail.shift();
  draw(look);
  renderStats();
}

function draw(look) {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  for (const o of C.obstacles) {
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(61, 79, 102, 0.9)";
    ctx.fill();
    ctx.strokeStyle = "#9aabbf";
    ctx.stroke();
  }

  if (trail.length > 1) {
    ctx.strokeStyle = "rgba(91, 159, 212, 0.35)";
    ctx.beginPath();
    ctx.moveTo(trail[0].x, trail[0].y);
    for (const p of trail) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  // wander circle ahead
  if (wanderOnEl?.checked) {
    const spd = Math.hypot(vx, vy) || 1;
    const hx = vx / spd;
    const hy = vy / spd;
    const cx = px + hx * C.wanderDistance;
    const cy = py + hy * C.wanderDistance;
    ctx.strokeStyle = "rgba(242, 204, 143, 0.5)";
    ctx.beginPath();
    ctx.arc(cx, cy, C.wanderRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#f2cc8f";
    ctx.beginPath();
    ctx.arc(wanderTarget.x, wanderTarget.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // avoid look-ahead
  if (avoidOnEl?.checked) {
    ctx.strokeStyle = "rgba(224, 122, 95, 0.5)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(look.x, look.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(look.x, look.y, C.avoidRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // agent
  ctx.fillStyle = "#5b9fd4";
  ctx.beginPath();
  ctx.arc(px, py, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#6bcb8f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px + vx * 0.2, py + vy * 0.2);
  ctx.stroke();

  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("黄=Wander 点 · 赤破線=回避の前方円", 12, 18);
}

function renderStats() {
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>|v|</td><td>${Math.hypot(vx, vy).toFixed(0)}</td></tr>
        <tr><td>|wander|</td><td>${Math.hypot(wanderForce.x, wanderForce.y).toFixed(0)}</td></tr>
        <tr><td>|avoid|</td><td>${Math.hypot(avoidForce.x, avoidForce.y).toFixed(0)}</td></tr>
      </table>`;
  }
  setStatus(
    `W=${wanderOnEl?.checked ? "on" : "off"} A=${avoidOnEl?.checked ? "on" : "off"}`
  );
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
  px = 80;
  py = 200;
  vx = 80;
  vy = 10;
  wanderTheta = 0;
  trail = [];
  if (jitterEl) jitterEl.value = String(C.wanderJitter);
  readJitter();
  draw({ x: px, y: py });
  renderStats();
  setStatus("リセット");
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
jitterEl?.addEventListener("input", () => readJitter());

loadTextSample(
  "../samples/SteeringWanderAvoidExample.cs",
  csharpSample,
  "// SteeringWanderAvoidExample.cs"
);
reset();
