/**
 * メッシュ・UV・マテリアル
 */
import { GFX_MESH_UV_CONFIG as C } from "./maps/gfx-mesh-uv-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("mesh-canvas")
);
const ctx = canvas.getContext("2d");
const uOffEl = /** @type {HTMLInputElement} */ (
  document.getElementById("u-off")
);
const vOffEl = /** @type {HTMLInputElement} */ (
  document.getElementById("v-off")
);
const scaleEl = /** @type {HTMLInputElement} */ (
  document.getElementById("uv-scale")
);
const wireEl = /** @type {HTMLInputElement} */ (
  document.getElementById("wire")
);
const tintEl = /** @type {HTMLInputElement} */ (
  document.getElementById("tint")
);
const uVal = document.getElementById("u-val");
const vVal = document.getElementById("v-val");
const scaleVal = document.getElementById("scale-val");
const statsEl = document.getElementById("mesh-stats");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** procedural checker texture */
const tex = document.createElement("canvas");
tex.width = C.texSize;
tex.height = C.texSize;
const tctx = tex.getContext("2d");

function buildTex() {
  if (!tctx) return;
  const n = 8;
  const cell = C.texSize / n;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      tctx.fillStyle = (x + y) % 2 === 0 ? "#5b9fd4" : "#f2cc8f";
      tctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  // UV origin marker
  tctx.fillStyle = "#e07a5f";
  tctx.fillRect(0, 0, cell * 0.5, cell * 0.5);
}

/**
 * Apply UV transform.
 */
export function transformUv(u, v, uOff, vOff, scale) {
  return [(u + uOff) * scale, (v + vOff) * scale];
}

/**
 * Barycentric fill triangle with texture sample (nearest).
 */
