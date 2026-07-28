/**
 * 衝突応答 — 分離 + 法線インパルス
 * @see docs/topics/collision-response/SPEC.md
 */
import { COLLISION_RESPONSE_CONFIG as C } from "./maps/collision-response-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("cr-canvas")
);
const ctx = canvas.getContext("2d");
const eEl = /** @type {HTMLInputElement} */ (
  document.getElementById("restitution")
);
const eVal = document.getElementById("e-val");
const statsEl = document.getElementById("cr-stats");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const btnNudge = document.getElementById("btn-nudge");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/**
 * @typedef {{ x: number, y: number, vx: number, vy: number, r: number, m: number }} Ball
 */

/** @type {Ball} */
let a = { ...C.ballA };
/** @type {Ball} */
let b = { ...C.ballB };
let resolveCount = 0;
let lastJ = 0;
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;

function readE() {
  const e = Number(eEl?.value) ?? C.defaultE;
  if (eVal) eVal.textContent = e.toFixed(2);
  return e;
}

/**
 * @param {Ball} b1
 * @param {Ball} b2
 * @param {number} e
 */
export function resolveCircles(b1, b2, e) {
  let dx = b2.x - b1.x;
  let dy = b2.y - b1.y;
  let dist = Math.hypot(dx, dy);
  if (dist < 1e-6) {
    dx = 1;
    dy = 0;
    dist = 1;
  }
  if (dist >= b1.r + b2.r) return { resolved: false, j: 0 };
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = b1.r + b2.r - dist;
  const inv1 = 1 / b1.m;
  const inv2 = 1 / b2.m;
  const invSum = inv1 + inv2;
  b1.x -= nx * overlap * (inv1 / invSum);
  b1.y -= ny * overlap * (inv1 / invSum);
  b2.x += nx * overlap * (inv2 / invSum);
  b2.y += ny * overlap * (inv2 / invSum);

  const rvx = b2.vx - b1.vx;
  const rvy = b2.vy - b1.vy;
  const velN = rvx * nx + rvy * ny;
  if (velN > 0) return { resolved: true, j: 0 };
  const j = (-(1 + e) * velN) / invSum;
  b1.vx -= j * nx * inv1;
  b1.vy -= j * ny * inv1;
  b2.vx += j * nx * inv2;
  b2.vy += j * ny * inv2;
  return { resolved: true, j };
}

function walls(ball) {
  const r = ball.r;
  if (ball.x < r) {
    ball.x = r;
    ball.vx = Math.abs(ball.vx);
  }
  if (ball.x > canvas.width - r) {
    ball.x = canvas.width - r;
    ball.vx = -Math.abs(ball.vx);
  }
  if (ball.y < r) {
    ball.y = r;
    ball.vy = Math.abs(ball.vy);
  }
  if (ball.y > canvas.height - r) {
    ball.y = canvas.height - r;
    ball.vy = -Math.abs(ball.vy);
  }
}

function step(dt) {
  a.x += a.vx * dt;
  a.y += a.vy * dt;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  walls(a);
  walls(b);
  const res = resolveCircles(a, b, readE());
  if (res.resolved && res.j > 0) {
    resolveCount += 1;
    lastJ = res.j;
    setStatus(`応答 #${resolveCount} · インパルス j=${res.j.toFixed(1)}`);
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

  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const overlap = a.r + b.r - dist;
  const hitting = overlap > 0;

  const drawBall = (ball, color, label) => {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = hitting ? "rgba(224,122,95,0.4)" : color;
    ctx.fill();
    ctx.strokeStyle = "#e8eef7";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = "#f2cc8f";
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(ball.x + ball.vx * 0.15, ball.y + ball.vy * 0.15);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText(label, ball.x - 5, ball.y + 5);
  };
  drawBall(a, "rgba(91,159,212,0.45)", "A");
  drawBall(b, "rgba(107,203,143,0.45)", "B");

  if (hitting && dist > 1e-6) {
    const nx = (b.x - a.x) / dist;
    const ny = (b.y - a.y) / dist;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    ctx.strokeStyle = "#e07a5f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(mx + nx * 50, my + ny * 50);
    ctx.stroke();
  }

  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("1. 分離（位置）  2. 法線インパルス（速度）", 12, 18);
}

function renderStats() {
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>距離 / 和半径</td><td>${dist.toFixed(1)} / ${(a.r + b.r).toFixed(1)}</td></tr>
        <tr><td>めり込み</td><td>${Math.max(0, a.r + b.r - dist).toFixed(1)}</td></tr>
        <tr><td>e</td><td>${readE().toFixed(2)}</td></tr>
        <tr><td>応答回数</td><td>${resolveCount}</td></tr>
        <tr><td>直近 j</td><td>${lastJ.toFixed(2)}</td></tr>
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
  a = { ...C.ballA };
  b = { ...C.ballB };
  resolveCount = 0;
  lastJ = 0;
  if (eEl) eEl.value = String(C.defaultE);
  readE();
  draw();
  renderStats();
  setStatus("リセット — 再生で衝突応答");
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
btnNudge?.addEventListener("click", () => {
  a.vx += 80;
  b.vx -= 40;
  setStatus("速度を加算");
});
eEl?.addEventListener("input", () => readE());

loadTextSample(
  "../samples/CollisionResponseExample.cs",
  csharpSample,
  "// CollisionResponseExample.cs"
);
reset();
