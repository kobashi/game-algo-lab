/**
 * サーバ権威チート対策 — 速度 + スコア検証
 */
import { NET_ANTI_CHEAT_CONFIG as C } from "./maps/net-anti-cheat-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("ac-canvas")
);
const ctx = canvas.getContext("2d");
const latEl = /** @type {HTMLInputElement} */ (
  document.getElementById("latency")
);
const verifyEl = /** @type {HTMLInputElement} */ (
  document.getElementById("verify")
);
const cheatMoveEl = /** @type {HTMLInputElement} */ (
  document.getElementById("cheat-move")
);
const cheatScoreEl = /** @type {HTMLInputElement} */ (
  document.getElementById("cheat-score")
);
const latVal = document.getElementById("lat-val");
const statsEl = document.getElementById("ac-stats");
const logEl = document.getElementById("ac-log");
const btnPlay = document.getElementById("btn-play");
const btnHit = document.getElementById("btn-hit");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

let clientX = 120;
let serverX = 120;
let clientScore = 0;
let serverScore = 0;
let serverHits = 0;
let hitWindow = 0;
let clock = 0;
let rejectedMove = 0;
let rejectedScore = 0;
let accepted = 0;
/** @type {{ kind: string, deliverAt: number, x?: number, score?: number, hits?: number }[]} */
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
 * Validate movement claim.
 */
export function validateMove(serverPos, claimX, maxSpeed, dt) {
  const maxDx = maxSpeed * Math.max(dt, 1 / 60);
  if (Math.abs(claimX - serverPos) <= maxDx + 0.5) {
    return { ok: true, x: claimX };
  }
  const x = serverPos + Math.sign(claimX - serverPos) * maxDx;
  return { ok: false, x };
}

/**
 * Validate score report against server hit count.
 */
export function validateScore(reported, serverHits, pointsPerHit) {
  const expected = serverHits * pointsPerHit;
  return { ok: reported <= expected + 0.1, expected };
}

function readLat() {
  return Math.floor(Number(latEl?.value) || C.defaultLatencyMs);
}
function clientSpeed() {
  return cheatMoveEl?.checked ? C.maxSpeed * 3 : C.maxSpeed;
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
  const ready = queue.filter((p) => p.deliverAt <= clock);
  queue = queue.filter((p) => p.deliverAt > clock);
  for (const p of ready) {
    if (!verifyEl?.checked) {
      if (p.kind === "move" && p.x != null) serverX = p.x;
      if (p.kind === "score" && p.score != null) serverScore = p.score;
      accepted += 1;
      pushLog(`ACCEPT (検証OFF) ${p.kind}`);
      continue;
    }
    if (p.kind === "move" && p.x != null) {
      const r = validateMove(serverX, p.x, C.maxSpeed, 0.05);
      serverX = r.x;
      if (r.ok) {
        accepted += 1;
        pushLog(`MOVE OK x=${r.x.toFixed(0)}`);
      } else {
        rejectedMove += 1;
        clientX = serverX;
        pushLog(`MOVE REJECT → clamp ${r.x.toFixed(0)}`);
      }
    }
    if (p.kind === "score" && p.score != null) {
      const r = validateScore(p.score, serverHits, C.pointsPerHit);
      if (r.ok) {
        serverScore = p.score;
        accepted += 1;
        pushLog(`SCORE OK ${p.score}`);
      } else {
        rejectedScore += 1;
        clientScore = r.expected;
        serverScore = r.expected;
        pushLog(`SCORE REJECT claimed=${p.score} expected=${r.expected}`);
      }
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
  ctx.stroke();
  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("Client", 12, 24);
  ctx.fillText("Server 権威", 12, 114);

  ctx.fillStyle = "#5b9fd4";
  ctx.fillRect(clientX - 14, 60, 28, 28);
  ctx.fillStyle = "#e07a5f";
  ctx.fillRect(serverX - 14, 150, 28, 28);

  // target dummy
  ctx.fillStyle = "#f2cc8f";
  ctx.fillRect(W - 80, 100, 24, 24);
  ctx.fillStyle = "#9aabbf";
  ctx.fillText("的", W - 78, 95);

  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>Client score</td><td>${clientScore}</td></tr>
        <tr><td>Server score</td><td>${serverScore}</td></tr>
        <tr><td>Server hits</td><td>${serverHits}</td></tr>
        <tr><td>MOVE 拒否</td><td>${rejectedMove}</td></tr>
        <tr><td>SCORE 拒否</td><td>${rejectedScore}</td></tr>
        <tr><td>受理</td><td>${accepted}</td></tr>
        <tr><td>|Cx−Sx|</td><td>${Math.abs(clientX - serverX).toFixed(0)}</td></tr>
      </table>`;
  }
}

function step(dt) {
  hitWindow = Math.max(0, hitWindow - dt);
  let dx = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;
  if (dx) {
    clientX += dx * clientSpeed() * dt;
    clientX = Math.max(30, Math.min(canvas.width - 30, clientX));
    queue.push({
      kind: "move",
      x: clientX,
      deliverAt: clock + readLat() / 1000,
    });
  }
  clock += dt;
  deliver();
  if (latVal) latVal.textContent = String(readLat());
  draw();
  setStatus(
    `verify=${verifyEl?.checked ? "ON" : "OFF"} rejM=${rejectedMove} rejS=${rejectedScore}`
  );
}

function doHit() {
  // client-side hit
  if (hitWindow > 0 && !cheatScoreEl?.checked) {
    pushLog("連打制限（クライアント）");
    return;
  }
  hitWindow = 1 / C.maxHitsPerSec;
  const gain = cheatScoreEl?.checked
    ? C.pointsPerHit * 5
    : C.pointsPerHit;
  clientScore += gain;
  // server always counts real hit +1 (even if client inflates score)
  serverHits += 1;
  queue.push({
    kind: "score",
    score: clientScore,
    hits: 1,
    deliverAt: clock + readLat() / 1000,
  });
  pushLog(`HIT report score=${clientScore}${cheatScoreEl?.checked ? " (水増し)" : ""}`);
  draw();
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
  clientX = serverX = 120;
  clientScore = serverScore = 0;
  serverHits = 0;
  hitWindow = 0;
  clock = 0;
  rejectedMove = rejectedScore = accepted = 0;
  queue = [];
  logs = [];
  if (logEl) logEl.innerHTML = "";
  if (latEl) latEl.value = String(C.defaultLatencyMs);
  if (latVal) latVal.textContent = String(C.defaultLatencyMs);
  draw();
  setStatus("リセット — チート ON で検証を試す");
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
btnHit?.addEventListener("click", () => {
  if (!running) {
    running = true;
    lastTs = 0;
    if (btnPlay) btnPlay.textContent = "一時停止";
    rafId = requestAnimationFrame(loop);
  }
  doHit();
});
btnReset?.addEventListener("click", reset);
latEl?.addEventListener("input", () => {
  if (latVal) latVal.textContent = String(readLat());
});

loadTextSample(
  "../samples/NetAntiCheatExample.cs",
  csharpSample,
  "// NetAntiCheatExample.cs"
);
reset();
