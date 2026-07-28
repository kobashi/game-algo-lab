/**
 * Seek / Flee / Arrive
 * @see docs/topics/steering-seek-flee/SPEC.md
 */
import { STEERING_SEEK_FLEE_CONFIG as C } from "./maps/steering-seek-flee-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("st-canvas")
);
const ctx = canvas.getContext("2d");
const modeEl = /** @type {HTMLSelectElement} */ (
  document.getElementById("mode")
);
const maxSpEl = /** @type {HTMLInputElement} */ (
  document.getElementById("max-speed")
);
const maxFEl = /** @type {HTMLInputElement} */ (
  document.getElementById("max-force")
);
const arrEl = /** @type {HTMLInputElement} */ (
  document.getElementById("arrive-r")
);
const maxSpVal = document.getElementById("max-speed-val");
const maxFVal = document.getElementById("max-force-val");
const arrVal = document.getElementById("arrive-r-val");
const statsEl = document.getElementById("st-stats");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

let px = 120;
let py = 180;
let vx = 0;
let vy = 0;
let tx = 480;
let ty = 180;
let forceX = 0;
let forceY = 0;
let desiredX = 0;
let desiredY = 0;
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
/** @type {{x:number,y:number}[]} */
let trail = [];

function readMode() {
  return modeEl?.value || C.defaultMode;
}
function readMaxSpeed() {
  const v = Number(maxSpEl?.value) || C.maxSpeed;
  if (maxSpVal) maxSpVal.textContent = String(v);
  return v;
}
function readMaxForce() {
  const v = Number(maxFEl?.value) || C.maxForce;
  if (maxFVal) maxFVal.textContent = String(v);
  return v;
}
function readArriveR() {
  const v = Number(arrEl?.value) || C.arriveRadius;
  if (arrVal) arrVal.textContent = String(v);
  return v;
}

function clampMag(x, y, max) {
  const m = Math.hypot(x, y);
  if (m > max && m > 1e-9) return { x: (x / m) * max, y: (y / m) * max };
  return { x, y };
}

/**
 * @param {string} mode
 */
export function steeringForce(mode, px, py, vx, vy, tx, ty, maxSpeed, maxForce, arriveR) {
  let dx = tx - px;
  let dy = ty - py;
  if (mode === "flee") {
    dx = -dx;
    dy = -dy;
  }
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6) {
    return { fx: 0, fy: 0, dx: 0, dy: 0 };
  }
  let speed = maxSpeed;
  if (mode === "arrive" && dist < arriveR) {
    speed = maxSpeed * (dist / arriveR);
  }
  const dsx = (dx / dist) * speed;
  const dsy = (dy / dist) * speed;
  let fx = dsx - vx;
  let fy = dsy - vy;
  const cl = clampMag(fx, fy, maxForce);
  return { fx: cl.x, fy: cl.y, dx: dsx, dy: dsy };
}

function step(dt) {
  const mode = readMode();
  const maxSpeed = readMaxSpeed();
  const maxForce = readMaxForce();
  const arriveR = readArriveR();
  const s = steeringForce(
    mode,
    px,
    py,
    vx,
    vy,
    tx,
    ty,
    maxSpeed,
    maxForce,
    arriveR
  );
  forceX = s.fx;
  forceY = s.fy;
  desiredX = s.dx;
  desiredY = s.dy;
  vx += (forceX / C.mass) * dt;
  vy += (forceY / C.mass) * dt;
  const clv = clampMag(vx, vy, maxSpeed);
  vx = clv.x;
  vy = clv.y;
  px += vx * dt;
  py += vy * dt;
  // soft walls
  if (px < 12) {
    px = 12;
    vx = Math.abs(vx);
  }
  if (px > canvas.width - 12) {
    px = canvas.width - 12;
    vx = -Math.abs(vx);
  }
  if (py < 12) {
    py = 12;
    vy = Math.abs(vy);
  }
  if (py > canvas.height - 12) {
    py = canvas.height - 12;
    vy = -Math.abs(vy);
  }
  trail.push({ x: px, y: py });
  if (trail.length > 60) trail.shift();
  draw();
  renderStats();
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  if (readMode() === "arrive") {
    ctx.strokeStyle = "rgba(107, 203, 143, 0.35)";
    ctx.beginPath();
    ctx.arc(tx, ty, readArriveR(), 0, Math.PI * 2);
    ctx.stroke();
  }

  if (trail.length > 1) {
    ctx.strokeStyle = "rgba(91, 159, 212, 0.4)";
    ctx.beginPath();
    ctx.moveTo(trail[0].x, trail[0].y);
    for (const p of trail) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  // target
  ctx.fillStyle = "#e07a5f";
  ctx.beginPath();
  ctx.arc(tx, ty, 8, 0, Math.PI * 2);
  ctx.fill();

  // agent
  ctx.fillStyle = "#5b9fd4";
  ctx.beginPath();
  ctx.arc(px, py, 12, 0, Math.PI * 2);
  ctx.fill();

  // velocity (blue)
  ctx.strokeStyle = "#5b9fd4";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px + vx * 0.2, py + vy * 0.2);
  ctx.stroke();

  // desired (yellow)
  ctx.strokeStyle = "#f2cc8f";
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px + desiredX * 0.2, py + desiredY * 0.2);
  ctx.stroke();

  // force (green)
  ctx.strokeStyle = "#6bcb8f";
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px + forceX * 0.15, py + forceY * 0.15);
  ctx.stroke();

  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("青=v · 黄=desired · 緑=steer · 赤=target（クリック）", 12, 18);
}

function renderStats() {
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>モード</td><td>${readMode()}</td></tr>
        <tr><td>|v|</td><td>${Math.hypot(vx, vy).toFixed(1)}</td></tr>
        <tr><td>|steer|</td><td>${Math.hypot(forceX, forceY).toFixed(1)}</td></tr>
        <tr><td>距離</td><td>${Math.hypot(tx - px, ty - py).toFixed(0)}</td></tr>
      </table>`;
  }
  setStatus(`${readMode()} · |v|=${Math.hypot(vx, vy).toFixed(0)}`);
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
  px = 120;
  py = 180;
  vx = 40;
  vy = 0;
  tx = 480;
  ty = 180;
  trail = [];
  if (maxSpEl) maxSpEl.value = String(C.maxSpeed);
  if (maxFEl) maxFEl.value = String(C.maxForce);
  if (arrEl) arrEl.value = String(C.arriveRadius);
  if (modeEl) modeEl.value = C.defaultMode;
  readMaxSpeed();
  readMaxForce();
  readArriveR();
  draw();
  renderStats();
  setStatus("リセット — クリックでターゲット");
}

canvas?.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  tx = ((e.clientX - rect.left) * canvas.width) / rect.width;
  ty = ((e.clientY - rect.top) * canvas.height) / rect.height;
  setStatus(`target (${tx.toFixed(0)}, ${ty.toFixed(0)})`);
  draw();
});

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
for (const el of [modeEl, maxSpEl, maxFEl, arrEl]) {
  el?.addEventListener("input", () => {
    readMaxSpeed();
    readMaxForce();
    readArriveR();
    draw();
    renderStats();
  });
}

loadTextSample(
  "../samples/SteeringSeekFleeExample.cs",
  csharpSample,
  "// SteeringSeekFleeExample.cs"
);
reset();
