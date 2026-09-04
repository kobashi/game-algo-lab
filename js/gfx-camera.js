/**
 * 2D フォローカメラ
 */
import { GFX_CAMERA_CONFIG as C } from "./maps/gfx-camera-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
  applyParamsToControls,
  mountShareLink,
  readSpeedScale,
  drawTrailDots,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("cam-canvas")
);
const ctx = canvas.getContext("2d");
const followEl = /** @type {HTMLInputElement} */ (
  document.getElementById("follow")
);
const deadEl = /** @type {HTMLInputElement} */ (
  document.getElementById("dead")
);
const followVal = document.getElementById("follow-val");
const deadVal = document.getElementById("dead-val");
const speedEl = /** @type {HTMLInputElement} */ (
  document.getElementById("speed")
);
const speedVal = document.getElementById("speed-val");
const loopEl = /** @type {HTMLInputElement} */ (document.getElementById("loop"));
const trailEl = /** @type {HTMLInputElement} */ (
  document.getElementById("trail")
);
const statsEl = document.getElementById("cam-stats");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

let playerX = 200;
let playerY = C.worldH * 0.55;
let camX = 0;
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
/** @type {Set<string>} */
const keys = new Set();
/** @type {{x:number,y:number}[]} */
let trail = [];

/**
 * World → screen: screen = world - cam
 * @returns {{ sx: number, sy: number }}
 */
export function worldToScreen(wx, wy, cam) {
  return { sx: wx - cam, sy: wy };
}

/**
 * Soft follow with dead zone on X.
 * @param {number} cam
 * @param {number} targetX player world x
 * @param {number} viewW
 * @param {number} dead
 * @param {number} follow 0..1 lerp factor
 */
export function updateCamera(cam, targetX, viewW, dead, follow) {
  const screenX = targetX - cam;
  const mid = viewW / 2;
  let desired = cam;
  if (screenX < mid - dead) {
    desired = targetX - (mid - dead);
  } else if (screenX > mid + dead) {
    desired = targetX - (mid + dead);
  }
  const next = cam + (desired - cam) * follow;
  const maxCam = Math.max(0, C.worldW - viewW);
  return Math.max(0, Math.min(maxCam, next));
}

