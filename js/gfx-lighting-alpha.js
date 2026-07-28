/**
 * 点光源 + アルファ合成
 */
import { GFX_LIGHTING_ALPHA_CONFIG as C } from "./maps/gfx-lighting-alpha-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("lit-canvas")
);
const ctx = canvas.getContext("2d");
const alphaEl = /** @type {HTMLInputElement} */ (
  document.getElementById("alpha")
);
const ambEl = /** @type {HTMLInputElement} */ (
  document.getElementById("ambient")
);
const blendEl = /** @type {HTMLSelectElement} */ (
  document.getElementById("blend")
);
const alphaVal = document.getElementById("alpha-val");
const ambVal = document.getElementById("amb-val");
const statsEl = document.getElementById("lit-stats");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

const light = { x: canvas.width * 0.4, y: canvas.height * 0.45 };
const sprites = [
  { x: 220, y: 160, w: 70, h: 90, base: [91, 159, 212] },
  { x: 360, y: 180, w: 80, h: 70, base: [224, 122, 95] },
  { x: 300, y: 120, w: 60, h: 60, base: [107, 203, 143] },
];
let dragging = false;

/**
 * Attenuation 0..1 from distance.
 */
export function lightFactor(dist, radius, ambient) {
  if (dist >= radius) return ambient;
  const t = 1 - dist / radius;
  return ambient + (1 - ambient) * t * t;
}

/**
 * Standard alpha over: out = src*a + dst*(1-a)
 */
export function alphaOver(src, dst, a) {
  return src * a + dst * (1 - a);
}

function sync() {
  if (alphaVal) alphaVal.textContent = Number(alphaEl?.value || 0).toFixed(2);
  if (ambVal) ambVal.textContent = Number(ambEl?.value || 0).toFixed(2);
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const ambient = Number(ambEl?.value) || C.ambient;
  const alpha = Number(alphaEl?.value) || C.defaultAlpha;
  const blend = blendEl?.value || "alpha";

  // base ground
  ctx.fillStyle = "#121820";
  ctx.fillRect(0, 0, W, H);

  // soft light pool background
  const grd = ctx.createRadialGradient(
    light.x,
    light.y,
    10,
    light.x,
    light.y,
    C.lightRadius
  );
  grd.addColorStop(0, `rgba(255,240,200,${0.35 * (1 - ambient + 0.2)})`);
  grd.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  for (const s of sprites) {
    const cx = s.x + s.w / 2;
    const cy = s.y + s.h / 2;
    const dist = Math.hypot(cx - light.x, cy - light.y);
    const lf = lightFactor(dist, C.lightRadius, ambient);
    const [br, bg, bb] = s.base;
    const r = Math.round(br * lf);
    const g = Math.round(bg * lf);
    const b = Math.round(bb * lf);

    if (blend === "additive") {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    } else {
      // simulate alpha over dark bg conceptually + draw with globalAlpha
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.globalAlpha = 1;
      // outline full opacity for shape
      ctx.strokeStyle = "rgba(232,238,247,0.25)";
      ctx.strokeRect(s.x, s.y, s.w, s.h);
    }
  }

  // light gizmo
  ctx.fillStyle = "#f2cc8f";
  ctx.beginPath();
  ctx.arc(light.x, light.y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(242,204,143,0.4)";
  ctx.beginPath();
  ctx.arc(light.x, light.y, C.lightRadius, 0, Math.PI * 2);
  ctx.stroke();

  // sample alpha over equation readout at first sprite center
  const s0 = sprites[0];
  const d0 = Math.hypot(s0.x + s0.w / 2 - light.x, s0.y + s0.h / 2 - light.y);
  const lf0 = lightFactor(d0, C.lightRadius, ambient);
  const lit = s0.base[0] * lf0;
  const over = alphaOver(lit, 18, alpha); // dst ~ dark bg channel

  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>光源</td><td>${light.x.toFixed(0)}, ${light.y.toFixed(0)}</td></tr>
        <tr><td>サンプル lightFactor</td><td>${lf0.toFixed(3)}</td></tr>
        <tr><td>α</td><td>${alpha.toFixed(2)}</td></tr>
        <tr><td>alphaOver(src,dst,α)</td><td>${over.toFixed(1)}</td></tr>
        <tr><td>ブレンド</td><td>${blend}</td></tr>
      </table>`;
  }
  setStatus(`light @ ${light.x.toFixed(0)},${light.y.toFixed(0)} · α=${alpha.toFixed(2)}`);
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
  if (Math.hypot(p.x - light.x, p.y - light.y) < 40) {
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
  } else {
    light.x = p.x;
    light.y = p.y;
    draw();
  }
});
canvas.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const p = pointerPos(e);
  light.x = Math.max(0, Math.min(canvas.width, p.x));
  light.y = Math.max(0, Math.min(canvas.height, p.y));
  draw();
});
canvas.addEventListener("pointerup", () => {
  dragging = false;
});

for (const el of [alphaEl, ambEl, blendEl]) {
  el?.addEventListener("input", () => {
    sync();
    draw();
  });
}

loadTextSample(
  "../samples/GfxLightingAlphaExample.cs",
  csharpSample,
  "// GfxLightingAlphaExample.cs"
);
if (alphaEl) alphaEl.value = String(C.defaultAlpha);
if (ambEl) ambEl.value = String(C.ambient);
sync();
draw();
