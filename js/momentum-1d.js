/**
 * 質量と運動量（1D）
 * @see docs/topics/momentum-1d/SPEC.md
 */
import { MOMENTUM_1D_CONFIG as C } from "./maps/momentum-1d-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("m1-canvas")
);
const ctx = canvas.getContext("2d");
const modeEl = /** @type {HTMLSelectElement} */ (
  document.getElementById("mode")
);
const mAEl = /** @type {HTMLInputElement} */ (document.getElementById("m-a"));
const mBEl = /** @type {HTMLInputElement} */ (document.getElementById("m-b"));
const vAEl = /** @type {HTMLInputElement} */ (document.getElementById("v-a"));
const vBEl = /** @type {HTMLInputElement} */ (document.getElementById("v-b"));
const mAVal = document.getElementById("m-a-val");
const mBVal = document.getElementById("m-b-val");
const vAVal = document.getElementById("v-a-val");
const vBVal = document.getElementById("v-b-val");
const statsEl = document.getElementById("m1-stats");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

let x1 = C.ballA.x;
let x2 = C.ballB.x;
let v1 = C.ballA.v;
let v2 = C.ballB.v;
let m1 = C.ballA.m;
let m2 = C.ballB.m;
let collided = false;
let pBefore = 0;
let keBefore = 0;
let pAfter = 0;
let keAfter = 0;
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;

/**
 * @param {number} m1
 * @param {number} v1
 * @param {number} m2
 * @param {number} v2
 */
export function elastic1d(m1, v1, m2, v2) {
  const s = m1 + m2;
  return {
    u1: ((m1 - m2) / s) * v1 + ((2 * m2) / s) * v2,
    u2: ((2 * m1) / s) * v1 + ((m2 - m1) / s) * v2,
  };
}

/**
 * @param {number} m1
 * @param {number} v1
 * @param {number} m2
 * @param {number} v2
 */
export function inelastic1d(m1, v1, m2, v2) {
  const u = (m1 * v1 + m2 * v2) / (m1 + m2);
  return { u1: u, u2: u };
}

function r1() {
  return 18 + m1 * 5;
}
function r2() {
  return 18 + m2 * 5;
}

function syncLabels() {
  m1 = Math.max(0.5, Number(mAEl?.value) || C.ballA.m);
  m2 = Math.max(0.5, Number(mBEl?.value) || C.ballB.m);
  if (!running && !collided) {
    v1 = Number(vAEl?.value) || 0;
    v2 = Number(vBEl?.value) || 0;
  }
  if (mAVal) mAVal.textContent = m1.toFixed(1);
  if (mBVal) mBVal.textContent = m2.toFixed(1);
  if (vAVal) vAVal.textContent = String(Number(vAEl?.value) || 0);
  if (vBVal) vBVal.textContent = String(Number(vBEl?.value) || 0);
}

function momentum() {
  return m1 * v1 + m2 * v2;
}
function ke() {
  return 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;
}

function tryCollide() {
  if (collided) return;
  if (x1 + r1() < x2 - r2()) return;
  // overlap or touch while approaching
  if (v1 - v2 <= 0 && x1 + r1() < x2 - r2() + 1) return;
  pBefore = momentum();
  keBefore = ke();
  const mode = modeEl?.value || "elastic";
  const res =
    mode === "inelastic" ? inelastic1d(m1, v1, m2, v2) : elastic1d(m1, v1, m2, v2);
  v1 = res.u1;
  v2 = res.u2;
  // separate slightly
  const mid = (x1 + r1() + (x2 - r2())) / 2;
  x1 = mid - r1() - 0.5;
  x2 = mid + r2() + 0.5;
  collided = true;
  pAfter = momentum();
  keAfter = ke();
  setStatus(
    mode === "inelastic"
      ? "完全非弾性衝突 — 一体速度"
      : "弾性衝突 — 運動量・KE 保存（数値誤差あり）"
  );
}

function step(dt) {
  x1 += v1 * dt;
  x2 += v2 * dt;
  // walls
  if (x1 - r1() < 20) {
    x1 = 20 + r1();
    v1 = Math.abs(v1);
  }
  if (x2 + r2() > canvas.width - 20) {
    x2 = canvas.width - 20 - r2();
    v2 = -Math.abs(v2);
  }
  tryCollide();
  draw();
  renderStats();
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const cy = C.floorY;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#3d4f66";
  ctx.beginPath();
  ctx.moveTo(20, cy + 40);
  ctx.lineTo(W - 20, cy + 40);
  ctx.stroke();

  // velocity arrows
  const drawBall = (x, r, v, color, label) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f2cc8f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, cy);
    ctx.lineTo(x + v * 0.25, cy);
    ctx.stroke();
    ctx.fillStyle = "#e8eef7";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(label, x - 6, cy + 5);
  };
  drawBall(x1, r1(), v1, "#5b9fd4", "A");
  drawBall(x2, r2(), v2, "#e07a5f", "B");

  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("矢印 = 速度 · 半径 ≈ 質量", 12, 18);
}

function renderStats() {
  const p = momentum();
  const k = ke();
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>mA / mB</td><td>${m1.toFixed(1)} / ${m2.toFixed(1)}</td></tr>
        <tr><td>vA / vB</td><td>${v1.toFixed(1)} / ${v2.toFixed(1)}</td></tr>
        <tr><td>Σp = m·v</td><td>${p.toFixed(1)}${collided ? ` (前 ${pBefore.toFixed(1)})` : ""}</td></tr>
        <tr><td>ΣKE</td><td>${k.toFixed(0)}${collided ? ` (前 ${keBefore.toFixed(0)})` : ""}</td></tr>
        <tr><td>衝突</td><td>${collided ? "済" : "未"}</td></tr>
      </table>`;
  }
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
  syncLabels();
  x1 = C.ballA.x;
  x2 = C.ballB.x;
  v1 = Number(vAEl?.value) || C.ballA.v;
  v2 = Number(vBEl?.value) || C.ballB.v;
  collided = false;
  pBefore = pAfter = keBefore = keAfter = 0;
  draw();
  renderStats();
  setStatus("リセット — 再生で接近・衝突");
}

btnPlay?.addEventListener("click", () => {
  if (running) {
    stop();
    return;
  }
  if (collided) reset();
  running = true;
  lastTs = 0;
  if (btnPlay) btnPlay.textContent = "一時停止";
  rafId = requestAnimationFrame(loop);
});
btnReset?.addEventListener("click", reset);
for (const el of [mAEl, mBEl, vAEl, vBEl, modeEl]) {
  el?.addEventListener("input", () => {
    if (!running) {
      syncLabels();
      if (!collided) {
        v1 = Number(vAEl?.value) || 0;
        v2 = Number(vBEl?.value) || 0;
      }
      draw();
      renderStats();
    } else {
      syncLabels();
    }
  });
}

loadTextSample(
  "../samples/Momentum1dExample.cs",
  csharpSample,
  "// Momentum1dExample.cs"
);
if (mAEl) mAEl.value = String(C.ballA.m);
if (mBEl) mBEl.value = String(C.ballB.m);
if (vAEl) vAEl.value = String(C.ballA.v);
if (vBEl) vBEl.value = String(C.ballB.v);
reset();