function sync() {
  if (followVal) followVal.textContent = Number(followEl?.value || 0).toFixed(2);
  if (deadVal) deadVal.textContent = String(Math.floor(Number(deadEl?.value) || 0));
  if (speedVal) speedVal.textContent = readSpeedScale(speedEl).toFixed(1);
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  // parallax layers in screen space from world
  for (let i = 0; i < 12; i++) {
    const wx = i * 100;
    const { sx } = worldToScreen(wx, 0, camX);
    ctx.fillStyle = i % 2 === 0 ? "rgba(61,79,102,0.5)" : "rgba(42,55,72,0.5)";
    ctx.fillRect(sx, H * 0.65, 90, H * 0.35);
    ctx.fillStyle = "#5a6a80";
    ctx.font = "11px sans-serif";
    ctx.fillText(`B${i}`, sx + 8, H * 0.72);
  }
  // ground line
  ctx.strokeStyle = "#3d4f66";
  ctx.beginPath();
  ctx.moveTo(0, H * 0.7);
  ctx.lineTo(W, H * 0.7);
  ctx.stroke();

  // dead zone
  const dead = Number(deadEl?.value) || C.defaultDead;
  const mid = W / 2;
  ctx.fillStyle = "rgba(242,204,143,0.08)";
  ctx.fillRect(mid - dead, 0, dead * 2, H);
  ctx.strokeStyle = "rgba(242,204,143,0.35)";
  ctx.strokeRect(mid - dead, 0, dead * 2, H);

  const p = worldToScreen(playerX, playerY, camX);
  if (trailEl?.checked && trail.length) {
    drawTrailDots(ctx, trail, { rgb: "91,159,212", radius: 2 });
  }
  // カメラ現在の画面中心 vs プレイヤー（遅れ）
  ctx.fillStyle = "#5b9fd4";
  ctx.fillRect(p.sx - 14, p.sy - 28, 28, 36);
  ctx.fillStyle = "#e8eef7";
  ctx.font = "12px sans-serif";
  ctx.fillText("P", p.sx - 4, p.sy - 34);
  ctx.strokeStyle = "#f2cc8f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 8, H * 0.2);
  ctx.lineTo(W / 2 + 8, H * 0.2);
  ctx.moveTo(W / 2, H * 0.2 - 8);
  ctx.lineTo(W / 2, H * 0.2 + 8);
  ctx.stroke();
  ctx.fillStyle = "#f2cc8f";
  ctx.fillText("cam", W / 2 + 10, H * 0.2 + 4);
  ctx.fillStyle = "#6bcb8f";
  ctx.beginPath();
  ctx.arc(p.sx, 28, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillText("target", p.sx + 8, 32);

  // minimap
  const mmW = 160;
  const mmH = 36;
  const mmX = W - mmW - 12;
  const mmY = 12;
  ctx.fillStyle = "rgba(26,35,50,0.9)";
  ctx.fillRect(mmX, mmY, mmW, mmH);
  ctx.strokeStyle = "#5a6a80";
  ctx.strokeRect(mmX, mmY, mmW, mmH);
  const scale = mmW / C.worldW;
  ctx.fillStyle = "rgba(91,159,212,0.35)";
  ctx.fillRect(mmX + camX * scale, mmY + 4, W * scale, mmH - 8);
  ctx.fillStyle = "#e07a5f";
  ctx.fillRect(mmX + playerX * scale - 2, mmY + mmH / 2 - 4, 4, 8);

  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>Player world</td><td>${playerX.toFixed(0)}, ${playerY.toFixed(0)}</td></tr>
        <tr><td>Player screen</td><td>${p.sx.toFixed(0)}, ${p.sy.toFixed(0)}</td></tr>
        <tr><td>Camera X</td><td>${camX.toFixed(0)}</td></tr>
        <tr><td>Dead zone</td><td>±${dead.toFixed(0)} px</td></tr>
        <tr><td>遅れ (P−cam中心)</td><td>${(p.sx - W / 2).toFixed(0)} px</td></tr>
      </table>`;
  }
}

function step(dt) {
  let dx = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;
  playerX += dx * C.playerSpeed * dt;
  playerX = Math.max(20, Math.min(C.worldW - 20, playerX));
  const follow = Number(followEl?.value) || C.defaultFollow;
  const dead = Number(deadEl?.value) || C.defaultDead;
  camX = updateCamera(camX, playerX, canvas.width, dead, follow);
  const p = worldToScreen(playerX, playerY, camX);
  if (trailEl?.checked) {
    trail.push({ x: p.sx, y: p.sy });
    if (trail.length > 80) trail.shift();
  }
  if (loopEl?.checked && playerX >= C.worldW - 24) {
    playerX = 200;
    camX = 0;
    trail = [];
  }
  draw();
  setStatus(`cam=${camX.toFixed(0)} p.screen=${(playerX - camX).toFixed(0)} 遅れ=${(p.sx - canvas.width / 2).toFixed(0)}px`);
}

function loop(ts) {
  if (!running) return;
  if (!lastTs) lastTs = ts;
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (dt > 0.05) dt = 0.05;
  step(dt * readSpeedScale(speedEl));
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
  playerX = 200;
  camX = 0;
  trail = [];
  sync();
  draw();
  setStatus("リセット — ←→ で移動");
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
for (const el of [followEl, deadEl, speedEl]) {
  el?.addEventListener("input", () => {
    sync();
    draw();
  });
}

loadTextSample(
  "../samples/GfxCameraExample.cs",
  csharpSample,
  "// GfxCameraExample.cs"
);
if (followEl) followEl.value = String(C.defaultFollow);
if (deadEl) deadEl.value = String(C.defaultDead);
reset();

const urlSpec = {
  follow: { el: followEl, kind: "range" },
  dead: { el: deadEl, kind: "range" },
  speed: { el: speedEl, kind: "range" },
  loop: { el: loopEl, kind: "checkbox" },
  trail: { el: trailEl, kind: "checkbox" },
};
mountShareLink({
  spec: urlSpec,
  button: document.getElementById("btn-copy-url"),
  statusEl: document.getElementById("status"),
});
const urlResult = applyParamsToControls(urlSpec);
sync();
draw();
if (urlResult.warning) setStatus(urlResult.warning);
