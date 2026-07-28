/**
 * クライアント・サーバ権威（速度キャップ）
 */
import { NET_CLIENT_SERVER_CONFIG as C } from "./maps/net-client-server-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("cs-canvas")
);
const ctx = canvas.getContext("2d");
const latEl = /** @type {HTMLInputElement} */ (
  document.getElementById("latency")
);
const maxSpEl = /** @type {HTMLInputElement} */ (
  document.getElementById("max-speed")
);
const cheatEl = /** @type {HTMLInputElement} */ (
  document.getElementById("cheat")
);
const latVal = document.getElementById("lat-val");
const maxVal = document.getElementById("max-val");
const statsEl = document.getElementById("cs-stats");
const logEl = document.getElementById("cs-log");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** client predicted / claimed position */
let clientX = 120;
/** server authoritative */
let serverX = 120;
/** display of server on client after delay */
let serverViewX = 120;
let clock = 0;
let seq = 0;
/** @type {{ id: number, claimX: number, dt: number, sentAt: number, deliverAt: number }[]} */
let inflight = [];
/** @type {string[]} */
let logs = [];
let rejected = 0;
let accepted = 0;
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
/** @type {Set<string>} */
const keys = new Set();

/**
 * Server clamps displacement per tick.
 * @returns {{ x: number, accepted: boolean, clamped: boolean }}
 */
export function serverApply(serverPos, claimX, maxSpeed, dt) {
  const maxDx = maxSpeed * dt;
  const want = claimX - serverPos;
  if (Math.abs(want) <= maxDx + 1e-6) {
    return { x: claimX, accepted: true, clamped: false };
  }
  const clamped = serverPos + Math.sign(want) * maxDx;
  return { x: clamped, accepted: false, clamped: true };
}

function readLat() {
  return Math.floor(Number(latEl?.value) || C.defaultLatencyMs);
}
function readMaxSp() {
  return Math.floor(Number(maxSpEl?.value) || C.serverMaxSpeed);
}
function clientSpeed() {
  return cheatEl?.checked ? C.cheatSpeed : C.normalSpeed;
}

function pushLog(msg) {
  logs.unshift(msg);
  if (logs.length > 14) logs.pop();
  if (logEl) {
    logEl.innerHTML = logs
      .map((m) => `<div class="es-log es-log-sub">${m}</div>`)
      .join("");
  }
}

function deliver() {
  inflight.sort((a, b) => a.deliverAt - b.deliverAt);
  const ready = inflight.filter((p) => p.deliverAt <= clock);
  inflight = inflight.filter((p) => p.deliverAt > clock);
  for (const p of ready) {
    const r = serverApply(serverX, p.claimX, readMaxSp(), p.dt);
    serverX = r.x;
    serverViewX = r.x;
    if (r.clamped) {
      rejected += 1;
      // rubber-band client toward authority
      clientX = serverX;
      pushLog(`#${p.id} REJECT clamp → ${serverX.toFixed(0)}`);
    } else {
      accepted += 1;
      pushLog(`#${p.id} OK x=${serverX.toFixed(0)}`);
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
  ctx.moveTo(0, 100);
  ctx.lineTo(W, 100);
  ctx.moveTo(0, 200);
  ctx.lineTo(W, 200);
  ctx.stroke();
  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("Client（主張・表示）", 12, 28);
  ctx.fillText("Server 権威", 12, 128);

  ctx.fillStyle = "#5b9fd4";
  ctx.fillRect(clientX - 14, 70, 28, 28);
  ctx.fillStyle = "#e07a5f";
  ctx.fillRect(serverViewX - 14, 170, 28, 28);

  for (const p of inflight) {
    const t = Math.min(
      1,
      Math.max(0, (clock - p.sentAt) / Math.max(0.001, p.deliverAt - p.sentAt))
    );
    ctx.fillStyle = "#f2cc8f";
    ctx.beginPath();
    ctx.arc(40 + t * (W - 80), 140, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>Client X</td><td>${clientX.toFixed(0)}</td></tr>
        <tr><td>Server X</td><td>${serverX.toFixed(0)}</td></tr>
        <tr><td>|C−S|</td><td>${Math.abs(clientX - serverX).toFixed(0)}</td></tr>
        <tr><td>受理 / 拒否</td><td>${accepted} / ${rejected}</td></tr>
        <tr><td>client speed</td><td>${clientSpeed()}</td></tr>
        <tr><td>server max</td><td>${readMaxSp()}</td></tr>
      </table>`;
  }
}

function step(dt) {
  let dx = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;
  if (dx) {
    clientX += dx * clientSpeed() * dt;
    clientX = Math.max(30, Math.min(canvas.width - 30, clientX));
    const id = ++seq;
    inflight.push({
      id,
      claimX: clientX,
      dt,
      sentAt: clock,
      deliverAt: clock + readLat() / 1000,
    });
  }
  // soft correct if far from last known server while idle
  if (!dx && Math.abs(clientX - serverX) > 2) {
    clientX += (serverX - clientX) * Math.min(1, dt * 6);
  }
  clock += dt;
  deliver();
  if (latVal) latVal.textContent = String(readLat());
  if (maxVal) maxVal.textContent = String(readMaxSp());
  draw();
  setStatus(
    `cheat=${cheatEl?.checked ? "ON" : "OFF"} |Δ|=${Math.abs(clientX - serverX).toFixed(0)}`
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
  clientX = serverX = serverViewX = 120;
  clock = 0;
  seq = 0;
  inflight = [];
  logs = [];
  rejected = accepted = 0;
  if (logEl) logEl.innerHTML = "";
  if (latEl) latEl.value = String(C.defaultLatencyMs);
  if (maxSpEl) maxSpEl.value = String(C.serverMaxSpeed);
  if (latVal) latVal.textContent = String(C.defaultLatencyMs);
  if (maxVal) maxVal.textContent = String(C.serverMaxSpeed);
  draw();
  setStatus("リセット — チート ON で速度超過を試す");
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
for (const el of [latEl, maxSpEl]) {
  el?.addEventListener("input", () => {
    if (latVal) latVal.textContent = String(readLat());
    if (maxVal) maxVal.textContent = String(readMaxSp());
  });
}

loadTextSample(
  "../samples/NetClientServerExample.cs",
  csharpSample,
  "// NetClientServerExample.cs"
);
reset();
