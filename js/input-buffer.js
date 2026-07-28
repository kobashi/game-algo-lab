/**
 * 入力バッファ — 着地前ジャンプの先読み
 * @see docs/topics/input-buffer/SPEC.md
 */
import { INPUT_BUFFER_CONFIG as C } from "./maps/input-buffer-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("ibuf-canvas")
);
const ctx = canvas.getContext("2d");
const bufOnEl = /** @type {HTMLInputElement} */ (
  document.getElementById("buffer-on")
);
const bufMsEl = /** @type {HTMLInputElement} */ (
  document.getElementById("buffer-ms")
);
const bufMsVal = document.getElementById("buffer-ms-val");
const statsEl = document.getElementById("ibuf-stats");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** @type {Set<string>} */
const keys = new Set();
let px = 80;
let py = C.groundY - C.playerH;
let vx = 0;
let vy = 0;
let grounded = true;
let bufferLeft = 0;
let jumpFromBuffer = 0;
let jumpDirect = 0;
let jumpWasted = 0;
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
let jumpEdge = false;

function readBufSec() {
  const ms = Math.min(
    C.maxBufferMs,
    Math.max(C.minBufferMs, Number(bufMsEl?.value) || C.defaultBufferMs)
  );
  if (bufMsVal) bufMsVal.textContent = String(ms);
  return ms / 1000;
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function resolvePlatforms() {
  grounded = false;
  for (const p of C.platforms) {
    if (!rectsOverlap(px, py, C.playerW, C.playerH, p.x, p.y, p.w, p.h)) {
      continue;
    }
    if (vy >= 0 && py + C.playerH - 2 <= p.y + 6) {
      py = p.y - C.playerH;
      vy = 0;
      grounded = true;
    }
  }
  if (py + C.playerH > canvas.height) {
    py = canvas.height - C.playerH;
    vy = 0;
    grounded = true;
  }
  if (px < 0) px = 0;
  if (px + C.playerW > canvas.width) px = canvas.width - C.playerW;
}

function doJump(fromBuffer) {
  vy = C.jumpVy;
  grounded = false;
  bufferLeft = 0;
  if (fromBuffer) jumpFromBuffer += 1;
  else jumpDirect += 1;
  setStatus(fromBuffer ? "バッファ消費でジャンプ" : "接地ジャンプ");
}

function onJumpPressed() {
  if (grounded) {
    doJump(false);
    return;
  }
  if (bufOnEl?.checked) {
    bufferLeft = readBufSec();
    setStatus(`空中ジャンプ入力 → バッファ ${(bufferLeft * 1000).toFixed(0)} ms`);
  } else {
    jumpWasted += 1;
    setStatus("空中ジャンプ入力（バッファ OFF → 破棄）");
  }
}

function step(dt) {
  vx = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) vx -= C.moveSpeed;
  if (keys.has("ArrowRight") || keys.has("KeyD")) vx += C.moveSpeed;

  if (jumpEdge) {
    onJumpPressed();
    jumpEdge = false;
  }

  vy += C.gravity * dt;
  px += vx * dt;
  py += vy * dt;
  const wasAir = !grounded;
  resolvePlatforms();

  if (bufferLeft > 0) bufferLeft = Math.max(0, bufferLeft - dt);
  // land while buffer active
  if (grounded && wasAir && bufferLeft > 0 && bufOnEl?.checked) {
    doJump(true);
  }

  draw();
  renderStats();
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  if (bufferLeft > 0 && bufOnEl?.checked) {
    ctx.fillStyle = "rgba(224, 122, 95, 0.2)";
    ctx.fillRect(px - 8, py - 8, C.playerW + 16, C.playerH + 16);
  }

  ctx.fillStyle = "#3d4f66";
  for (const p of C.platforms) ctx.fillRect(p.x, p.y, p.w, p.h);

  ctx.fillStyle = grounded ? "#6bcb8f" : "#5b9fd4";
  ctx.fillRect(px, py, C.playerW, C.playerH);

  const maxB = readBufSec() || 0.001;
  const ratio = Math.min(1, bufferLeft / maxB);
  ctx.fillStyle = "#1a2230";
  ctx.fillRect(12, 12, 160, 12);
  ctx.fillStyle = ratio > 0 ? "#e07a5f" : "#5a6a80";
  ctx.fillRect(12, 12, 160 * ratio, 12);
  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText(
    `buffer ${(bufferLeft * 1000).toFixed(0)} ms ${bufOnEl?.checked ? "ON" : "OFF"}`,
    12,
    40
  );
  ctx.fillText("空中で Space → 着地直後にジャンプ", 12, H - 12);
}

function renderStats() {
  if (!statsEl) return;
  statsEl.innerHTML = `
    <table class="coord-table">
      <tr><td>接地</td><td>${grounded ? "yes" : "no"}</td></tr>
      <tr><td>バッファ残</td><td>${(bufferLeft * 1000).toFixed(0)} ms</td></tr>
      <tr><td>直接ジャンプ</td><td>${jumpDirect}</td></tr>
      <tr><td>バッファ消費</td><td>${jumpFromBuffer}</td></tr>
      <tr><td>破棄（OFF時）</td><td>${jumpWasted}</td></tr>
    </table>`;
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
  px = 80;
  py = C.groundY - C.playerH;
  vx = 0;
  vy = 0;
  grounded = true;
  bufferLeft = 0;
  jumpFromBuffer = 0;
  jumpDirect = 0;
  jumpWasted = 0;
  jumpEdge = false;
  draw();
  renderStats();
  setStatus("リセット — ジャンプ中に Space を先押しして着地を待つ");
}

window.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "Space", "KeyA", "KeyD"].includes(e.code)) {
    e.preventDefault();
  }
  if (!keys.has(e.code) && e.code === "Space") jumpEdge = true;
  keys.add(e.code);
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
bufMsEl?.addEventListener("input", () => readBufSec());

loadTextSample(
  "../samples/InputBufferExample.cs",
  csharpSample,
  "// InputBufferExample.cs"
);
reset();
