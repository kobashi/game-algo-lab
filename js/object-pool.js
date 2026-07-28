/**
 * オブジェクトプール — 弾の生成比較
 */
import { OBJECT_POOL_CONFIG as C } from "./maps/object-pool-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("op-canvas")
);
const ctx = canvas.getContext("2d");
const usePoolEl = /** @type {HTMLInputElement} */ (
  document.getElementById("use-pool")
);
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const statsEl = document.getElementById("op-stats");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/**
 * @typedef {{ x: number, y: number, vx: number, alive: boolean }} Bullet
 */

/** @type {Bullet[]} */
let active = [];
/** @type {Bullet[]} */
let pool = [];
let created = 0;
let reused = 0;
let released = 0;
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
let spawnAcc = 0;

function acquire() {
  if (usePoolEl?.checked && pool.length) {
    const b = /** @type {Bullet} */ (pool.pop());
    b.alive = true;
    reused += 1;
    return b;
  }
  created += 1;
  return { x: 40, y: canvas.height / 2, vx: 220, alive: true };
}

function release(b) {
  b.alive = false;
  released += 1;
  if (usePoolEl?.checked) pool.push(b);
}

function spawn() {
  if (active.filter((b) => b.alive).length >= C.maxActive) return;
  const b = acquire();
  b.x = 40;
  b.y = 40 + Math.random() * (canvas.height - 80);
  b.vx = 180 + Math.random() * 120;
  b.alive = true;
  if (!active.includes(b)) active.push(b);
}

function step(dt) {
  spawnAcc += dt * 1000;
  while (spawnAcc >= C.spawnIntervalMs) {
    spawnAcc -= C.spawnIntervalMs;
    spawn();
  }
  for (const b of active) {
    if (!b.alive) continue;
    b.x += b.vx * dt;
    if (b.x > canvas.width + 20) release(b);
  }
  // compact occasionally
  if (active.length > 80) active = active.filter((b) => b.alive || pool.includes(b));
  draw();
  renderStats();
}

function draw() {
  if (!ctx) return;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#6bcb8f";
  ctx.fillRect(20, canvas.height / 2 - 16, 24, 32);
  for (const b of active) {
    if (!b.alive) continue;
    ctx.fillStyle = "#f2cc8f";
    ctx.beginPath();
    ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderStats() {
  const alive = active.filter((b) => b.alive).length;
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>モード</td><td>${usePoolEl?.checked ? "プール ON" : "毎回 new"}</td></tr>
        <tr><td>生成 (created)</td><td>${created}</td></tr>
        <tr><td>再利用 (reused)</td><td>${reused}</td></tr>
        <tr><td>返却 (released)</td><td>${released}</td></tr>
        <tr><td>プール空き</td><td>${pool.length}</td></tr>
        <tr><td>アクティブ</td><td>${alive}</td></tr>
      </table>`;
  }
  setStatus(
    `alive=${alive} created=${created} reused=${reused} free=${pool.length}`
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
  active = [];
  pool = [];
  created = 0;
  reused = 0;
  released = 0;
  spawnAcc = 0;
  draw();
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
usePoolEl?.addEventListener("change", () => {
  // keep counts so student can compare after toggle+reset
  setStatus(usePoolEl.checked ? "プール ON（リセット推奨）" : "毎回 new");
});

loadTextSample(
  "../samples/ObjectPoolExample.cs",
  csharpSample,
  "// ObjectPoolExample.cs"
);
reset();
