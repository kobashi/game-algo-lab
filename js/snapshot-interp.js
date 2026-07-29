/**
 * スナップショット補間 — リモート描画を遅延バッファ + 線形補間
 */
import { SNAPSHOT_INTERP_CONFIG as C } from "./maps/snapshot-interp-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("si-canvas")
);
const ctx = canvas.getContext("2d");
const latEl = /** @type {HTMLInputElement} */ (document.getElementById("latency"));
const delayEl = /** @type {HTMLInputElement} */ (
  document.getElementById("interp-delay")
);
const intervalEl = /** @type {HTMLInputElement} */ (
  document.getElementById("snap-interval")
);
const useInterpEl = /** @type {HTMLInputElement} */ (
  document.getElementById("use-interp")
);
const latVal = document.getElementById("lat-val");
const delayVal = document.getElementById("delay-val");
const intVal = document.getElementById("int-val");
const statsEl = document.getElementById("si-stats");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/**
 * @typedef {{ t: number, x: number, y: number }} Snap
 */

/** authority (server) truth */
let auth = { x: 80, y: 150, vx: 1, vy: 0.4 };
/** packets in flight */
/** @type {{ deliverAt: number, snap: Snap }[]} */
let inflight = [];
/** received buffer (sorted by t) */
/** @type {Snap[]} */
let buffer = [];
let clock = 0;
let lastSend = 0;
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
let renderX = 80;
let renderY = 150;
let latestX = 80;
let latestY = 150;

function readLat() {
  return Math.floor(Number(latEl?.value) || C.defaultLatencyMs);
}
function readDelay() {
  return Math.floor(Number(delayEl?.value) || C.defaultInterpDelayMs);
}
function readInterval() {
  return Math.floor(Number(intervalEl?.value) || C.snapIntervalMs);
}

function syncLabels() {
  if (latVal) latVal.textContent = String(readLat());
  if (delayVal) delayVal.textContent = String(readDelay());
  if (intVal) intVal.textContent = String(readInterval());
}

/**
 * Linear interpolate position at renderTime from snapshot buffer.
 * @param {Snap[]} buf
 * @param {number} renderTime
 * @returns {{x:number,y:number, mode: string}}
 */
export function sampleBuffer(buf, renderTime) {
  if (buf.length === 0) return { x: 0, y: 0, mode: "empty" };
  if (buf.length === 1 || renderTime <= buf[0].t) {
    return { x: buf[0].x, y: buf[0].y, mode: "hold-first" };
  }
  const last = buf[buf.length - 1];
  if (renderTime >= last.t) {
    return { x: last.x, y: last.y, mode: "hold-last" };
  }
  let i = 0;
  while (i < buf.length - 1 && buf[i + 1].t < renderTime) i += 1;
  const a = buf[i];
  const b = buf[i + 1];
  const u = (renderTime - a.t) / (b.t - a.t + 1e-9);
  return {
    x: a.x + (b.x - a.x) * u,
    y: a.y + (b.y - a.y) * u,
    mode: "lerp",
  };
}

/**
 * @param {Snap[]} buf
 * @param {Snap} s
 * @param {number} maxKeep
 */
export function pushSnap(buf, s, maxKeep = 24) {
  buf.push(s);
  buf.sort((a, b) => a.t - b.t);
  while (buf.length > maxKeep) buf.shift();
}

function stepAuth(dt) {
  auth.x += auth.vx * C.authSpeed * dt;
  auth.y += auth.vy * C.authSpeed * dt;
  const m = 28;
  if (auth.x < m) {
    auth.x = m;
    auth.vx = Math.abs(auth.vx);
  }
  if (auth.x > canvas.width - m) {
    auth.x = canvas.width - m;
    auth.vx = -Math.abs(auth.vx);
  }
  if (auth.y < m) {
    auth.y = m;
    auth.vy = Math.abs(auth.vy);
  }
  if (auth.y > canvas.height - m) {
    auth.y = canvas.height - m;
    auth.vy = -Math.abs(auth.vy);
  }
}

function maybeSend() {
  const iv = readInterval() / 1000;
  if (clock - lastSend < iv) return;
  lastSend = clock;
  const snap = { t: clock, x: auth.x, y: auth.y };
  inflight.push({
    deliverAt: clock + readLat() / 1000,
    snap,
  });
}

