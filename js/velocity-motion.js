/**
 * 速度による移動: p += v * dt
 */
import { VELOCITY_MOTION_CONFIG as C } from "./maps/velocity-motion-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("vm-canvas")
);
const ctx = canvas.getContext("2d");
const vxEl = /** @type {HTMLInputElement} */ (document.getElementById("vx"));
const vyEl = /** @type {HTMLInputElement} */ (document.getElementById("vy"));
const dtEl = /** @type {HTMLInputElement} */ (document.getElementById("dt"));
const bounceEl = /** @type {HTMLInputElement} */ (
  document.getElementById("bounce")
);
const vxVal = document.getElementById("vx-val");
const vyVal = document.getElementById("vy-val");
const dtVal = document.getElementById("dt-val");
const btnPlay = document.getElementById("btn-play");
const btnStep = document.getElementById("btn-step");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

let x = 80;
let y = 140;
let trail = /** @type {{x:number,y:number}[]} */ ([]);
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;

function readVx() {
  return Number(vxEl?.value) || 0;
}
function readVy() {
  return Number(vyEl?.value) || 0;
}
function readDtSec() {
  return (Number(dtEl?.value) || C.defaultDtMs) / 1000;
}
function sync() {
  if (vxVal) vxVal.textContent = String(readVx());
  if (vyVal) vyVal.textContent = String(readVy());
  if (dtVal) dtVal.textContent = (readDtSec() * 1000).toFixed(1);
}

function step(dt) {
  x += readVx() * dt;
  y += readVy() * dt;
  const bounce = !!bounceEl?.checked;
  const r = 12;
  if (bounce) {
    if (x < r) {
      x = r;
      if (vxEl) vxEl.value = String(Math.abs(readVx()));
    }
    if (x > canvas.width - r) {
      x = canvas.width - r;
      if (vxEl) vxEl.value = String(-Math.abs(readVx()));
    }
    if (y < r) {
      y = r;
      if (vyEl) vyEl.value = String(Math.abs(readVy()));
    }
    if (y > canvas.height - r) {
      y = canvas.height - r;
      if (vyEl) vyEl.value = String(-Math.abs(readVy()));
    }
    sync();
  }
  trail.push({ x, y });
  if (trail.length > C.trailMax) trail.shift();
  draw();
  setStatus(
    `p=(${x.toFixed(1)}, ${y.toFixed(1)})  v=(${readVx()}, ${readVy()})  dt=${(dt * 1000).toFixed(1)}ms`
  );
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(90,106,128,0.4)";
  for (let g = 40; g < W; g += 40) {
    ctx.beginPath();
    ctx.moveTo(g, 0);
    ctx.lineTo(g, H);
    ctx.stroke();
  }
  for (let g = 40; g < H; g += 40) {
    ctx.beginPath();
    ctx.moveTo(0, g);
    ctx.lineTo(W, g);
    ctx.stroke();
  }
  if (trail.length > 1) {
    ctx.strokeStyle = "rgba(91,159,212,0.5)";
    ctx.beginPath();
    ctx.moveTo(trail[0].x, trail[0].y);
    for (const p of trail) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  // velocity arrow
  ctx.strokeStyle = "#f2cc8f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + readVx() * 0.25, y + readVy() * 0.25);
  ctx.stroke();
  ctx.fillStyle = "#5b9fd4";
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("p ← p + v·dt", 12, 18);
}

function loop(ts) {
  if (!running) return;
  if (!lastTs) lastTs = ts;
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (dt > 0.05) dt = 0.05;
  // optional fixed display dt override when slider used as step size preference
  step(dt);
  rafId = requestAnimationFrame(loop);
}

function stop() {
  running = false;
  if (rafId != null) cancelAnimationFrame(rafId);
  rafId = null;
  if (btnPlay) btnPlay.textContent = "再生";
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
  step(readDtSec());
});
btnReset?.addEventListener("click", () => {
  stop();
  x = 80;
  y = 140;
  trail = [];
  draw();
  setStatus("リセット");
});
for (const el of [vxEl, vyEl, dtEl]) {
  el?.addEventListener("input", sync);
}

loadTextSample(
  "../samples/VelocityMotionExample.cs",
  csharpSample,
  "// samples/VelocityMotionExample.cs"
);
if (vxEl) vxEl.value = String(C.defaultVx);
if (vyEl) vyEl.value = String(C.defaultVy);
if (dtEl) dtEl.value = String(C.defaultDtMs);
sync();
draw();
setStatus("準備完了 — 再生または 1ステップ");
