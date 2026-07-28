/**
 * 加速度と重力: v += a*dt; p += v*dt
 * @see docs/topics/accel-gravity/SPEC.md
 */
import { ACCEL_GRAVITY_CONFIG as C } from "./maps/accel-gravity-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("ag-canvas")
);
const ctx = canvas.getContext("2d");
const gEl = /** @type {HTMLInputElement} */ (document.getElementById("g"));
const vxEl = /** @type {HTMLInputElement} */ (document.getElementById("vx"));
const restEl = /** @type {HTMLInputElement} */ (
  document.getElementById("restitution")
);
const gVal = document.getElementById("g-val");
const vxVal = document.getElementById("vx-val");
const restVal = document.getElementById("rest-val");
const btnPlay = document.getElementById("btn-play");
const btnStep = document.getElementById("btn-step");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

let x = 60;
let y = 40;
let vx = C.defaultVx;
let vy = 0;
let trail = /** @type {{x:number,y:number}[]} */ ([]);
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;

function readG() {
  return Number(gEl?.value) || 0;
}
function readVx() {
  return Number(vxEl?.value) || 0;
}
function readRest() {
  return Number(restEl?.value) || 0;
}
function sync() {
  if (gVal) gVal.textContent = String(readG());
  if (vxVal) vxVal.textContent = String(readVx());
  if (restVal) restVal.textContent = readRest().toFixed(2);
}

function step(dt) {
  const g = readG();
  vx = readVx(); // horizontal constant for clear parabola
  vy += g * dt;
  x += vx * dt;
  y += vy * dt;

  const r = 12;
  const floor = canvas.height - r - 8;
  if (y > floor) {
    y = floor;
    vy = -vy * readRest();
    if (Math.abs(vy) < 20) vy = 0;
  }
  if (x < r) {
    x = r;
    if (vxEl) vxEl.value = String(Math.abs(readVx()));
  }
  if (x > canvas.width - r) {
    x = canvas.width - r;
    if (vxEl) vxEl.value = String(-Math.abs(readVx()));
  }
  sync();
  trail.push({ x, y });
  if (trail.length > C.trailMax) trail.shift();
  draw();
  setStatus(
    `p=(${x.toFixed(0)},${y.toFixed(0)}) v=(${vx.toFixed(0)},${vy.toFixed(0)}) g=${g}`
  );
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);
  // floor
  ctx.fillStyle = "#3d4f66";
  ctx.fillRect(0, H - 8, W, 8);
  if (trail.length > 1) {
    ctx.strokeStyle = "rgba(242, 204, 143, 0.55)";
    ctx.beginPath();
    ctx.moveTo(trail[0].x, trail[0].y);
    for (const p of trail) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  // velocity arrow
  ctx.strokeStyle = "#5b9fd4";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + vx * 0.12, y + vy * 0.12);
  ctx.stroke();
  // gravity arrow
  ctx.strokeStyle = "#e07a5f";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + Math.min(40, readG() * 0.04));
  ctx.stroke();
  ctx.fillStyle = "#6bcb8f";
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("v ← v + g·dt   p ← p + v·dt", 12, 18);
  ctx.fillText("黄=軌跡  青=v  赤=g", 12, 34);
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
  x = 60;
  y = 40;
  vx = C.defaultVx;
  vy = 0;
  if (vxEl) vxEl.value = String(C.defaultVx);
  if (gEl) gEl.value = String(C.defaultG);
  if (restEl) restEl.value = String(C.defaultRestitution);
  trail = [];
  sync();
  draw();
  setStatus("リセット — 再生で放物線");
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
btnStep?.addEventListener("click", () => {
  stop();
  step(C.defaultDtMs / 1000);
});
btnReset?.addEventListener("click", reset);
for (const el of [gEl, vxEl, restEl]) {
  el?.addEventListener("input", sync);
}

loadTextSample(
  "../samples/AccelGravityExample.cs",
  csharpSample,
  "// AccelGravityExample.cs"
);
reset();
