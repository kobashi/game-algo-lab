/**
 * 加減速 — 加速・最高速度・ブレーキ
 * @see docs/topics/accel-decel/SPEC.md
 */
import { ACCEL_DECEL_CONFIG as C } from "./maps/accel-decel-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("ad-canvas")
);
const ctx = canvas.getContext("2d");
const accelEl = /** @type {HTMLInputElement} */ (
  document.getElementById("accel")
);
const maxEl = /** @type {HTMLInputElement} */ (
  document.getElementById("max-speed")
);
const brakeEl = /** @type {HTMLInputElement} */ (
  document.getElementById("brake")
);
const accelVal = document.getElementById("accel-val");
const maxVal = document.getElementById("max-val");
const brakeVal = document.getElementById("brake-val");
const statsEl = document.getElementById("ad-stats");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** @type {Set<string>} */
const keys = new Set();
let x = 80;
let y = 0;
let vx = 0;
let trail = /** @type {number[]} */ ([]);
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;

function readAccel() {
  const v = Number(accelEl?.value) || C.defaultAccel;
  if (accelVal) accelVal.textContent = String(v);
  return v;
}
function readMax() {
  const v = Number(maxEl?.value) || C.defaultMaxSpeed;
  if (maxVal) maxVal.textContent = String(v);
  return v;
}
function readBrake() {
  const v = Number(brakeEl?.value) || C.defaultBrake;
  if (brakeVal) brakeVal.textContent = v.toFixed(1);
  return v;
}

function inputAxis() {
  let a = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) a -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) a += 1;
  return a;
}

function step(dt) {
  const input = inputAxis();
  const accel = readAccel();
  const max = readMax();
  const brake = readBrake();

  if (Math.abs(input) > 0.01) {
    vx += input * accel * dt;
    if (vx > max) vx = max;
    if (vx < -max) vx = -max;
  } else {
    vx *= Math.exp(-brake * dt);
    if (Math.abs(vx) < 1) vx = 0;
  }

  x += vx * dt;
  const r = 16;
  if (x < r) {
    x = r;
    vx = 0;
  }
  if (x > canvas.width - r) {
    x = canvas.width - r;
    vx = 0;
  }
  y = canvas.height / 2;

  trail.push(x);
  if (trail.length > C.trailMax) trail.shift();
  draw();
  renderStats(input);
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  // ground line
  ctx.strokeStyle = "#3d4f66";
  ctx.beginPath();
  ctx.moveTo(0, H / 2 + 20);
  ctx.lineTo(W, H / 2 + 20);
  ctx.stroke();

  // max speed markers (conceptual)
  const max = readMax();
  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText(`max ±${max}`, 12, 18);

  // trail
  if (trail.length > 1) {
    ctx.strokeStyle = "rgba(91, 159, 212, 0.4)";
    ctx.beginPath();
    for (let i = 0; i < trail.length; i++) {
      const px = trail[i];
      const py = H / 2;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // velocity bar under player
  const barW = Math.min(120, Math.abs(vx) * 0.4);
  ctx.fillStyle = vx >= 0 ? "#6bcb8f" : "#e07a5f";
  ctx.fillRect(x, H / 2 + 28, vx >= 0 ? barW : -barW, 6);

  // player
  ctx.fillStyle = "#5b9fd4";
  ctx.beginPath();
  ctx.arc(x, H / 2, 16, 0, Math.PI * 2);
  ctx.fill();

  // accel arrow
  const input = inputAxis();
  if (input !== 0) {
    ctx.strokeStyle = "#f2cc8f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, H / 2 - 28);
    ctx.lineTo(x + input * 40, H / 2 - 28);
    ctx.stroke();
  }
}

function renderStats(input) {
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>入力</td><td>${input}</td></tr>
        <tr><td>vx</td><td>${vx.toFixed(1)}</td></tr>
        <tr><td>|vx|/max</td><td>${(Math.abs(vx) / Math.max(1, readMax())).toFixed(2)}</td></tr>
        <tr><td>モード</td><td>${Math.abs(input) > 0.01 ? "加速" : "ブレーキ"}</td></tr>
      </table>`;
  }
  setStatus(
    `vx=${vx.toFixed(1)} · ${Math.abs(input) > 0.01 ? "加速中" : "減速中"}`
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
  x = 80;
  vx = 0;
  trail = [];
  if (accelEl) accelEl.value = String(C.defaultAccel);
  if (maxEl) maxEl.value = String(C.defaultMaxSpeed);
  if (brakeEl) brakeEl.value = String(C.defaultBrake);
  readAccel();
  readMax();
  readBrake();
  draw();
  renderStats(0);
  setStatus("リセット — ←→ で加速、離すとブレーキ");
}

window.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(e.code)) {
    e.preventDefault();
    keys.add(e.code);
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.code));

btnPlay?.addEventListener("click", () => {
  if (running) {
    stop();
    return;
  }
  running = true;
  lastTs = 0;
  if (btnPlay) btnPlay.textContent = "一時停止";
  canvas?.focus();
  rafId = requestAnimationFrame(loop);
});
btnReset?.addEventListener("click", reset);
for (const el of [accelEl, maxEl, brakeEl]) {
  el?.addEventListener("input", () => {
    readAccel();
    readMax();
    readBrake();
  });
}

loadTextSample(
  "../samples/AccelDecelExample.cs",
  csharpSample,
  "// AccelDecelExample.cs"
);
reset();
