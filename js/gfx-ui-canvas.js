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
  mountGlossary,
  formatTenths,
} from "./platform/index.js";

mountTopicShellFromDataset();
mountGlossary();

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
const partEl = /** @type {HTMLSelectElement} */ (document.getElementById("part"));
const statsEl = document.getElementById("ui-stats");
const frameNote = document.getElementById("ui-frame-note");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));
const offXEl = /** @type {HTMLInputElement | null} */ (document.getElementById("off-x"));
const offYEl = /** @type {HTMLInputElement | null} */ (document.getElementById("off-y"));

/**
 * 画面上の 3 つの表示。スコアの大きさは 120×48 のまま（演習の 80 px を保つ）。
 * URL の anchor・px・py・ox・oy はスコア。ステータスとメッセージは別のキー。
 */
const parts = [
  {
    id: "score",
    name: "スコア",
    w: C.widgetW,
    h: C.widgetH,
    anchor: "bottom-right",
    px: 0.5,
    py: 0.5,
    ox: -20,
    oy: -20,
    fill: "rgba(91,159,212,0.92)",
    stroke: "#e8eef7",
    ink: "#e8eef7",
  },
  {
    id: "status",
    name: "ステータス",
    w: 150,
    h: 36,
    anchor: "top-left",
    px: 0,
    py: 0,
    ox: 16,
    oy: 16,
    fill: "rgba(126,184,122,0.92)",
    stroke: "#d5f0cf",
    ink: "#10210f",
  },
  {
    id: "message",
    name: "イベントメッセージ",
    w: 220,
    h: 40,
    anchor: "center",
    px: 0.5,
    py: 0.5,
    ox: 0,
    oy: 0,
    fill: "rgba(242,204,143,0.94)",
    stroke: "#f2cc8f",
    ink: "#2a2116",
  },
];

/** @type {Record<string, { anchor: HTMLSelectElement, px: HTMLInputElement, py: HTMLInputElement, ox: HTMLInputElement, oy: HTMLInputElement }>} */
const hidden = {
  score: fields("score"),
  status: fields("status"),
  message: fields("message"),
};

/**
 * @param {string} id
 */
function fields(id) {
  return {
    anchor: /** @type {HTMLSelectElement} */ (document.getElementById(`${id}-anchor`)),
    px: /** @type {HTMLInputElement} */ (document.getElementById(`${id}-px`)),
    py: /** @type {HTMLInputElement} */ (document.getElementById(`${id}-py`)),
    ox: /** @type {HTMLInputElement} */ (document.getElementById(`${id}-ox`)),
    oy: /** @type {HTMLInputElement} */ (document.getElementById(`${id}-oy`)),
  };
}

/** 表示中の編集対象。表示の切り替え前に、今の欄をこちらへ書き戻す */
let editingId = "score";
let dragging = false;
let dragStart = { x: 0, y: 0, ox: 0, oy: 0 };
/** 画面内にこれより狭い辺があると、ボタン本体ではつかみにくい */
const GRAB_MIN = 28;
const GRAB_W = 84;
const GRAB_H = 32;

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

function anchorOf(key) {
  return C.presets[key] || C.presets["bottom-right"];
}

function activePart() {
  return parts.find((p) => p.id === editingId) || parts[0];
}

function readRes() {
  const v = resEl?.value || "640x360";
  const [w, h] = v.split("x").map(Number);
  return { w: w || 640, h: h || 360 };
}

/**
 * Pivot X/Y の読み取り。0 は 0 のまま扱う（`Number(v) || 既定` だと
 * 0 が既定値 0.5 に化けてしまうため、数値かどうかだけで判定する）。
 */
function readPivot(el) {
  const n = Number(el?.value);
  return Number.isFinite(n) ? n : 0.5;
}

function syncLabels() {
  if (pivotXVal) pivotXVal.textContent = readPivot(pivotXEl).toFixed(2);
  if (pivotYVal) pivotYVal.textContent = readPivot(pivotYEl).toFixed(2);
}

/** 幅スライダーは、選んでいる仮想解像度の縦横比を保った整数 px にする。 */
function bufferSize() {
  const res = readRes();
  const raw = Number(viewwEl?.value);
  const w = Math.round(Number.isFinite(raw) && raw > 0 ? raw : res.w);
  const h = Math.max(1, Math.round((w * res.h) / res.w));
  return { w, h, raw };
}

/**
 * 枠はバッファと同じ px（1 px は正方形）。欄がバッファより狭いときだけ、
 * 縦横を同じ割合で整数 px に縮める。max-width と高さの同時指定はしない。
 */
