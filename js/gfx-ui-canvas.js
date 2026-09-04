/**
 * UI Canvas — Anchor / Pivot / 解像度
 */
import { GFX_UI_CANVAS_CONFIG as C } from "./maps/gfx-ui-canvas-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
  applyParamsToControls,
  mountShareLink,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("ui-canvas")
);
const ctx = canvas.getContext("2d");
const anchorEl = /** @type {HTMLSelectElement} */ (
  document.getElementById("anchor")
);
const pivotXEl = /** @type {HTMLInputElement} */ (
  document.getElementById("pivot-x")
);
const pivotYEl = /** @type {HTMLInputElement} */ (
  document.getElementById("pivot-y")
);
const resEl = /** @type {HTMLSelectElement} */ (
  document.getElementById("res")
);
const pivotXVal = document.getElementById("pivot-x-val");
const pivotYVal = document.getElementById("pivot-y-val");
const viewwEl = /** @type {HTMLInputElement} */ (
  document.getElementById("vieww")
);
const viewwVal = document.getElementById("vieww-val");
const statsEl = document.getElementById("ui-stats");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** offset from anchor point in parent space */
let offX = -20;
let offY = -20;
let dragging = false;
let dragStart = { x: 0, y: 0, ox: 0, oy: 0 };

/**
 * Compute top-left of widget given parent size, anchor, pivot, offset, widget size.
 * @returns {{ x: number, y: number, ax: number, ay: number }}
 */
export function layoutWidget(parentW, parentH, ax, ay, px, py, ox, oy, ww, wh) {
  const anchorX = ax * parentW;
  const anchorY = ay * parentH;
  const x = anchorX + ox - px * ww;
  const y = anchorY + oy - py * wh;
  return { x, y, ax: anchorX, ay: anchorY };
}

function readAnchor() {
  const key = anchorEl?.value || "bottom-right";
  return C.presets[key] || C.presets["bottom-right"];
}

function readRes() {
  const v = resEl?.value || "640x360";
  const [w, h] = v.split("x").map(Number);
  return { w: w || 640, h: h || 360 };
}

function syncLabels() {
  if (pivotXVal) pivotXVal.textContent = Number(pivotXEl?.value || 0).toFixed(2);
  if (pivotYVal) pivotYVal.textContent = Number(pivotYEl?.value || 0).toFixed(2);
}

