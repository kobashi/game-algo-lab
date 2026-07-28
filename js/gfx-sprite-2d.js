/**
 * 2D スプライト — シートフレーム + Y ソート
 */
import { GFX_SPRITE_2D_CONFIG as C } from "./maps/gfx-sprite-2d-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("spr-canvas")
);
const ctx = canvas.getContext("2d");
const sortEl = /** @type {HTMLInputElement} */ (
  document.getElementById("use-sort")
);
const animEl = /** @type {HTMLInputElement} */ (
  document.getElementById("use-anim")
);
const orderEl = document.getElementById("spr-order");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** @typedef {{ id: string, x: number, y: number, color: string, label: string, frame: number }} Actor */

/** @type {Actor[]} */
let actors = C.actors.map((a) => ({ ...a, frame: 0 }));
let running = false;
let animT = 0;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
/** @type {Actor | null} */
let drag = null;

/**
 * @param {Actor[]} list
 * @param {boolean} sortByY
 */
export function drawOrder(list, sortByY) {
  const copy = [...list];
  if (sortByY) copy.sort((a, b) => a.y - b.y || a.x - b.x);
  return copy;
}

/**
 * Draw a simple 4-frame walk-cycle figure (procedural "sprite sheet" cell).
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 * @param {number} frame 0..3
 * @param {string} color
 * @param {string} label
 */
function drawSprite(c, x, y, frame, color, label) {
  const f = ((frame % C.frameCount) + C.frameCount) % C.frameCount;
  const leg = (f === 1 || f === 3 ? 1 : 0) * (f === 1 ? 1 : -1);
  // shadow
  c.fillStyle = "rgba(0,0,0,0.25)";
  c.beginPath();
  c.ellipse(x, y + 18, 16, 5, 0, 0, Math.PI * 2);
  c.fill();
  // body
  c.fillStyle = color;
  c.fillRect(x - 12, y - 28, 24, 28);
  // head
  c.beginPath();
  c.arc(x, y - 36, 9, 0, Math.PI * 2);
  c.fill();
  // legs
  c.strokeStyle = color;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(x - 6, y);
  c.lineTo(x - 6 + leg * 6, y + 16);
  c.moveTo(x + 6, y);
  c.lineTo(x + 6 - leg * 6, y + 16);
  c.stroke();
  c.lineWidth = 1;
  c.fillStyle = "#e8eef7";
  c.font = "11px sans-serif";
  c.fillText(label, x - 4, y - 48);
  c.fillStyle = "#9aabbf";
  c.fillText(`f${f}`, x - 6, y + 30);
}

function renderOrder(list) {
  if (!orderEl) return;
  orderEl.innerHTML =
    "<strong>描画順（先→後）:</strong> " +
    list.map((a) => `${a.id}(y=${a.y.toFixed(0)})`).join(" → ");
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);
  // ground grid
  ctx.strokeStyle = "rgba(90,106,128,0.25)";
  for (let y = 40; y < H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("Y が大きいほど手前（後から描画）", 12, 18);

  // sprite sheet preview
  const sheetX = W - 150;
  const sheetY = 28;
  ctx.fillStyle = "rgba(26,35,50,0.9)";
  ctx.fillRect(sheetX - 8, sheetY - 8, 140, 52);
  ctx.fillStyle = "#9aabbf";
  ctx.fillText("sheet", sheetX, sheetY + 4);
  for (let i = 0; i < C.frameCount; i++) {
    const cx = sheetX + 18 + i * 30;
    const cy = sheetY + 30;
    drawSprite(ctx, cx, cy, i, "#8aa4c0", "");
    if (Math.floor(animT / C.frameSec) % C.frameCount === i) {
      ctx.strokeStyle = "#f2cc8f";
      ctx.strokeRect(cx - 16, cy - 48, 32, 70);
    }
  }

  const ordered = drawOrder(actors, !!sortEl?.checked);
  for (const a of ordered) {
    drawSprite(ctx, a.x, a.y, a.frame, a.color, a.label);
  }
  renderOrder(ordered);
}

function hitActor(x, y) {
  // front-first for pick
  const ordered = drawOrder(actors, !!sortEl?.checked).reverse();
  for (const a of ordered) {
    if (Math.abs(x - a.x) < 20 && y > a.y - 50 && y < a.y + 22) return a;
  }
  return null;
}

function pointerPos(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) * canvas.width) / r.width,
    y: ((e.clientY - r.top) * canvas.height) / r.height,
  };
}

canvas.addEventListener("pointerdown", (e) => {
  const p = pointerPos(e);
  drag = hitActor(p.x, p.y);
  if (drag) canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const p = pointerPos(e);
  drag.x = Math.max(24, Math.min(canvas.width - 24, p.x));
  drag.y = Math.max(60, Math.min(canvas.height - 30, p.y));
  draw();
});
canvas.addEventListener("pointerup", () => {
  drag = null;
});

function step(dt) {
  if (animEl?.checked) {
    animT += dt;
    const f = Math.floor(animT / C.frameSec) % C.frameCount;
    for (const a of actors) a.frame = f;
  }
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
btnReset?.addEventListener("click", () => {
  stop();
  actors = C.actors.map((a) => ({ ...a, frame: 0 }));
  animT = 0;
  draw();
  setStatus("リセット");
});
sortEl?.addEventListener("change", () => {
  draw();
  setStatus(sortEl.checked ? "Y ソート ON" : "ソート OFF（登録順）");
});
animEl?.addEventListener("change", draw);

loadTextSample(
  "../samples/GfxSprite2dExample.cs",
  csharpSample,
  "// GfxSprite2dExample.cs"
);
draw();
setStatus("ドラッグで位置変更 · ソート ON/OFF を比較");
