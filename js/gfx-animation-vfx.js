/**
 * パーティクル VFX
 */
import { GFX_ANIMATION_VFX_CONFIG as C } from "./maps/gfx-animation-vfx-config.js";
import {
  createStatus,
  loadTextSample,
  mulberry32,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("vfx-canvas")
);
const ctx = canvas.getContext("2d");
const maxEl = /** @type {HTMLInputElement} */ (
  document.getElementById("max-p")
);
const lifeEl = /** @type {HTMLInputElement} */ (
  document.getElementById("life")
);
const gravEl = /** @type {HTMLInputElement} */ (
  document.getElementById("grav")
);
const emitEl = /** @type {HTMLInputElement} */ (
  document.getElementById("emit")
);
const maxVal = document.getElementById("max-val");
const lifeVal = document.getElementById("life-val");
const gravVal = document.getElementById("grav-val");
const statsEl = document.getElementById("vfx-stats");
const btnPlay = document.getElementById("btn-play");
const btnBurst = document.getElementById("btn-burst");
const btnClear = document.getElementById("btn-clear");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/**
 * @typedef {{ x: number, y: number, vx: number, vy: number, life: number, maxLife: number, r: number, color: string }} Particle
 */

/** @type {Particle[]} */
let particles = [];
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
let emitAcc = 0;
let spawned = 0;
let culled = 0;
let rng = mulberry32(42);
const origin = { x: 0, y: 0 };

/**
 * @param {number} x
 * @param {number} y
 * @param {number} n
 * @param {number} life
 * @param {() => number} r
 * @param {number} max
 * @param {Particle[]} pool
 */
export function burst(x, y, n, life, r, max, pool) {
  let added = 0;
  for (let i = 0; i < n; i++) {
    if (pool.length >= max) {
      culled += 1;
      break;
    }
    const ang = r() * Math.PI * 2;
    const sp = 60 + r() * 220;
    pool.push({
      x,
      y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp - 40,
      life,
      maxLife: life,
      r: 2 + r() * 3,
      color: r() > 0.5 ? "#f2cc8f" : "#e07a5f",
    });
    added += 1;
    spawned += 1;
  }
  return added;
}

/**
 * Integrate particles; remove dead.
 */
export function stepParticles(pool, dt, gravity) {
  for (const p of pool) {
    p.vy += gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  let w = 0;
  for (let i = 0; i < pool.length; i++) {
    if (pool[i].life > 0) pool[w++] = pool[i];
  }
  pool.length = w;
}

function readMax() {
  return Math.floor(Number(maxEl?.value) || C.defaultMax);
}
function readLife() {
  return Number(lifeEl?.value) || C.defaultLife;
}
function readGrav() {
  return Number(gravEl?.value) || C.defaultGravity;
}

function sync() {
  if (maxVal) maxVal.textContent = String(readMax());
  if (lifeVal) lifeVal.textContent = readLife().toFixed(2);
  if (gravVal) gravVal.textContent = String(Math.floor(readGrav()));
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);
  // emitter
  ctx.strokeStyle = "rgba(91,159,212,0.5)";
  ctx.beginPath();
  ctx.arc(origin.x, origin.y, 10, 0, Math.PI * 2);
  ctx.stroke();
  for (const p of particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>生存</td><td>${particles.length} / ${readMax()}</td></tr>
        <tr><td>生成累計</td><td>${spawned}</td></tr>
        <tr><td>上限で破棄</td><td>${culled}</td></tr>
      </table>`;
  }
}

function step(dt) {
  if (emitEl?.checked) {
    emitAcc += dt;
    const interval = 1 / C.emitRate;
    while (emitAcc >= interval) {
      emitAcc -= interval;
      burst(origin.x, origin.y, 1, readLife(), rng, readMax(), particles);
    }
  }
  stepParticles(particles, dt, readGrav());
  draw();
  setStatus(`particles=${particles.length}`);
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

function doBurst(x, y) {
  origin.x = x;
  origin.y = y;
  const n = burst(x, y, C.burstCount, readLife(), rng, readMax(), particles);
  setStatus(`burst +${n}`);
  draw();
}

canvas.addEventListener("pointerdown", (e) => {
  const r = canvas.getBoundingClientRect();
  const x = ((e.clientX - r.left) * canvas.width) / r.width;
  const y = ((e.clientY - r.top) * canvas.height) / r.height;
  doBurst(x, y);
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
btnBurst?.addEventListener("click", () => {
  doBurst(canvas.width / 2, canvas.height * 0.45);
  if (!running) {
    running = true;
    lastTs = 0;
    if (btnPlay) btnPlay.textContent = "一時停止";
    rafId = requestAnimationFrame(loop);
  }
});
btnClear?.addEventListener("click", () => {
  particles = [];
  draw();
  setStatus("クリア");
});
for (const el of [maxEl, lifeEl, gravEl]) {
  el?.addEventListener("input", sync);
}

loadTextSample(
  "../samples/GfxAnimationVfxExample.cs",
  csharpSample,
  "// GfxAnimationVfxExample.cs"
);
origin.x = canvas.width / 2;
origin.y = canvas.height * 0.45;
if (maxEl) maxEl.value = String(C.defaultMax);
if (lifeEl) lifeEl.value = String(C.defaultLife);
if (gravEl) gravEl.value = String(C.defaultGravity);
sync();
draw();
setStatus("クリックでバースト · 再生で更新");
