/**
 * 状態同期 vs 入力同期
 */
import { NET_SYNC_MODES_CONFIG as C } from "./maps/net-sync-modes-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("sync-canvas")
);
const ctx = canvas.getContext("2d");
const modeEl = /** @type {HTMLSelectElement} */ (
  document.getElementById("mode")
);
const latEl = /** @type {HTMLInputElement} */ (
  document.getElementById("latency")
);
const hzEl = /** @type {HTMLInputElement} */ (document.getElementById("hz"));
const latVal = document.getElementById("lat-val");
const hzVal = document.getElementById("hz-val");
const statsEl = document.getElementById("sync-stats");
const logEl = document.getElementById("sync-log");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** host (A) true position */
let hostX = 120;
/** remote peer display */
let peerX = 120;
/** for input sync: peer simulates with delayed inputs */
let peerSimX = 120;
let clock = 0;
let sendAcc = 0;
let seq = 0;
let bytes = 0;
/** @type {{ t: number, kind: string, payload: string, deliverAt: number, x?: number, dx?: number }[]} */
let queue = [];
/** @type {string[]} */
let logs = [];
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
/** @type {Set<string>} */
const keys = new Set();

/**
 * Estimate payload size (bytes teaching metric).
 */
export function packetSize(mode) {
  // state: float x (~4) + seq; input: dx int + seq
  return mode === "state" ? 12 : 6;
}

function readLat() {
  return Math.floor(Number(latEl?.value) || C.defaultLatencyMs);
}
function readHz() {
  return Math.floor(Number(hzEl?.value) || C.defaultHz);
}
function mode() {
  return modeEl?.value || "state";
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

function enqueue(kind, payload, extra = {}) {
  seq += 1;
  const size = packetSize(mode());
  bytes += size;
  queue.push({
    t: clock,
    kind,
    payload,
    deliverAt: clock + readLat() / 1000,
    ...extra,
  });
  pushLog(`send ${kind} ${payload} (${size}B)`);
}

function deliver() {
  queue.sort((a, b) => a.deliverAt - b.deliverAt);
  const ready = queue.filter((p) => p.deliverAt <= clock);
  queue = queue.filter((p) => p.deliverAt > clock);
  for (const p of ready) {
    if (p.kind === "state" && p.x != null) {
      peerX = p.x;
      pushLog(`recv state x=${p.x.toFixed(0)}`);
    } else if (p.kind === "input" && p.dx != null) {
      // peer applies same input for fixed step approximation
      peerSimX += p.dx * C.speed * (1 / readHz());
      peerSimX = Math.max(30, Math.min(canvas.width - 30, peerSimX));
      peerX = peerSimX;
      pushLog(`recv input dx=${p.dx}`);
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
  ctx.fillText("Host (操作側・真値)", 12, 28);
  ctx.fillText("Peer (受信側表示)", 12, 128);

  ctx.fillStyle = "#5b9fd4";
  ctx.fillRect(hostX - 14, 70, 28, 28);
  ctx.fillStyle = "#e07a5f";
  ctx.fillRect(peerX - 14, 170, 28, 28);

  for (const p of queue) {
    const u = Math.min(
      1,
      Math.max(0, (clock - p.t) / Math.max(0.001, p.deliverAt - p.t))
    );
    ctx.fillStyle = p.kind === "state" ? "#f2cc8f" : "#6bcb8f";
    ctx.beginPath();
    ctx.arc(40 + u * (W - 80), 140, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  if (statsEl) {
    const err = Math.abs(hostX - peerX);
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>モード</td><td>${mode()}</td></tr>
        <tr><td>Host X</td><td>${hostX.toFixed(0)}</td></tr>
        <tr><td>Peer X</td><td>${peerX.toFixed(0)}</td></tr>
        <tr><td>|誤差|</td><td>${err.toFixed(0)}</td></tr>
        <tr><td>累計バイト</td><td>${bytes}</td></tr>
        <tr><td>パケットサイズ</td><td>${packetSize(mode())} B</td></tr>
        <tr><td>送信 Hz</td><td>${readHz()}</td></tr>
        <tr><td>飛行中</td><td>${queue.length}</td></tr>
      </table>`;
  }
}

function step(dt) {
  let dx = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;
  if (dx) {
    hostX += dx * C.speed * dt;
    hostX = Math.max(30, Math.min(canvas.width - 30, hostX));
  }

  sendAcc += dt;
  const interval = 1 / Math.max(1, readHz());
  while (sendAcc >= interval) {
    sendAcc -= interval;
    if (mode() === "state") {
      enqueue("state", `x=${hostX.toFixed(0)}`, { x: hostX });
    } else {
      // sample input at send rate
      enqueue("input", `dx=${dx}`, { dx });
    }
  }

  clock += dt;
  deliver();
  if (latVal) latVal.textContent = String(readLat());
  if (hzVal) hzVal.textContent = String(readHz());
  draw();
  setStatus(
    `${mode()} · err=${Math.abs(hostX - peerX).toFixed(0)} · ${bytes}B`
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
  hostX = peerX = peerSimX = 120;
  clock = 0;
  sendAcc = 0;
  seq = 0;
  bytes = 0;
  queue = [];
  logs = [];
  if (logEl) logEl.innerHTML = "";
  if (latEl) latEl.value = String(C.defaultLatencyMs);
  if (hzEl) hzEl.value = String(C.defaultHz);
  if (latVal) latVal.textContent = String(C.defaultLatencyMs);
  if (hzVal) hzVal.textContent = String(C.defaultHz);
  draw();
  setStatus("リセット — モードを切り替えて比較");
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
modeEl?.addEventListener("change", () => {
  peerSimX = hostX;
  peerX = hostX;
  queue = [];
  setStatus(`モード ${mode()}`);
  draw();
});
for (const el of [latEl, hzEl]) {
  el?.addEventListener("input", () => {
    if (latVal) latVal.textContent = String(readLat());
    if (hzVal) hzVal.textContent = String(readHz());
  });
}

loadTextSample(
  "../samples/NetSyncModesExample.cs",
  csharpSample,
  "// NetSyncModesExample.cs"
);
reset();