function deliver() {
  const ready = inflight.filter((p) => p.deliverAt <= clock);
  inflight = inflight.filter((p) => p.deliverAt > clock);
  for (const p of ready) {
    pushSnap(buffer, p.snap);
    latestX = p.snap.x;
    latestY = p.snap.y;
  }
}

function updateRender() {
  if (!useInterpEl?.checked) {
    renderX = latestX;
    renderY = latestY;
    return "latest";
  }
  const renderTime = clock - readDelay() / 1000;
  const s = sampleBuffer(buffer, renderTime);
  renderX = s.x;
  renderY = s.y;
  return s.mode;
}

function tick(dt) {
  clock += dt;
  stepAuth(dt);
  maybeSend();
  deliver();
  const mode = updateRender();
  draw();
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>時刻</td><td>${clock.toFixed(2)}s</td></tr>
        <tr><td>バッファ枚数</td><td>${buffer.length}</td></tr>
        <tr><td>飛行中</td><td>${inflight.length}</td></tr>
        <tr><td>補間モード</td><td>${mode}</td></tr>
        <tr><td>描画遅延</td><td>${readDelay()} ms</td></tr>
      </table>`;
  }
  setStatus(
    useInterpEl?.checked
      ? `補間 ON · 描画は最新より ${readDelay()}ms 過去`
      : "補間 OFF · 受信最新をそのまま表示（ガタつき）"
  );
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  // authority path ghost
  ctx.fillStyle = "rgba(224, 122, 95, 0.35)";
  ctx.beginPath();
  ctx.arc(auth.x, auth.y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e07a5f";
  ctx.font = "11px sans-serif";
  ctx.fillText("AUTH", auth.x - 14, auth.y - 18);

  // latest received (no interp)
  ctx.strokeStyle = "rgba(91, 159, 212, 0.6)";
  ctx.beginPath();
  ctx.arc(latestX, latestY, 16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#5b9fd4";
  ctx.fillText("LATEST", latestX - 18, latestY - 20);

  // interpolated render
  ctx.fillStyle = "#6bcb8f";
  ctx.beginPath();
  ctx.arc(renderX, renderY, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8eef7";
  ctx.fillText("RENDER", renderX - 20, renderY - 18);

  // buffer timeline ticks
  const baseY = H - 28;
  ctx.fillStyle = "#3d4f66";
  ctx.fillRect(40, baseY, W - 80, 4);
  if (buffer.length) {
    const t0 = buffer[0].t;
    const t1 = buffer[buffer.length - 1].t || t0 + 0.001;
    for (const s of buffer) {
      const u = (s.t - t0) / (t1 - t0 + 1e-9);
      const px = 40 + u * (W - 80);
      ctx.fillStyle = "#f2cc8f";
      ctx.fillRect(px - 2, baseY - 6, 4, 16);
    }
    const rt = clock - readDelay() / 1000;
    const ru = Math.max(0, Math.min(1, (rt - t0) / (t1 - t0 + 1e-9)));
    ctx.fillStyle = "#6bcb8f";
    ctx.fillRect(40 + ru * (W - 80) - 2, baseY - 10, 4, 24);
  }
  ctx.fillStyle = "#9aabbf";
  ctx.font = "10px sans-serif";
  ctx.fillText("スナップショット時間軸（緑=描画時刻）", 40, baseY + 22);
}

function loop(ts) {
  if (!running) return;
  if (!lastTs) lastTs = ts;
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (dt > 0.05) dt = 0.05;
  tick(dt);
  rafId = requestAnimationFrame(loop);
}

function reset() {
  running = false;
  if (rafId != null) cancelAnimationFrame(rafId);
  if (btnPlay) btnPlay.textContent = "再生";
  auth = { x: 80, y: 150, vx: 1, vy: 0.4 };
  inflight = [];
  buffer = [];
  clock = 0;
  lastSend = 0;
  renderX = 80;
  renderY = 150;
  latestX = 80;
  latestY = 150;
  draw();
  syncLabels();
  setStatus("リセット");
}

latEl?.addEventListener("input", syncLabels);
delayEl?.addEventListener("input", syncLabels);
intervalEl?.addEventListener("input", syncLabels);

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
btnReset?.addEventListener("click", reset);

loadTextSample(
  "../samples/SnapshotInterpExample.cs",
  csharpSample,
  "// SnapshotInterpExample.cs"
);
syncLabels();
draw();
setStatus("再生 · 赤=権威 · 青枠=最新受信 · 緑=補間描画");
