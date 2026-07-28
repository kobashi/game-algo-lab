/**
 * P2P 疑似ネットワーク — 遅延・欠落・順序
 */
import { NET_P2P_DEMO_CONFIG as C } from "./maps/net-p2p-demo-config.js";
import {
  createStatus,
  loadTextSample,
  mulberry32,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("net-canvas")
);
const ctx = canvas.getContext("2d");
const latEl = /** @type {HTMLInputElement} */ (
  document.getElementById("latency")
);
const dropEl = /** @type {HTMLInputElement} */ (
  document.getElementById("drop")
);
const jitEl = /** @type {HTMLInputElement} */ (
  document.getElementById("jitter")
);
const reoEl = /** @type {HTMLInputElement} */ (
  document.getElementById("reorder")
);
const latVal = document.getElementById("lat-val");
const dropVal = document.getElementById("drop-val");
const jitVal = document.getElementById("jit-val");
const reoVal = document.getElementById("reo-val");
const logEl = document.getElementById("net-log");
const statsEl = document.getElementById("net-stats");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const btnSend = document.getElementById("btn-send");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/**
 * @typedef {{ id: number, x: number, sentAt: number, deliverAt: number, dropped: boolean }} Packet
 */

let localX = 100;
let remoteX = 100;
let seq = 0;
/** @type {Packet[]} */
let inflight = [];
/** @type {string[]} */
let logs = [];
let sent = 0;
let delivered = 0;
let dropped = 0;
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
let clock = 0;
let rng = mulberry32(1);
/** @type {Set<string>} */
const keys = new Set();

function syncLabels() {
  if (latVal) latVal.textContent = String(readLat());
  if (dropVal) dropVal.textContent = Number(dropEl?.value || 0).toFixed(2);
  if (jitVal) jitVal.textContent = String(readJit());
  if (reoVal) reoVal.textContent = Number(reoEl?.value || 0).toFixed(2);
}
function readLat() {
  return Math.floor(Number(latEl?.value) || C.defaultLatencyMs);
}
function readDrop() {
  return Number(dropEl?.value) || 0;
}
function readJit() {
  return Math.floor(Number(jitEl?.value) || 0);
}
function readReo() {
  return Number(reoEl?.value) || 0;
}

function pushLog(msg) {
  logs.unshift(msg);
  if (logs.length > 18) logs.pop();
  if (logEl) {
    logEl.innerHTML = logs
      .map((m) => `<div class="es-log es-log-sub">${m}</div>`)
      .join("");
  }
}

/**
 * @param {number} x
 */
export function enqueueMove(x, now, latency, jitter, dropRate, reorderRate, r) {
  sent += 1;
  const id = ++seq;
  if (r() < dropRate) {
    dropped += 1;
    pushLog(`#${id} DROPPED x=${x.toFixed(0)}`);
    return null;
  }
  let delay = latency + (r() - 0.5) * 2 * jitter;
  if (r() < reorderRate) delay += 40 + r() * 80;
  delay = Math.max(0, delay);
  /** @type {Packet} */
  const p = {
    id,
    x,
    sentAt: now,
    deliverAt: now + delay / 1000,
    dropped: false,
  };
  inflight.push(p);
  pushLog(`#${id} send x=${x.toFixed(0)} delay=${delay.toFixed(0)}ms`);
  return p;
}

function deliverReady(now) {
  inflight.sort((a, b) => a.deliverAt - b.deliverAt);
  const ready = inflight.filter((p) => p.deliverAt <= now);
  inflight = inflight.filter((p) => p.deliverAt > now);
  for (const p of ready) {
    remoteX = p.x;
    delivered += 1;
    pushLog(`#${p.id} DELIVER x=${p.x.toFixed(0)}`);
  }
}

function step(dt) {
  clock += dt;
  let dx = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;
  if (dx) {
    localX += dx * 180 * dt;
    localX = Math.max(30, Math.min(canvas.width - 30, localX));
  }
  // auto-send state at ~10 Hz when moving or always trickle
  step.acc = (step.acc || 0) + dt;
  if (step.acc >= 0.1) {
    step.acc = 0;
    enqueueMove(
      localX,
      clock,
      readLat(),
      readJit(),
      readDrop(),
      readReo(),
      rng
    );
  }
  deliverReady(clock);
  draw();
  renderStats();
}
/** @type {number} */
step.acc = 0;

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);
  // lanes
  ctx.strokeStyle = "rgba(90,106,128,0.4)";
  ctx.beginPath();
  ctx.moveTo(0, 100);
  ctx.lineTo(W, 100);
  ctx.moveTo(0, 220);
  ctx.lineTo(W, 220);
  ctx.stroke();
  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("Local (あなた)", 12, 24);
  ctx.fillText("Remote (相手の見える位置)", 12, 144);

  ctx.fillStyle = "#5b9fd4";
  ctx.fillRect(localX - 14, 70, 28, 28);
  ctx.fillStyle = "#e07a5f";
  ctx.fillRect(remoteX - 14, 190, 28, 28);

  // packets in flight as dots on mid band
  for (const p of inflight) {
    const t = Math.min(
      1,
      Math.max(0, (clock - p.sentAt) / Math.max(0.001, p.deliverAt - p.sentAt))
    );
    const x = 40 + t * (W - 80);
    ctx.fillStyle = "#f2cc8f";
    ctx.beginPath();
    ctx.arc(x, 145, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderStats() {
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>送信</td><td>${sent}</td></tr>
        <tr><td>到着</td><td>${delivered}</td></tr>
        <tr><td>欠落</td><td>${dropped}</td></tr>
        <tr><td>飛行中</td><td>${inflight.length}</td></tr>
        <tr><td>|local−remote|</td><td>${Math.abs(localX - remoteX).toFixed(0)}</td></tr>
      </table>`;
  }
  setStatus(
    `lat=${readLat()}ms drop=${readDrop().toFixed(2)} inflight=${inflight.length}`
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
  localX = 100;
  remoteX = 100;
  seq = 0;
  inflight = [];
  logs = [];
  sent = delivered = dropped = 0;
  clock = 0;
  step.acc = 0;
  rng = mulberry32(3);
  syncLabels();
  draw();
  renderStats();
  if (logEl) logEl.innerHTML = "";
  setStatus("リセット — ←→ で移動、遅延を上げると Remote が遅れる");
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
btnSend?.addEventListener("click", () => {
  enqueueMove(
    localX,
    clock,
    readLat(),
    readJit(),
    readDrop(),
    readReo(),
    rng
  );
  deliverReady(clock);
  draw();
  renderStats();
});
for (const el of [latEl, dropEl, jitEl, reoEl]) {
  el?.addEventListener("input", () => {
    syncLabels();
    renderStats();
  });
}

loadTextSample(
  "../samples/NetP2pDemoExample.cs",
  csharpSample,
  "// NetP2pDemoExample.cs"
);
if (latEl) latEl.value = String(C.defaultLatencyMs);
if (dropEl) dropEl.value = String(C.defaultDrop);
if (jitEl) jitEl.value = String(C.defaultJitterMs);
if (reoEl) reoEl.value = String(C.defaultReorder);
reset();