function applyCanvasSize() {
  const w = Number(viewwEl?.value) || readRes().w;
  const h = Math.round((w * 360) / 640);
  canvas.width = w;
  canvas.height = h;
  if (viewwVal) viewwVal.textContent = String(Math.round(w));
  draw();
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const { ax, ay } = readAnchor();
  const px = Number(pivotXEl?.value) || 0.5;
  const py = Number(pivotYEl?.value) || 0.5;
  const ww = C.widgetW;
  const wh = C.widgetH;
  const L = layoutWidget(W, H, ax, ay, px, py, offX, offY, ww, wh);

  // parent (screen)
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#3d4f66";
  ctx.strokeRect(1, 1, W - 2, H - 2);

  // safe area grid
  ctx.strokeStyle = "rgba(90,106,128,0.25)";
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo((W * i) / 4, 0);
    ctx.lineTo((W * i) / 4, H);
    ctx.moveTo(0, (H * i) / 4);
    ctx.lineTo(W, (H * i) / 4);
    ctx.stroke();
  }

  // anchor point
  ctx.fillStyle = "#6bcb8f";
  ctx.beginPath();
  ctx.arc(L.ax, L.ay, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9aabbf";
  ctx.font = "11px sans-serif";
  ctx.fillText("Anchor", L.ax + 8, L.ay - 8);

  // offset line
  ctx.strokeStyle = "rgba(242,204,143,0.6)";
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(L.ax, L.ay);
  ctx.lineTo(L.x + px * ww, L.y + py * wh);
  ctx.stroke();
  ctx.setLineDash([]);

  // widget
  ctx.fillStyle = "rgba(91,159,212,0.85)";
  ctx.fillRect(L.x, L.y, ww, wh);
  ctx.strokeStyle = "#e8eef7";
  ctx.strokeRect(L.x, L.y, ww, wh);
  ctx.fillStyle = "#e8eef7";
  ctx.font = "13px sans-serif";
  ctx.fillText("Button", L.x + 28, L.y + 28);

  const L2 = layoutWidget(W, H, 0, 0, px, py, offX, offY, ww, wh);
  ctx.fillStyle = "rgba(242,204,143,0.45)";
  ctx.fillRect(L2.x, L2.y, ww, wh);
  ctx.strokeStyle = "#f2cc8f";
  ctx.strokeRect(L2.x, L2.y, ww, wh);
  ctx.fillStyle = "#f2cc8f";
  ctx.font = "11px sans-serif";
  ctx.fillText("比較:左上", L2.x + 8, L2.y + 22);

  // pivot
  const pivX = L.x + px * ww;
  const pivY = L.y + py * wh;
  ctx.fillStyle = "#e07a5f";
  ctx.beginPath();
  ctx.arc(pivX, pivY, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillText("Pivot", pivX + 8, pivY + 4);

  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>解像度</td><td>${W} × ${H}</td></tr>
        <tr><td>Anchor</td><td>${ax.toFixed(2)}, ${ay.toFixed(2)}</td></tr>
        <tr><td>Pivot</td><td>${px.toFixed(2)}, ${py.toFixed(2)}</td></tr>
        <tr><td>Offset</td><td>${offX.toFixed(0)}, ${offY.toFixed(0)}</td></tr>
        <tr><td>Widget TL</td><td>${L.x.toFixed(0)}, ${L.y.toFixed(0)}</td></tr>
      </table>`;
  }
  setStatus(`anchor=(${ax},${ay}) pivot=(${px.toFixed(2)},${py.toFixed(2)})`);
}

function pointerPos(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) * canvas.width) / r.width,
    y: ((e.clientY - r.top) * canvas.height) / r.height,
  };
}

canvas.addEventListener("pointerdown", (e) => {
  const { ax, ay } = readAnchor();
  const px = Number(pivotXEl?.value) || 0.5;
  const py = Number(pivotYEl?.value) || 0.5;
  const L = layoutWidget(
    canvas.width,
    canvas.height,
    ax,
    ay,
    px,
    py,
    offX,
    offY,
    C.widgetW,
    C.widgetH
  );
  const p = pointerPos(e);
  if (
    p.x >= L.x &&
    p.x <= L.x + C.widgetW &&
    p.y >= L.y &&
    p.y <= L.y + C.widgetH
  ) {
    dragging = true;
    dragStart = { x: p.x, y: p.y, ox: offX, oy: offY };
    canvas.setPointerCapture(e.pointerId);
  }
});
canvas.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const p = pointerPos(e);
  offX = dragStart.ox + (p.x - dragStart.x);
  offY = dragStart.oy + (p.y - dragStart.y);
  draw();
});
canvas.addEventListener("pointerup", () => {
  dragging = false;
});

for (const el of [anchorEl, pivotXEl, pivotYEl]) {
  el?.addEventListener("input", () => {
    syncLabels();
    draw();
  });
}
resEl?.addEventListener("change", () => {
  const { w } = readRes();
  if (viewwEl) viewwEl.value = String(w);
  applyCanvasSize();
});
viewwEl?.addEventListener("input", applyCanvasSize);

loadTextSample(
  "../samples/GfxUiCanvasExample.cs",
  csharpSample,
  "// GfxUiCanvasExample.cs"
);
if (pivotXEl) pivotXEl.value = String(C.defaultPivotX);
if (pivotYEl) pivotYEl.value = String(C.defaultPivotY);
if (anchorEl) anchorEl.value = "bottom-right";
syncLabels();
applyCanvasSize();

const urlSpec = {
  res: { el: resEl, kind: "select" },
  vieww: { el: viewwEl, kind: "range" },
  anchor: { el: anchorEl, kind: "select" },
  px: { el: pivotXEl, kind: "range" },
  py: { el: pivotYEl, kind: "range" },
};
mountShareLink({
  spec: urlSpec,
  button: document.getElementById("btn-copy-url"),
  statusEl: document.getElementById("status"),
});
const urlResult = applyParamsToControls(urlSpec);
syncLabels();
applyCanvasSize();
if (urlResult.warning) setStatus(urlResult.warning);
