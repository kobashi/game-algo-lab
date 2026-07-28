/**
 * クライアント予測 + 権威補正
 */
import { NET_PREDICTION_CONFIG as C } from "./maps/net-prediction-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("pred-canvas")
);
const ctx = canvas.getContext("2d");
const latEl = /** @type {HTMLInputElement} */ (
  document.getElementById("latency")
);
const latVal = document.getElementById("lat-val");
const predEl = /** @type {HTMLInputElement} */ (
  document.getElementById("use-pred")
);
const smoothEl = /** @type {HTMLInputElement} */ (
  document.getElementById("use-smooth")
);
const statsEl = document.getElementById("pred-stats");
const logEl = document.getElementById("pred-log");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** @typedef {{ seq: number, x: number, sentAt: number, deliverAt: number }} AuthPkt */

let predX = 120;
let displayX = 120;
let authX = 120;
let seq = 0;
/** @type {AuthPkt[]} */
let inflight = [];
/** input history for re-sim after correction */
/** @type {{ seq: number, dx: number, t: number }[]} */
let inputHist = [];
let clock = 0;
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
/** @type {Set<string>} */
const keys = new Set();
/** @type {string[]} */
let logs = [];
let lastSnap = 0;
function readLat() {
  return Math.floor(Number(latEl?.value) || C.defaultLatencyMs);
}

function pushLog(msg) {
  logs.unshift(msg);
  if (logs.length > 12) logs.pop();
  if (logEl) {
    logEl.innerHTML = logs
      .map((m) => `<div class="es-log es-log-sub">${m}</div>`)
      .join("");
  }
}

/**
 * Apply one input step.
 * @param {number} [maxX]
 */
export function applyInput(x, dx, speed, dt, maxX = 610) {
  return Math.max(30, Math.min(maxX, x + dx * speed * dt));
}

/**
 * After auth state for seq arrives, re-apply newer inputs.
 * @param {number} authPos
 * @param {number} authSeq
 * @param {{ seq: number, dx: number, t: number }[]} hist
 * @param {number} speed
 * @param {number} dtStep
 */
export function reconcile(authPos, authSeq, hist, speed, dtStep) {
  let x = authPos;
  for (const h of hist) {
    if (h.seq > authSeq) {
      x = applyInput(x, h.dx, speed, dtStep);
    }
  }
  return x;
}

function maxX() {
  return (canvas?.width || 640) - 30;
}

function deliverAuth() {
  inflight.sort((a, b) => a.deliverAt - b.deliverAt);
  const ready = inflight.filter((p) => p.deliverAt <= clock);
  inflight = inflight.filter((p) => p.deliverAt > clock);
  for (const p of ready) {
    authX = p.x;
    lastSnap = clock;
    if (predEl?.checked) {
      const recon = reconcile(authX, p.seq, inputHist, C.defaultSpeed, 0.05);
      predX = recon;
      if (!smoothEl?.checked) displayX = recon;
      pushLog(`AUTH #${p.seq} x=${authX.toFixed(0)} recon=${recon.toFixed(0)}`);
    } else {
      pushLog(`AUTH #${p.seq} x=${authX.toFixed(0)}`);
    }
  }
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(90,106,128,0.35)";
  ctx.beginPath();
  ctx.moveTo(0, 90);
  ctx.lineTo(W, 90);
  ctx.moveTo(0, 180);
  ctx.lineTo(W, 180);
  ctx.moveTo(0, 270);
  ctx.lineTo(W, 270);
  ctx.stroke();

  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("表示（予測/遅延）", 12, 24);
  ctx.fillText("権威（サーバ遅延後）", 12, 114);
  ctx.fillText("生遅延のみ（比較）", 12, 204);

  const showX = predEl?.checked ? displayX : authX;
  ctx.fillStyle = "#5b9fd4";
  ctx.fillRect(showX - 14, 55, 28, 28);
  ctx.fillStyle = "#e07a5f";
  ctx.fillRect(authX - 14, 145, 28, 28);
  // raw delayed ghost = auth already
  ctx.fillStyle = "rgba(242,204,143,0.7)";
  ctx.fillRect(authX - 14, 235, 28, 28);

  // inflight
  for (const p of inflight) {
    const t = Math.min(
      1,
      Math.max(0, (clock - p.sentAt) / Math.max(0.001, p.deliverAt - p.sentAt))
    );
    const x = 40 + t * (W - 80);
    ctx.fillStyle = "#f2cc8f";
    ctx.beginPath();
    ctx.arc(x, 160, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  if (statsEl) {
    const err = Math.abs(showX - authX);
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>表示 X</td><td>${showX.toFixed(0)}</td></tr>
        <tr><td>権威 X</td><td>${authX.toFixed(0)}</td></tr>
        <tr><td>|表示−権威|</td><td>${err.toFixed(0)}</td></tr>
        <tr><td>遅延</td><td>${readLat()} ms</td></tr>
        <tr><td>飛行中</td><td>${inflight.length}</td></tr>
        <tr><td>予測</td><td>${predEl?.checked ? "ON" : "OFF"}</td></tr>
      </table>`;
  }
}

function step(dt) {
  let dx = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;

  const mx = maxX();
  if (predEl?.checked) {
    if (dx) {
      predX = applyInput(predX, dx, C.defaultSpeed, dt, mx);
      const id = ++seq;
      inputHist.push({ seq: id, dx, t: clock });
      if (inputHist.length > 80) inputHist.shift();
      inflight.push({
        seq: id,
        x: predX,
        sentAt: clock,
        deliverAt: clock + readLat() / 1000,
      });
    }
    if (smoothEl?.checked) {
      displayX += (predX - displayX) * Math.min(1, C.snapBlend + dt * 8);
    } else {
      displayX = predX;
    }
  } else {
    if (dx) {
      const base = inflight.length ? inflight[inflight.length - 1].x : authX;
      const intended = applyInput(base, dx, C.defaultSpeed, dt, mx);
      const id = ++seq;
      inflight.push({
        seq: id,
        x: intended,
        sentAt: clock,
        deliverAt: clock + readLat() / 1000,
      });
    }
    displayX = authX;
  }

  deliverAuth();
  clock += dt;
  if (latVal) latVal.textContent = String(readLat());
  draw();
  setStatus(
    `pred=${predEl?.checked ? "on" : "off"} lat=${readLat()}ms |Δ|=${Math.abs(displayX - authX).toFixed(0)}`
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
  predX = displayX = authX = 120;
  seq = 0;
  inflight = [];
  inputHist = [];
  clock = 0;
  logs = [];
  if (logEl) logEl.innerHTML = "";
  if (latEl) latEl.value = String(C.defaultLatencyMs);
  if (latVal) latVal.textContent = String(C.defaultLatencyMs);
  draw();
  setStatus("リセット — 予測 ON で即応、OFF で遅延操作");
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
latEl?.addEventListener("input", () => {
  if (latVal) latVal.textContent = String(readLat());
});

loadTextSample(
  "../samples/NetPredictionExample.cs",
  csharpSample,
  "// NetPredictionExample.cs"
);
reset();