function fillTriTextured(p0, p1, p2, uv0, uv1, uv2, tint) {
  if (!ctx || !tctx) return;
  const minX = Math.floor(Math.min(p0[0], p1[0], p2[0]));
  const maxX = Math.ceil(Math.max(p0[0], p1[0], p2[0]));
  const minY = Math.floor(Math.min(p0[1], p1[1], p2[1]));
  const maxY = Math.ceil(Math.max(p0[1], p1[1], p2[1]));
  const area =
    (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p2[0] - p0[0]) * (p1[1] - p0[1]);
  if (Math.abs(area) < 1e-6) return;
  const img = tctx.getImageData(0, 0, C.texSize, C.texSize);
  const tr = parseInt(tint.slice(1, 3), 16) / 255;
  const tg = parseInt(tint.slice(3, 5), 16) / 255;
  const tb = parseInt(tint.slice(5, 7), 16) / 255;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const w0 =
        ((p1[0] - x) * (p2[1] - y) - (p2[0] - x) * (p1[1] - y)) / area;
      const w1 =
        ((p2[0] - x) * (p0[1] - y) - (p0[0] - x) * (p2[1] - y)) / area;
      const w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      let u = w0 * uv0[0] + w1 * uv1[0] + w2 * uv2[0];
      let v = w0 * uv0[1] + w1 * uv1[1] + w2 * uv2[1];
      u = ((u % 1) + 1) % 1;
      v = ((v % 1) + 1) % 1;
      const tx = Math.min(C.texSize - 1, Math.floor(u * C.texSize));
      const ty = Math.min(C.texSize - 1, Math.floor(v * C.texSize));
      const i = (ty * C.texSize + tx) * 4;
      const r = Math.round(img.data[i] * tr);
      const g = Math.round(img.data[i + 1] * tg);
      const b = Math.round(img.data[i + 2] * tb);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function sync() {
  if (uVal) uVal.textContent = Number(uOffEl?.value || 0).toFixed(2);
  if (vVal) vVal.textContent = Number(vOffEl?.value || 0).toFixed(2);
  if (scaleVal) scaleVal.textContent = Number(scaleEl?.value || 1).toFixed(2);
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  const uOff = Number(uOffEl?.value) || 0;
  const vOff = Number(vOffEl?.value) || 0;
  const scale = Number(scaleEl?.value) || 1;
  const tint = tintEl?.value || "#ffffff";
  const cx = W * 0.38;
  const cy = H * 0.5;
  const s = Math.min(W, H) * 0.28;

  const pts = C.positions.map(([x, y]) => [cx + x * s, cy + y * s]);
  const uvs = C.uvs.map(([u, v]) => transformUv(u, v, uOff, vOff, scale));

  // raster tris (downsampled for perf: step 2)
  // Use path fill with pattern as faster alternative + wire
  // Create transformed pattern via temp canvas
  const patCanvas = document.createElement("canvas");
  patCanvas.width = C.texSize;
  patCanvas.height = C.texSize;
  const pctx = patCanvas.getContext("2d");
  if (pctx && tctx) {
    pctx.save();
    pctx.translate(uOff * C.texSize, vOff * C.texSize);
    pctx.scale(scale, scale);
    pctx.drawImage(tex, 0, 0);
    // tile
    pctx.drawImage(tex, -C.texSize, 0);
    pctx.drawImage(tex, 0, -C.texSize);
    pctx.drawImage(tex, -C.texSize, -C.texSize);
    pctx.restore();
    // tint overlay approx
    pctx.globalCompositeOperation = "multiply";
    pctx.fillStyle = tint;
    pctx.fillRect(0, 0, C.texSize, C.texSize);
    pctx.globalCompositeOperation = "source-over";
  }

  const pattern = ctx.createPattern(patCanvas, "repeat");
  for (let t = 0; t < C.indices.length; t += 3) {
    const i0 = C.indices[t];
    const i1 = C.indices[t + 1];
    const i2 = C.indices[t + 2];
    ctx.beginPath();
    ctx.moveTo(pts[i0][0], pts[i0][1]);
    ctx.lineTo(pts[i1][0], pts[i1][1]);
    ctx.lineTo(pts[i2][0], pts[i2][1]);
    ctx.closePath();
    if (pattern) {
      // map pattern roughly by using full canvas pattern + clip
      ctx.save();
      ctx.clip();
      // draw texture onto bounding box with UV mapping approximation
      fillTriTextured(
        pts[i0],
        pts[i1],
        pts[i2],
        uvs[i0],
        uvs[i1],
        uvs[i2],
        tint
      );
      ctx.restore();
    }
    if (wireEl?.checked) {
      ctx.strokeStyle = "#e8eef7";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }

  // vertex labels
  ctx.fillStyle = "#9aabbf";
  ctx.font = "11px sans-serif";
  C.positions.forEach((_, i) => {
    const [u, v] = uvs[i];
    ctx.fillText(
      `v${i} uv(${u.toFixed(2)},${v.toFixed(2)})`,
      pts[i][0] + 6,
      pts[i][1]
    );
  });

  // texture preview
  const tx0 = W - C.texSize - 24;
  const ty0 = 24;
  ctx.drawImage(tex, tx0, ty0);
  ctx.strokeStyle = "#5a6a80";
  ctx.strokeRect(tx0, ty0, C.texSize, C.texSize);
  ctx.fillStyle = "#9aabbf";
  ctx.fillText("texture", tx0, ty0 - 6);

  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>頂点</td><td>${C.positions.length}</td></tr>
        <tr><td>三角形</td><td>${C.indices.length / 3}</td></tr>
        <tr><td>UV offset</td><td>${uOff.toFixed(2)}, ${vOff.toFixed(2)}</td></tr>
        <tr><td>UV scale</td><td>${scale.toFixed(2)}</td></tr>
        <tr><td>tint</td><td>${tint}</td></tr>
      </table>`;
  }
  setStatus(`UV off=(${uOff.toFixed(2)},${vOff.toFixed(2)}) scale=${scale.toFixed(2)}`);
}

for (const el of [uOffEl, vOffEl, scaleEl, wireEl, tintEl]) {
  el?.addEventListener("input", () => {
    sync();
    draw();
  });
}

loadTextSample(
  "../samples/GfxMeshUvExample.cs",
  csharpSample,
  "// GfxMeshUvExample.cs"
);
buildTex();
if (uOffEl) uOffEl.value = "0";
if (vOffEl) vOffEl.value = "0";
if (scaleEl) scaleEl.value = "1";
if (tintEl) tintEl.value = "#ffffff";
if (wireEl) wireEl.checked = true;
sync();
draw();
