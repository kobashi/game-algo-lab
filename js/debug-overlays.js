/**
 * デバッグ可視化オーバーレイ
 * @see docs/topics/debug-overlays/SPEC.md
 */
import { DEBUG_OVERLAYS_CONFIG as C } from "./maps/debug-overlays-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("do-canvas")
);
const ctx = canvas.getContext("2d");
const showCol = /** @type {HTMLInputElement} */ (
  document.getElementById("ov-col")
);
const showVel = /** @type {HTMLInputElement} */ (
  document.getElementById("ov-vel")
);
const showAi = /** @type {HTMLInputElement} */ (
  document.getElementById("ov-ai")
);
const showGrid = /** @type {HTMLInputElement} */ (
  document.getElementById("ov-grid")
);
const statsEl = document.getElementById("do-stats");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

let player = {
  x: C.player.x,
  y: C.player.y,
  w: C.player.w,
  h: C.player.h,
  vx: 40,
  vy: 0,
};
let enemy = {
  x: C.enemy.x,
  y: C.enemy.y,
  w: C.enemy.w,
  h: C.enemy.h,
  vx: -30,
  vy: 0,
  state: "Patrol",
};
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
let t = 0;

function step(dt) {
  t += dt;
  player.x += player.vx * dt;
  if (player.x < 40 || player.x > 280) player.vx *= -1;
  // enemy seeks player simply
  const dx = player.x - enemy.x;
  if (Math.abs(dx) > 80) {
    enemy.state = "Chase";
    enemy.vx = Math.sign(dx) * 70;
  } else if (Math.abs(dx) < 40) {
    enemy.state = "Idle";
    enemy.vx = 0;
  } else {
    enemy.state = "Patrol";
    enemy.vx = Math.sin(t) * 40;
  }
  enemy.x += enemy.vx * dt;
  if (enemy.x < 300) enemy.x = 300;
  if (enemy.x > 560) enemy.x = 560;
  draw();
  renderStats();
}

function drawGame() {
  if (!ctx) return;
  // ground
  ctx.fillStyle = "#1a2332";
  ctx.fillRect(0, 256, canvas.width, canvas.height - 256);
  // obstacles (game art simplified)
  ctx.fillStyle = "#4a5d73";
  for (const o of C.obstacles) {
    ctx.fillRect(o.x, o.y, o.w, o.h);
  }
  // sprites
  ctx.fillStyle = "#5b9fd4";
  ctx.fillRect(player.x, player.y, player.w, player.h);
  ctx.fillStyle = "#e07a5f";
  ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
}

function drawOverlays() {
  if (!ctx) return;
  if (showGrid?.checked) {
    ctx.strokeStyle = "rgba(154, 171, 191, 0.15)";
    for (let x = 0; x < canvas.width; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }
  if (showCol?.checked) {
    ctx.strokeStyle = "#6bcb8f";
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x, player.y, player.w, player.h);
    ctx.strokeRect(enemy.x, enemy.y, enemy.w, enemy.h);
    for (const o of C.obstacles) {
      ctx.strokeStyle = "#f2cc8f";
      ctx.strokeRect(o.x, o.y, o.w, o.h);
    }
  }
  if (showVel?.checked) {
    ctx.strokeStyle = "#5b9fd4";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.x + player.w / 2, player.y + player.h / 2);
    ctx.lineTo(
      player.x + player.w / 2 + player.vx * 0.4,
      player.y + player.h / 2 + player.vy * 0.4
    );
    ctx.stroke();
    ctx.strokeStyle = "#e07a5f";
    ctx.beginPath();
    ctx.moveTo(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
    ctx.lineTo(
      enemy.x + enemy.w / 2 + enemy.vx * 0.4,
      enemy.y + enemy.h / 2
    );
    ctx.stroke();
  }
  if (showAi?.checked) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(enemy.x - 4, enemy.y - 22, 70, 16);
    ctx.fillStyle = "#f2cc8f";
    ctx.font = "11px monospace";
    ctx.fillText(enemy.state, enemy.x, enemy.y - 10);
  }
}

function draw() {
  if (!ctx) return;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGame();
  drawOverlays();
  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("本番描画の上に Debug レイヤを重ねる", 12, 18);
}

function renderStats() {
  const on = [
    showCol?.checked && "Collider",
    showVel?.checked && "Velocity",
    showAi?.checked && "AI",
    showGrid?.checked && "Grid",
  ].filter(Boolean);
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>ON</td><td>${on.join(", ") || "（なし）"}</td></tr>
        <tr><td>敵 AI</td><td>${enemy.state}</td></tr>
      </table>`;
  }
  setStatus(`overlays: ${on.length}`);
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
  player = { x: C.player.x, y: C.player.y, w: C.player.w, h: C.player.h, vx: 40, vy: 0 };
  enemy = {
    x: C.enemy.x,
    y: C.enemy.y,
    w: C.enemy.w,
    h: C.enemy.h,
    vx: -30,
    vy: 0,
    state: "Patrol",
  };
  t = 0;
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
for (const el of [showCol, showVel, showAi, showGrid]) {
  el?.addEventListener("change", () => {
    draw();
    renderStats();
  });
}

loadTextSample(
  "../samples/DebugOverlaysExample.cs",
  csharpSample,
  "// DebugOverlaysExample.cs"
);
reset();