function fitFrame() {
  const bufW = canvas.width;
  const bufH = canvas.height;
  const parent = canvas.parentElement;
  let avail = bufW;
  if (parent) {
    const style = getComputedStyle(parent);
    const pad =
      (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
    avail = parent.clientWidth - pad;
  }
  let cssW = bufW;
  let cssH = bufH;
  let scaled = false;
  if (bufW > 0 && avail >= 1 && avail < bufW) {
    scaled = true;
    cssW = Math.max(1, Math.floor(avail));
    cssH = Math.max(1, Math.round((bufH * cssW) / bufW));
  }
  const wPx = `${cssW}px`;
  const hPx = `${cssH}px`;
  if (canvas.style.width !== wPx) canvas.style.width = wPx;
  if (canvas.style.height !== hPx) canvas.style.height = hPx;
  if (frameNote) {
    const base = `仮想画面は ${bufW}×${bufH} px。1 px は正方形です。`;
    frameNote.textContent = scaled
      ? `${base}欄が狭いので、縦横を同じ割合で縮めて表示しています。数表の座標は、縮める前の px です。`
      : `${base}枠もこの大きさです。`;
  }
}

/**
 * ボタンが画面の外に出て、残っている部分が小さいときのつまみ。
 * 画面内に十分残っているときは出さない（既定の右下はそのまま）。
 * @returns {{ x: number, y: number, w: number, h: number } | null}
 */
function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function otherRects(W, H, exceptId) {
  return parts
    .filter((p) => p.id !== exceptId)
    .map((p) => {
      const L = placeOf(p, W, H);
      return { x: L.x, y: L.y, w: p.w, h: p.h };
    });
}

/**
 * 画面の外に出て残っている部分が小さいときのつまみ。
 * ほかの表示に重なるときは、空いている角へずらす。
 * @returns {{ x: number, y: number, w: number, h: number } | null}
 */
function buttonGrab(L, ww, wh, W, H, obstacles) {
  const x0 = Math.max(L.x, 0);
  const y0 = Math.max(L.y, 0);
  const x1 = Math.min(L.x + ww, W);
  const y1 = Math.min(L.y + wh, H);
  if (x1 - x0 >= GRAB_MIN && y1 - y0 >= GRAB_MIN) return null;
  const cx = Math.min(Math.max(L.x + ww / 2, GRAB_W / 2 + 4), W - GRAB_W / 2 - 4);
  const cy = Math.min(Math.max(L.y + wh / 2, GRAB_H / 2 + 4), H - GRAB_H / 2 - 4);
  const base = { x: cx - GRAB_W / 2, y: cy - GRAB_H / 2, w: GRAB_W, h: GRAB_H };
  const blocks = obstacles || [];
  if (!blocks.some((o) => overlaps(base, o))) return base;
  const spots = [
    { x: 8, y: H - GRAB_H - 8 },
    { x: W - GRAB_W - 8, y: H - GRAB_H - 8 },
    { x: (W - GRAB_W) / 2, y: H - GRAB_H - 8 },
    { x: W - GRAB_W - 8, y: 8 },
    { x: 8, y: 8 },
  ];
  for (const s of spots) {
    const rect = { x: s.x, y: s.y, w: GRAB_W, h: GRAB_H };
    if (!blocks.some((o) => overlaps(rect, o))) return rect;
  }
  return base;
}

function placeOf(part, W, H) {
  const a = anchorOf(part.anchor);
  return layoutWidget(W, H, a.ax, a.ay, part.px, part.py, part.ox, part.oy, part.w, part.h);
}

function storeVisible() {
  const part = parts.find((p) => p.id === editingId);
  if (!part || !anchorEl) return;
  part.anchor = anchorEl.value || part.anchor;
  part.px = readPivot(pivotXEl);
  part.py = readPivot(pivotYEl);
  const ox = Number(offXEl?.value);
  const oy = Number(offYEl?.value);
  if (Number.isFinite(ox)) part.ox = Math.round(ox);
  if (Number.isFinite(oy)) part.oy = Math.round(oy);
  const h = hidden[part.id];
  h.anchor.value = part.anchor;
  h.px.value = String(part.px);
  h.py.value = String(part.py);
  h.ox.value = String(part.ox);
  h.oy.value = String(part.oy);
}

function readHidden(part) {
  const h = hidden[part.id];
  if (h.anchor.value && C.presets[h.anchor.value]) part.anchor = h.anchor.value;
  part.px = readPivot(h.px);
  part.py = readPivot(h.py);
  const ox = Number(h.ox.value);
  const oy = Number(h.oy.value);
  if (Number.isFinite(ox)) part.ox = Math.round(ox);
  if (Number.isFinite(oy)) part.oy = Math.round(oy);
}

function loadVisible() {
  const part = parts.find((p) => p.id === partEl?.value) || parts[0];
  editingId = part.id;
  if (anchorEl) anchorEl.value = part.anchor;
  if (pivotXEl) pivotXEl.value = String(part.px);
  if (pivotYEl) pivotYEl.value = String(part.py);
  if (offXEl) offXEl.value = String(part.ox);
  if (offYEl) offYEl.value = String(part.oy);
  syncLabels();
}

function insideRect(px, py, x, y, w, h) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

function drawPart(part, L, selected) {
  if (!ctx) return;
  ctx.fillStyle = part.fill;
  ctx.fillRect(L.x, L.y, part.w, part.h);
  ctx.lineWidth = selected ? 3 : 1;
  ctx.strokeStyle = selected ? "#ffffff" : part.stroke;
  ctx.strokeRect(L.x, L.y, part.w, part.h);
  ctx.fillStyle = part.ink;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  if (part.id === "score") {
    ctx.font = "12px sans-serif";
    ctx.fillText("SCORE", L.x + 10, L.y + 18);
    ctx.font = "bold 16px sans-serif";
    ctx.fillText("1200", L.x + 10, L.y + 38);
  } else if (part.id === "status") {
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("HP 80", L.x + 8, L.y + 16);
    const barX = L.x + 8;
    const barY = L.y + part.h - 12;
    const barW = part.w - 16;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(barX, barY, barW, 6);
    ctx.fillStyle = "#e7ffe4";
    ctx.fillRect(barX, barY, barW * 0.8, 6);
  } else {
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("コインを入手", L.x + part.w / 2, L.y + 25);
    ctx.textAlign = "left";
  }
}

function drawGrab(grab) {
  if (!ctx || !grab) return;
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(grab.x, grab.y, grab.w, grab.h, 8);
  else ctx.rect(grab.x, grab.y, grab.w, grab.h);
  ctx.fillStyle = "rgba(224, 122, 95, 0.95)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#fff7f2";
  ctx.stroke();
  ctx.fillStyle = "#fff7f2";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ドラッグ", grab.x + grab.w / 2, grab.y + grab.h / 2);
  ctx.restore();
}

function applyCanvasSize() {
  const { w, h, raw } = bufferSize();
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  if (viewwVal) viewwVal.textContent = formatTenths(Number.isFinite(raw) ? raw : w);
  fitFrame();
  draw();
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const active = activePart();
  const laid = parts.map((part) => ({ part, L: placeOf(part, W, H) }));
  const current = laid.find((row) => row.part.id === active.id) || laid[0];
  const grab = buttonGrab(current.L, current.part.w, current.part.h, W, H, otherRects(W, H, current.part.id));

  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#3d4f66";
  ctx.lineWidth = 1;
  ctx.strokeRect(1, 1, W - 2, H - 2);

  ctx.strokeStyle = "rgba(90,106,128,0.25)";
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo((W * i) / 4, 0);
    ctx.lineTo((W * i) / 4, H);
    ctx.moveTo(0, (H * i) / 4);
    ctx.lineTo(W, (H * i) / 4);
    ctx.stroke();
  }

  for (const row of laid) {
    if (row.part.id === active.id) continue;
    drawPart(row.part, row.L, false);
  }
  drawPart(current.part, current.L, true);

  ctx.fillStyle = "#6bcb8f";
  ctx.beginPath();
  ctx.arc(current.L.ax, current.L.ay, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9aabbf";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Anchor", current.L.ax + 8, current.L.ay - 8);

  const pivX = current.L.x + current.part.px * current.part.w;
  const pivY = current.L.y + current.part.py * current.part.h;
  ctx.strokeStyle = "rgba(242,204,143,0.6)";
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(current.L.ax, current.L.ay);
  ctx.lineTo(pivX, pivY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#e07a5f";
  ctx.beginPath();
  ctx.arc(pivX, pivY, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillText("Pivot", pivX + 8, pivY + 4);

  drawGrab(grab);

  const a = anchorOf(current.part.anchor);
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>表示</td><td>${current.part.name}</td></tr>
        <tr><td>解像度</td><td>${W} × ${H}</td></tr>
        <tr><td>Anchor</td><td>${a.ax.toFixed(2)}, ${a.ay.toFixed(2)}</td></tr>
        <tr><td>Pivot</td><td>${current.part.px.toFixed(2)}, ${current.part.py.toFixed(2)}</td></tr>
        <tr><td>Offset</td><td>${current.part.ox.toFixed(0)}, ${current.part.oy.toFixed(0)}</td></tr>
        <tr><td>Widget TL</td><td>${current.L.x.toFixed(0)}, ${current.L.y.toFixed(0)}</td></tr>
        <tr><td>画面右から左上</td><td>${(W - current.L.x).toFixed(0)} px</td></tr>
      </table>`;
  }
  setStatus(
    `${current.part.name} anchor=(${a.ax},${a.ay}) pivot=(${current.part.px.toFixed(2)},${current.part.py.toFixed(2)})`
  );
}

function pointerPos(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) * canvas.width) / r.width,
    y: ((e.clientY - r.top) * canvas.height) / r.height,
  };
}

function beginDrag(part, p) {
  if (part.id !== editingId) {
    storeVisible();
    if (partEl) partEl.value = part.id;
    editingId = part.id;
    loadVisible();
  }
  dragging = true;
  dragStart = { x: p.x, y: p.y, ox: part.ox, oy: part.oy };
}

canvas.addEventListener("pointerdown", (e) => {
  const p = pointerPos(e);
  const W = canvas.width;
  const H = canvas.height;
  const active = activePart();
  const activeL = placeOf(active, W, H);
  const grab = buttonGrab(activeL, active.w, active.h, W, H, otherRects(W, H, active.id));
  if (grab && insideRect(p.x, p.y, grab.x, grab.y, grab.w, grab.h)) {
    beginDrag(active, p);
    canvas.setPointerCapture(e.pointerId);
    return;
  }
  const hits = parts
    .map((part) => ({ part, L: placeOf(part, W, H) }))
    .filter((row) => insideRect(p.x, p.y, row.L.x, row.L.y, row.part.w, row.part.h));
  const hit = hits.find((row) => row.part.id === editingId) || hits[hits.length - 1];
  if (!hit) return;
  beginDrag(hit.part, p);
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const p = pointerPos(e);
  const part = activePart();
  part.ox = Math.round(dragStart.ox + (p.x - dragStart.x));
  part.oy = Math.round(dragStart.oy + (p.y - dragStart.y));
  if (offXEl) offXEl.value = String(part.ox);
  if (offYEl) offYEl.value = String(part.oy);
  const h = hidden[part.id];
  h.ox.value = String(part.ox);
  h.oy.value = String(part.oy);
  draw();
});
canvas.addEventListener("pointerup", () => {
  dragging = false;
});

function onEdit() {
  storeVisible();
  syncLabels();
  draw();
}
for (const el of [offXEl, offYEl]) {
  el?.addEventListener("input", onEdit);
}
for (const el of [anchorEl, pivotXEl, pivotYEl]) {
  el?.addEventListener("input", onEdit);
}
anchorEl?.addEventListener("change", onEdit);
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
  anchor: { el: hidden.score.anchor, kind: "select" },
  px: { el: hidden.score.px, kind: "number" },
  py: { el: hidden.score.py, kind: "number" },
  ox: { el: hidden.score.ox, kind: "number" },
  oy: { el: hidden.score.oy, kind: "number" },
  ha: { el: hidden.status.anchor, kind: "select" },
  hpx: { el: hidden.status.px, kind: "number" },
  hpy: { el: hidden.status.py, kind: "number" },
  hox: { el: hidden.status.ox, kind: "number" },
  hoy: { el: hidden.status.oy, kind: "number" },
  ma: { el: hidden.message.anchor, kind: "select" },
  mpx: { el: hidden.message.px, kind: "number" },
  mpy: { el: hidden.message.py, kind: "number" },
  mox: { el: hidden.message.ox, kind: "number" },
  moy: { el: hidden.message.oy, kind: "number" },
  part: { el: partEl, kind: "select" },
};
document.getElementById("btn-copy-url")?.addEventListener(
  "click",
  () => {
    storeVisible();
  },
  true
);
mountShareLink({
  spec: urlSpec,
  button: document.getElementById("btn-copy-url"),
  statusEl: document.getElementById("status"),
});
const urlResult = applyParamsToControls(urlSpec);
for (const part of parts) readHidden(part);
loadVisible();
applyCanvasSize();
if (urlResult.warning) setStatus(urlResult.warning);
partEl?.addEventListener("change", () => {
  storeVisible();
  editingId = partEl.value;
  loadVisible();
  draw();
});
if (canvas.parentElement && typeof ResizeObserver !== "undefined") {
  const frameObserver = new ResizeObserver(() => fitFrame());
  frameObserver.observe(canvas.parentElement);
}
