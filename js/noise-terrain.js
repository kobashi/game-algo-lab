/**
 * ノイズと地形 — Value Noise + fBm
 * @see docs/topics/noise-terrain/SPEC.md
 */
import { NOISE_TERRAIN_CONFIG as C } from "./maps/noise-terrain-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("nt-canvas")
);
const ctx = canvas.getContext("2d");
const seedEl = /** @type {HTMLInputElement} */ (document.getElementById("seed"));
const octEl = /** @type {HTMLInputElement} */ (
  document.getElementById("octaves")
);
const octVal = document.getElementById("octaves-val");
const freqEl = /** @type {HTMLInputElement} */ (document.getElementById("freq"));
const freqVal = document.getElementById("freq-val");
const seaEl = /** @type {HTMLInputElement} */ (document.getElementById("sea"));
const seaVal = document.getElementById("sea-val");
const btnGen = document.getElementById("btn-gen");
const statsEl = document.getElementById("nt-stats");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/**
 * @param {number} x
 * @param {number} y
 * @param {number} seed
 */
export function hash2(x, y, seed) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 362437)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h >>> 0) & 0xffffff) / 0x1000000;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} seed
 */
export function valueNoise(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smooth(x - x0);
  const ty = smooth(y - y0);
  const v00 = hash2(x0, y0, seed);
  const v10 = hash2(x0 + 1, y0, seed);
  const v01 = hash2(x0, y0 + 1, seed);
  const v11 = hash2(x0 + 1, y0 + 1, seed);
  const a = v00 + (v10 - v00) * tx;
  const b = v01 + (v11 - v01) * tx;
  return a + (b - a) * ty;
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} seed
 * @param {number} octaves
 * @param {number} baseFreq
 */
export function fbm(x, y, seed, octaves, baseFreq) {
  let sum = 0;
  let amp = 1;
  let freq = baseFreq;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x * freq, y * freq, seed + i * 1013) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return norm > 0 ? sum / norm : 0;
}

function readSeed() {
  return (Math.floor(Number(seedEl?.value) || C.defaultSeed) >>> 0) || 1;
}
function readOctaves() {
  const n = Math.floor(Number(octEl?.value) || C.defaultOctaves);
  if (octVal) octVal.textContent = String(n);
  return Math.min(6, Math.max(1, n));
}
function readFreq() {
  const f = Number(freqEl?.value) || C.defaultFreq;
  if (freqVal) freqVal.textContent = f.toFixed(3);
  return f;
}
function readSea() {
  const s = Number(seaEl?.value) || 0.4;
  if (seaVal) seaVal.textContent = s.toFixed(2);
  return s;
}

function heightColor(h, sea) {
  if (h < sea) {
    const t = h / Math.max(0.001, sea);
    return [20 + t * 20, 40 + t * 60, 90 + t * 100];
  }
  if (h < sea + 0.08) return [194, 178, 128]; // beach
  if (h < 0.62) return [50 + (h - sea) * 80, 120 + (h - sea) * 60, 50];
  if (h < 0.78) return [90, 90, 80];
  return [230, 235, 240]; // snow
}

function generate() {
  const seed = readSeed();
  const oct = readOctaves();
  const freq = readFreq();
  const sea = readSea();
  const W = C.width;
  const H = C.height;
  canvas.width = W * C.scale;
  canvas.height = H * C.scale;
  if (!ctx) return;

  const img = ctx.createImageData(W, H);
  let min = 1;
  let max = 0;
  let land = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const h = fbm(x, y, seed, oct, freq);
      if (h < min) min = h;
      if (h > max) max = h;
      if (h >= sea) land += 1;
      const [r, g, b] = heightColor(h, sea);
      const i = (y * W + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  // draw scaled
  const off = document.createElement("canvas");
  off.width = W;
  off.height = H;
  const octx = off.getContext("2d");
  octx?.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(off, 0, 0, canvas.width, canvas.height);

  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>シード</td><td>${seed}</td></tr>
        <tr><td>オクターブ</td><td>${oct}</td></tr>
        <tr><td>高さ min/max</td><td>${min.toFixed(3)} / ${max.toFixed(3)}</td></tr>
        <tr><td>陸比率</td><td>${((land / (W * H)) * 100).toFixed(1)}%</td></tr>
      </table>`;
  }
  setStatus(`生成 · ${W}×${H} · oct=${oct} · seed=${seed}`);
}

btnGen?.addEventListener("click", generate);
for (const el of [seedEl, octEl, freqEl, seaEl]) {
  el?.addEventListener("input", () => {
    readOctaves();
    readFreq();
    readSea();
  });
  el?.addEventListener("change", generate);
}

loadTextSample(
  "../samples/NoiseTerrainExample.cs",
  csharpSample,
  "// NoiseTerrainExample.cs"
);
if (seedEl) seedEl.value = String(C.defaultSeed);
if (octEl) octEl.value = String(C.defaultOctaves);
if (freqEl) freqEl.value = String(C.defaultFreq);
readOctaves();
readFreq();
readSea();
generate();
