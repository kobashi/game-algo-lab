/**
 * 摩擦・反発
 * @see docs/topics/friction-bounce/SPEC.md
 */
import { FRICTION_BOUNCE_CONFIG as C } from "./maps/friction-bounce-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("fb-canvas")
);
const ctx = canvas.getContext("2d");
const restEl = /** @type {HTMLInputElement} */ (
  document.getElementById("restitution")
);
const fricEl = /** @type {HTMLInputElement} */ (
  document.getElementById("friction")
);
const restVal = document.getElementById("rest-val");
const fricVal = document.getElementById("fric-val");
const statsEl = document.getElementById("fb-stats");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const btnKick = document.getElementById("btn-kick");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

let x = 80;
let y = 40;
let vx = C.defaultVx;
let vy = 0;
let trail = /** @type {{x:number,y:number}[]} */ ([]);
let bounceCount = 0;
let grounded = false;
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;

function readRest() {
  const v = Number(restEl?.value) ?? C.defaultRestitution;
  if (restVal) restVal.textContent = v.toFixed(2);
  return v;
}
function readFric() {
  const v = Number(fricEl?.value) ?? C.defaultFriction;
  if (fricVal) fricVal.textContent = v.toFixed(1);
  return v;
}

function step(dt) {
  const r = C.ballR;
  const floor = canvas.height - 12 - r;
  vy += C.gravity * dt;
  x += vx * dt;
  y += vy * dt;
  grounded = false;

  if (y > floor) {
    y = floor;
    if (vy > 0) {
      const before = vy;
      vy = -vy * readRest();
      if (before > 40) bounceCount += 1;
      if (Math.abs(vy) < 12) vy = 0;
    }
    grounded = true;
    vx *= Math.exp(-readFric() * dt);
    if (Math.abs(vx) < 2) vx = 0;
  }

  if (x < r) {
    x = r;
    vx = Math.abs(vx) * readRest();
  }
  if (x > canvas.width - r) {
    x = canvas.width - r;
    vx = -Math.abs(vx) * readRest();
  }

  trail.push({ x, y });
  if (trail.length > C.trailMax) trail.shift();
  draw();
  renderStats();
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#3d4f66";
  ctx.fillRect(0, H - 12, W, 12);

  if (trail.length > 1) {
    ctx.strokeStyle = "rgba(242, 204, 143, 0.5)";
    ctx.beginPath();
    ctx.moveTo(trail[0].x, trail[0].y);
    for (const p of trail) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  // velocity
  ctx.strokeStyle = "#5b9fd4";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + vx * 0.1, y + vy * 0.1);
  ctx.stroke();

  ctx.fillStyle = grounded ? "#6bcb8f" : "#e07a5f";
  ctx.beginPath();
  ctx.arc(x, y, C.ballR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("床: 反発→vy反転  摩擦→vx減衰", 12, 18);
}

function renderStats() {
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>vx / vy</td><td>${vx.toFixed(0)} / ${vy.toFixed(0)}</td></tr>
        <tr><td>反発 e</td><td>${readRest().toFixed(2)}</td></tr>
        <tr><td>摩擦</td><td>${readFric().toFixed(1)}</td></tr>
        <tr><td>バウンス回数</td><td>${bounceCount}</td></tr>
        <tr><td>接地</td><td>${grounded ? "yes" : "no"}</td></tr>
      </table>`;
  }
  setStatus(
    `v=(${vx.toFixed(0)},${vy.toFixed(0)}) e=${readRest().toFixed(2)} μ≈${readFric().toFixed(1)}`
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
  y = 40;
  vx = C.defaultVx;
  vy = 0;
  trail = [];
  bounceCount = 0;
  if (restEl) restEl.value = String(C.defaultRestitution);
  if (fricEl) fricEl.value = String(C.defaultFriction);
  readRest();
  readFric();
  draw();
  renderStats();
  setStatus("リセット — 再生で落下・バウンス");
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
btnKick?.addEventListener("click", () => {
  vx = (Math.random() > 0.5 ? 1 : -1) * (140 + Math.random() * 120);
  vy = -280 - Math.random() * 120;
  setStatus(`キック vx=${vx.toFixed(0)} vy=${vy.toFixed(0)}`);
});
for (const el of [restEl, fricEl]) {
  el?.addEventListener("input", () => {
    readRest();
    readFric();
  });
}

loadTextSample(
  "../samples/FrictionBounceExample.cs",
  csharpSample,
  "// FrictionBounceExample.cs"
);
reset();
