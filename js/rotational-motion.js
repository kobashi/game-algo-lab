/**
 * 回転運動 — トルクと角速度
 * @see docs/topics/rotational-motion/SPEC.md
 */
import { ROTATIONAL_MOTION_CONFIG as C } from "./maps/rotational-motion-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("rm-canvas")
);
const ctx = canvas.getContext("2d");
const forceEl = /** @type {HTMLInputElement} */ (
  document.getElementById("force")
);
const offsetEl = /** @type {HTMLInputElement} */ (
  document.getElementById("offset")
);
const inertEl = /** @type {HTMLInputElement} */ (
  document.getElementById("inertia")
);
const forceVal = document.getElementById("force-val");
const offsetVal = document.getElementById("offset-val");
const inertVal = document.getElementById("inert-val");
const statsEl = document.getElementById("rm-stats");
const btnPlay = document.getElementById("btn-play");
const btnImpulse = document.getElementById("btn-impulse");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

let x = 320;
let y = 180;
let vx = 0;
let vy = 0;
let angle = 0;
let omega = 0;
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
/** @type {{x:number,y:number}[]} */
let trail = [];

function readForce() {
  const v = Number(forceEl?.value) || C.defaultForce;
  if (forceVal) forceVal.textContent = String(v);
  return v;
}
function readOffset() {
  const v = Number(offsetEl?.value) || 0;
  if (offsetVal) offsetVal.textContent = String(v);
  return v;
}
function readInertia() {
  const v = Number(inertEl?.value) || C.inertia;
  if (inertVal) inertVal.textContent = String(v);
  return Math.max(500, v);
}

/**
 * Apply upward force at local offset (along length from center)
 * @param {number} fMag
 * @param {number} localX  offset along body x axis
 * @param {number} dt
 */
export function applyForceAt(fMag, localX, dt) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  // force world: up
  const fx = 0;
  const fy = -fMag;
  vx += (fx / C.mass) * dt;
  vy += (fy / C.mass) * dt;
  // point of application in world
  const px = x + localX * c;
  const py = y + localX * s;
  const rx = px - x;
  const ry = py - y;
  const torque = rx * fy - ry * fx;
  omega += (torque / readInertia()) * dt;
  return { fx, fy, px, py, torque };
}

function step(dt) {
  // light gravity optional off - free space demo with damping
  vx *= Math.exp(-0.15 * dt);
  vy *= Math.exp(-0.15 * dt);
  omega *= Math.exp(-0.2 * dt);
  x += vx * dt;
  y += vy * dt;
  angle += omega * dt;

  // soft walls
  if (x < 60) {
    x = 60;
    vx = Math.abs(vx) * 0.5;
  }
  if (x > canvas.width - 60) {
    x = canvas.width - 60;
    vx = -Math.abs(vx) * 0.5;
  }
  if (y < 60) {
    y = 60;
    vy = Math.abs(vy) * 0.5;
  }
  if (y > canvas.height - 60) {
    y = canvas.height - 60;
    vy = -Math.abs(vy) * 0.5;
  }

  trail.push({ x, y });
  if (trail.length > 40) trail.shift();
  draw(null);
  renderStats(0);
}

function draw(impulse) {
  if (!ctx) return;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (trail.length > 1) {
    ctx.strokeStyle = "rgba(91, 159, 212, 0.35)";
    ctx.beginPath();
    ctx.moveTo(trail[0].x, trail[0].y);
    for (const p of trail) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const hw = C.halfW;
  const hh = C.halfH;
  const corners = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ].map(([lx, ly]) => ({
    x: x + lx * c - ly * s,
    y: y + lx * s + ly * c,
  }));
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < 4; i++) ctx.lineTo(corners[i].x, corners[i].y);
  ctx.closePath();
  ctx.fillStyle = "rgba(91, 159, 212, 0.4)";
  ctx.fill();
  ctx.strokeStyle = "#5b9fd4";
  ctx.lineWidth = 2;
  ctx.stroke();

  // center
  ctx.fillStyle = "#f2cc8f";
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();

  // force application point marker
  const ox = readOffset();
  const ax = x + ox * c;
  const ay = y + ox * s;
  ctx.strokeStyle = "#e07a5f";
  ctx.beginPath();
  ctx.arc(ax, ay, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax, ay - 40);
  ctx.stroke();

  if (impulse) {
    ctx.strokeStyle = "#6bcb8f";
    ctx.beginPath();
    ctx.moveTo(impulse.px, impulse.py);
    ctx.lineTo(impulse.px + impulse.fx * 0.05, impulse.py + impulse.fy * 0.05);
    ctx.stroke();
  }

  // velocity
  ctx.strokeStyle = "#f2cc8f";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + vx * 0.15, y + vy * 0.15);
  ctx.stroke();

  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("赤点=力の作用点（上向き）· 黄=v · オフセットでトルクが変わる", 12, 18);
}

function renderStats(torque) {
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>θ (deg)</td><td>${((angle * 180) / Math.PI).toFixed(1)}</td></tr>
        <tr><td>ω</td><td>${omega.toFixed(2)}</td></tr>
        <tr><td>|v|</td><td>${Math.hypot(vx, vy).toFixed(1)}</td></tr>
        <tr><td>I</td><td>${readInertia()}</td></tr>
        <tr><td>offset</td><td>${readOffset()}</td></tr>
      </table>`;
  }
  setStatus(`ω=${omega.toFixed(2)} θ=${((angle * 180) / Math.PI).toFixed(0)}°`);
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
  x = 320;
  y = 180;
  vx = 0;
  vy = 0;
  angle = 0;
  omega = 0;
  trail = [];
  if (forceEl) forceEl.value = String(C.defaultForce);
  if (offsetEl) offsetEl.value = "30";
  if (inertEl) inertEl.value = String(C.inertia);
  readForce();
  readOffset();
  readInertia();
  draw(null);
  renderStats(0);
  setStatus("リセット — インパルスで力を加える");
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
btnImpulse?.addEventListener("click", () => {
  const imp = applyForceAt(readForce(), readOffset(), 0.05);
  draw(imp);
  renderStats(imp.torque);
  setStatus(`インパルス · τ=${imp.torque.toFixed(0)}`);
  if (!running) {
    running = true;
    lastTs = 0;
    if (btnPlay) btnPlay.textContent = "一時停止";
    rafId = requestAnimationFrame(loop);
  }
});
btnReset?.addEventListener("click", reset);
for (const el of [forceEl, offsetEl, inertEl]) {
  el?.addEventListener("input", () => {
    readForce();
    readOffset();
    readInertia();
    draw(null);
  });
}

loadTextSample(
  "../samples/RotationalMotionExample.cs",
  csharpSample,
  "// RotationalMotionExample.cs"
);
reset();
