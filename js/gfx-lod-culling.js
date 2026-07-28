/**
 * LOD + フラスタムカリング
 */
import { GFX_LOD_CULLING_CONFIG as C } from "./maps/gfx-lod-culling-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("lod-canvas")
);
const ctx = canvas.getContext("2d");
const nearEl = /** @type {HTMLInputElement} */ (
  document.getElementById("lod-near")
);
const farEl = /** @type {HTMLInputElement} */ (
  document.getElementById("lod-far")
);
const cullEl = /** @type {HTMLInputElement} */ (
  document.getElementById("use-cull")
);
const nearVal = document.getElementById("near-val");
const farVal = document.getElementById("far-val");
const statsEl = document.getElementById("lod-stats");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** world objects */
const objects = [];
for (let r = 0; r < C.gridRows; r++) {
  for (let c = 0; c < C.gridCols; c++) {
    objects.push({
      x: 40 + c * C.spacing,
      y: 40 + r * C.spacing,
      id: `${c},${r}`,
    });
  }
}

let camX = 80;
let camY = 60;
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
/** @type {Set<string>} */
const keys = new Set();

/**
 * @returns {0|1|2} LOD level (0 high detail)
 */
export function pickLod(dist, near, far) {
  if (dist < near) return 0;
  if (dist < far) return 1;
  return 2;
}

/**
 * AABB vs view rect
 */
export function inFrustum(ox, oy, size, vx, vy, vw, vh) {
  const half = size / 2;
  return !(
    ox + half < vx ||
    ox - half > vx + vw ||
    oy + half < vy ||
    oy - half > vy + vh
  );
}

function readNear() {
  return Number(nearEl?.value) || C.lodNear;
}
function readFar() {
  return Number(farEl?.value) || C.lodFar;
}

function sync() {
  if (nearVal) nearVal.textContent = String(Math.floor(readNear()));
  if (farVal) farVal.textContent = String(Math.floor(readFar()));
}

function costOfLod(lod) {
  return lod === 0 ? 8 : lod === 1 ? 4 : 1;
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  const vw = C.viewW;
  const vh = C.viewH;
  const near = readNear();
  const far = readFar();
  const cull = !!cullEl?.checked;

  // world space drawn with camera offset
  ctx.save();
  ctx.translate(-camX + 20, -camY + 20);

  // view rect
  ctx.strokeStyle = "#6bcb8f";
  ctx.lineWidth = 2;
  ctx.strokeRect(camX, camY, vw, vh);
  ctx.lineWidth = 1;

  // lod rings from view center
  const cx = camX + vw / 2;
  const cy = camY + vh / 2;
  ctx.strokeStyle = "rgba(91,159,212,0.35)";
  ctx.beginPath();
  ctx.arc(cx, cy, near, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(224,122,95,0.35)";
  ctx.beginPath();
  ctx.arc(cx, cy, far, 0, Math.PI * 2);
  ctx.stroke();

  let drawn = 0;
  let culled = 0;
  let cost = 0;
  const lodCount = [0, 0, 0];

  for (const o of objects) {
    const dist = Math.hypot(o.x - cx, o.y - cy);
    const lod = pickLod(dist, near, far);
    const size = lod === 0 ? 28 : lod === 1 ? 18 : 10;
    const visible = inFrustum(o.x, o.y, size, camX, camY, vw, vh);
    if (cull && !visible) {
      culled += 1;
      // ghost
      ctx.fillStyle = "rgba(90,106,128,0.2)";
      ctx.fillRect(o.x - 4, o.y - 4, 8, 8);
      continue;
    }
    drawn += 1;
    lodCount[lod] += 1;
    cost += costOfLod(lod);
    const col =
      lod === 0 ? "#5b9fd4" : lod === 1 ? "#f2cc8f" : "#9aabbf";
    ctx.fillStyle = col;
    if (lod === 0) {
      ctx.fillRect(o.x - size / 2, o.y - size / 2, size, size);
      ctx.strokeStyle = "#e8eef7";
      ctx.strokeRect(o.x - size / 2, o.y - size / 2, size, size);
    } else if (lod === 1) {
      ctx.beginPath();
      ctx.moveTo(o.x, o.y - size / 2);
      ctx.lineTo(o.x + size / 2, o.y + size / 2);
      ctx.lineTo(o.x - size / 2, o.y + size / 2);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(o.x, o.y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("緑枠=カメラ · 青丸=LOD0閾値 · 赤=LOD1閾値", 12, 18);
  ctx.fillText("□ LOD0  △ LOD1  ● LOD2  灰=カリング", 12, 34);

  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>オブジェクト</td><td>${objects.length}</td></tr>
        <tr><td>描画</td><td>${drawn}</td></tr>
        <tr><td>カリング</td><td>${culled}</td></tr>
        <tr><td>LOD0/1/2</td><td>${lodCount[0]} / ${lodCount[1]} / ${lodCount[2]}</td></tr>
        <tr><td>コスト相当</td><td>${cost}</td></tr>
        <tr><td>カメラ</td><td>${camX.toFixed(0)}, ${camY.toFixed(0)}</td></tr>
      </table>`;
  }
  setStatus(`drawn=${drawn} cost=${cost} cull=${cull ? "on" : "off"}`);
}

function step(dt) {
  let dx = 0;
  let dy = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;
  if (keys.has("ArrowUp") || keys.has("KeyW")) dy -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) dy += 1;
  camX += dx * 180 * dt;
  camY += dy * 180 * dt;
  camX = Math.max(0, Math.min(C.gridCols * C.spacing - C.viewW + 40, camX));
  camY = Math.max(0, Math.min(C.gridRows * C.spacing - C.viewH + 40, camY));
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
  camX = 80;
  camY = 60;
  if (nearEl) nearEl.value = String(C.lodNear);
  if (farEl) farEl.value = String(C.lodFar);
  sync();
  draw();
  setStatus("リセット — WASD/矢印でカメラ");
}

window.addEventListener("keydown", (e) => {
  if (
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS"].includes(
      e.code
    )
  ) {
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
for (const el of [nearEl, farEl, cullEl]) {
  el?.addEventListener("input", () => {
    sync();
    draw();
  });
}

loadTextSample(
  "../samples/GfxLodCullingExample.cs",
  csharpSample,
  "// GfxLodCullingExample.cs"
);
reset();
