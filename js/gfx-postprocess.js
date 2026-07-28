/**
 * ポストプロセス（彩度・コントラスト・ビネット・簡易ブルーム）
 */
import { GFX_POSTPROCESS_CONFIG as C } from "./maps/gfx-postprocess-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("pp-canvas")
);
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const satEl = /** @type {HTMLInputElement} */ (document.getElementById("sat"));
const conEl = /** @type {HTMLInputElement} */ (
  document.getElementById("contrast")
);
const vigEl = /** @type {HTMLInputElement} */ (
  document.getElementById("vignette")
);
const bloomEl = /** @type {HTMLInputElement} */ (
  document.getElementById("bloom")
);
const satVal = document.getElementById("sat-val");
const conVal = document.getElementById("con-val");
const vigVal = document.getElementById("vig-val");
const bloomVal = document.getElementById("bloom-val");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** offscreen scene */
const scene = document.createElement("canvas");
scene.width = canvas.width;
scene.height = canvas.height;
const sctx = scene.getContext("2d");

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @param {number} sat 1 = unchanged
 */
export function adjustSaturation(r, g, b, sat) {
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  return [
    gray + (r - gray) * sat,
    gray + (g - gray) * sat,
    gray + (b - gray) * sat,
  ];
}

/**
 * @param {number} v 0..255
 * @param {number} contrast around 1
 */
export function adjustContrast(v, contrast) {
  return (v - 128) * contrast + 128;
}

/**
 * Vignette factor at pixel (0 center dark edges when amount high)
 */
export function vignetteFactor(x, y, w, h, amount) {
  const nx = (x / w) * 2 - 1;
  const ny = (y / h) * 2 - 1;
  const d = Math.sqrt(nx * nx + ny * ny);
  return 1 - amount * Math.min(1, d * d);
}

function drawScene() {
  if (!sctx) return;
  const W = scene.width;
  const H = scene.height;
  sctx.fillStyle = "#1a2332";
  sctx.fillRect(0, 0, W, H);
  // sky gradient
  const g = sctx.createLinearGradient(0, 0, 0, H * 0.55);
  g.addColorStop(0, "#3d6ea8");
  g.addColorStop(1, "#8ec5e8");
  sctx.fillStyle = g;
  sctx.fillRect(0, 0, W, H * 0.55);
  // sun (bright for bloom)
  sctx.fillStyle = "#fff6c8";
  sctx.beginPath();
  sctx.arc(W * 0.72, H * 0.22, 36, 0, Math.PI * 2);
  sctx.fill();
  sctx.fillStyle = "rgba(255,255,200,0.5)";
  sctx.beginPath();
  sctx.arc(W * 0.72, H * 0.22, 55, 0, Math.PI * 2);
  sctx.fill();
  // ground
  sctx.fillStyle = "#3d7a4a";
  sctx.fillRect(0, H * 0.55, W, H * 0.45);
  // characters
  sctx.fillStyle = "#5b9fd4";
  sctx.fillRect(W * 0.25, H * 0.48, 40, 55);
  sctx.fillStyle = "#e07a5f";
  sctx.fillRect(W * 0.4, H * 0.5, 36, 50);
  sctx.fillStyle = "#f2cc8f";
  sctx.font = "14px sans-serif";
  sctx.fillText("scene (pre-FX)", 12, 20);
}

/**
 * Apply post FX via imageData (teaching CPU path).
 */
export function applyPost(imageData, sat, contrast, vignette, bloom) {
  const d = imageData.data;
  const w = imageData.width;
  const h = imageData.height;
  // first pass: sat + contrast + vignette, collect bright for bloom
  const bright = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];
      [r, g, b] = adjustSaturation(r, g, b, sat);
      r = adjustContrast(r, contrast);
      g = adjustContrast(g, contrast);
      b = adjustContrast(b, contrast);
      const vf = vignetteFactor(x, y, w, h, vignette);
      r *= vf;
      g *= vf;
      b *= vf;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      bright[y * w + x] = lum > 200 ? (lum - 200) / 55 : 0;
    }
  }
  if (bloom > 0.01) {
    // cheap box blur of bright mask → add
    const blur = new Float32Array(w * h);
    const rad = 3;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let s = 0;
        let n = 0;
        for (let dy = -rad; dy <= rad; dy++) {
          for (let dx = -rad; dx <= rad; dx++) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            s += bright[yy * w + xx];
            n += 1;
          }
        }
        blur[y * w + x] = s / n;
      }
    }
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const add = blur[p] * bloom * 80;
      d[i] = Math.min(255, d[i] + add);
      d[i + 1] = Math.min(255, d[i + 1] + add * 0.95);
      d[i + 2] = Math.min(255, d[i + 2] + add * 0.7);
    }
  }
  // clamp
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.max(0, Math.min(255, d[i]));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1]));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2]));
  }
  return imageData;
}

function sync() {
  if (satVal) satVal.textContent = Number(satEl?.value || 0).toFixed(2);
  if (conVal) conVal.textContent = Number(conEl?.value || 0).toFixed(2);
  if (vigVal) vigVal.textContent = Number(vigEl?.value || 0).toFixed(2);
  if (bloomVal) bloomVal.textContent = Number(bloomEl?.value || 0).toFixed(2);
}

function render() {
  if (!ctx || !sctx) return;
  drawScene();
  // downscale for performance of CPU post
  const scale = 0.5;
  const sw = Math.floor(canvas.width * scale);
  const sh = Math.floor(canvas.height * scale);
  const tmp = document.createElement("canvas");
  tmp.width = sw;
  tmp.height = sh;
  const tctx = tmp.getContext("2d", { willReadFrequently: true });
  if (!tctx) return;
  tctx.drawImage(scene, 0, 0, sw, sh);
  let img = tctx.getImageData(0, 0, sw, sh);
  img = applyPost(
    img,
    Number(satEl?.value) || 1,
    Number(conEl?.value) || 1,
    Number(vigEl?.value) || 0,
    Number(bloomEl?.value) || 0
  );
  tctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(10,14,20,0.55)";
  ctx.fillRect(8, canvas.height - 28, 280, 20);
  ctx.fillStyle = "#9aabbf";
  ctx.font = "11px sans-serif";
  ctx.fillText("CPU ポスト（教材用ダウンサンプル）", 12, canvas.height - 14);
  setStatus(
    `sat=${Number(satEl?.value).toFixed(2)} bloom=${Number(bloomEl?.value).toFixed(2)}`
  );
}

function reset() {
  if (satEl) satEl.value = String(C.defaultSat);
  if (conEl) conEl.value = String(C.defaultContrast);
  if (vigEl) vigEl.value = String(C.defaultVignette);
  if (bloomEl) bloomEl.value = String(C.defaultBloom);
  sync();
  render();
}

for (const el of [satEl, conEl, vigEl, bloomEl]) {
  el?.addEventListener("input", () => {
    sync();
    render();
  });
}
btnReset?.addEventListener("click", reset);

loadTextSample(
  "../samples/GfxPostprocessExample.cs",
  csharpSample,
  "// GfxPostprocessExample.cs"
);
reset();
