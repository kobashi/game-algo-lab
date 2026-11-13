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
let lastStatus = "";
let pinnedStatus = "";
const offXEl = /** @type {HTMLInputElement | null} */ (document.getElementById("off-x"));
const offYEl = /** @type {HTMLInputElement | null} */ (document.getElementById("off-y"));

/**
 * 画面上の 3 つの表示。スコアの大きさは 120×48 のまま。
 * ページを開いたときのスコアは右下で、外側の辺が画面の辺から 16 px 内側
 * （ステータスと同じ空き）。Pivot 0.5 なので ox = -(16+60)、oy = -(16+24)。
 * 演習の右上は ox=-76・oy=40。左上の x は 344 / 504 / 824、右の辺から 136 px。
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
    ox: -76,
    oy: -40,
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
 * 下は仮のステージの地面なので、先に空の上の角を使う。
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
    { x: W - GRAB_W - 8, y: 8 },
    { x: 8, y: 8 },
    { x: (W - GRAB_W) / 2, y: 8 },
    { x: 8, y: H - GRAB_H - 8 },
    { x: W - GRAB_W - 8, y: H - GRAB_H - 8 },
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

/** 0→1→0 を返す。行きと帰りで速さが一定。 */
function pingpong(t, period) {
  const u = ((t % period) + period) % period / period;
  return u < 0.5 ? u * 2 : 2 - u * 2;
}

const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
const stageT0 = performance.now();

function stageTime() {
  return reduceMotion ? 1.6 : (performance.now() - stageT0) / 1000;
}

/**
 * 仮のゲーム。UI をどこに置くかの参考で、操作はできない。
 * 位置は仮想画面の割合なので、幅が変わってもプレイの関係は残る。
 */
function drawStage(W, H, t) {
  if (!ctx) return;
  const s = H / 360;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#101820");
  sky.addColorStop(0.72, "#1a3344");
  sky.addColorStop(1, "#142830");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(186, 206, 220, 0.16)";
  const clouds = [
    { x: pingpong(t, 18), y: 0.1, w: 0.16 },
    { x: pingpong(t + 7, 24), y: 0.18, w: 0.1 },
  ];
  for (const c of clouds) {
    const cx = c.x * W;
    const cy = c.y * H;
    const cw = c.w * W;
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw * 0.5, 10 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + cw * 0.28, cy + 3 * s, cw * 0.32, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#163044";
  ctx.beginPath();
  ctx.moveTo(0, H * 0.74);
  ctx.quadraticCurveTo(W * 0.2, H * 0.5, W * 0.46, H * 0.7);
  ctx.quadraticCurveTo(W * 0.72, H * 0.88, W, H * 0.6);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.fill();
  ctx.fillStyle = "#1c4250";
  ctx.beginPath();
  ctx.moveTo(0, H * 0.82);
  ctx.quadraticCurveTo(W * 0.28, H * 0.66, W * 0.58, H * 0.8);
  ctx.quadraticCurveTo(W * 0.8, H * 0.9, W, H * 0.74);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.fill();

  const groundY = H * 0.78;
  ctx.fillStyle = "#1b382c";
  ctx.fillRect(0, groundY, W, H - groundY);
  ctx.fillStyle = "#3f6e52";
  ctx.fillRect(0, groundY, W, Math.max(3, H * 0.014));

  const plats = [
    { x: 0.08, y: 0.6, w: 0.24 },
    { x: 0.56, y: 0.48, w: 0.26 },
  ];
  const ph = Math.max(8, H * 0.032);
  for (const p of plats) {
    const x = p.x * W;
    const y = p.y * H;
    ctx.fillStyle = "#355844";
    ctx.fillRect(x, y, p.w * W, ph);
    ctx.fillStyle = "#8fd0a4";
    ctx.fillRect(x, y, p.w * W, Math.max(2, ph * 0.22));
  }

  const coinX = (0.08 + 0.12) * W;
  const coinY = 0.6 * H - 26 * s + Math.sin(t * 3) * 5 * s;
  ctx.fillStyle = "#f2cc8f";
  ctx.beginPath();
  ctx.arc(coinX, coinY, 8 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff6df";
  ctx.beginPath();
  ctx.arc(coinX - 2 * s, coinY - 2 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();

  const rp = plats[1];
  const ew = 20 * s;
  const eh = 16 * s;
  const ex = rp.x * W + 8 * s + pingpong(t, 3.4) * (rp.w * W - ew - 16 * s);
  const ey = rp.y * H - eh;
  ctx.fillStyle = "#8e6bb8";
  ctx.beginPath();
  ctx.moveTo(ex, ey + eh);
  ctx.lineTo(ex + ew / 2, ey);
  ctx.lineTo(ex + ew, ey + eh);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f4f1de";
  ctx.fillRect(ex + ew * 0.38, ey + eh * 0.55, Math.max(2, 3 * s), Math.max(2, 3 * s));

  const rw = 18 * s;
  const rh = 28 * s;
  const travel = pingpong(t, 5.2);
  const rx = W * 0.05 + travel * (W * 0.86 - rw);
  let hop = 0;
  if (travel > 0.38 && travel < 0.58) {
    hop = Math.sin(((travel - 0.38) / 0.2) * Math.PI) * 46 * s;
  }
  const ry = groundY - rh - hop;
  const dir = ((t % 5.2) + 5.2) % 5.2 < 2.6 ? 1 : -1;
  ctx.fillStyle = "#8ecae6";
  ctx.fillRect(rx, ry, rw, rh);
  ctx.fillStyle = "#102026";
  ctx.fillRect(dir > 0 ? rx + rw * 0.62 : rx + rw * 0.18, ry + rh * 0.28, Math.max(2, 3 * s), Math.max(2, 3 * s));
  ctx.strokeStyle = "#8ecae6";
  ctx.lineWidth = Math.max(2, 2.2 * s);
  const swing = Math.sin(t * 12) * 5 * s;
  ctx.beginPath();
  ctx.moveTo(rx + rw * 0.35, ry + rh);
  ctx.lineTo(rx + rw * 0.35 + swing, groundY);
  ctx.moveTo(rx + rw * 0.65, ry + rh);
  ctx.lineTo(rx + rw * 0.65 - swing, groundY);
  ctx.stroke();

  const bx = W * 0.16 + pingpong(t, 7) * W * 0.58;
  const by = H * 0.22 + Math.sin(t * 2.2) * H * 0.025;
  const bdir = ((t % 7) + 7) % 7 < 3.5 ? 1 : -1;
  ctx.strokeStyle = "#d5e4ee";
  ctx.lineWidth = Math.max(1.5, 1.8 * s);
  ctx.beginPath();
  ctx.moveTo(bx - 11 * s, by);
  ctx.quadraticCurveTo(bx - 4 * s, by - 8 * s * Math.sin(t * 8), bx, by);
  ctx.quadraticCurveTo(bx + 4 * s, by - 8 * s * Math.sin(t * 8 + 1), bx + 11 * s, by);
  ctx.stroke();
  ctx.fillStyle = "#d5e4ee";
  ctx.beginPath();
  ctx.arc(bx + bdir * 3 * s, by, 2.4 * s, 0, Math.PI * 2);
  ctx.fill();

  const fx = W * 0.93;
  ctx.strokeStyle = "#d7e3ea";
  ctx.lineWidth = Math.max(2, 2 * s);
  ctx.beginPath();
  ctx.moveTo(fx, groundY);
  ctx.lineTo(fx, groundY - 40 * s);
  ctx.stroke();
  ctx.fillStyle = "#e7f6ef";
  ctx.beginPath();
  ctx.moveTo(fx, groundY - 40 * s);
  ctx.lineTo(fx + 18 * s, groundY - 32 * s);
  ctx.lineTo(fx, groundY - 24 * s);
  ctx.fill();

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.lineWidth = 1;
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

  drawStage(W, H, stageTime());
  ctx.strokeStyle = "#3d4f66";
  ctx.lineWidth = 1;
  ctx.strokeRect(1, 1, W - 2, H - 2);

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
  const statsHtml = `
      <table class="coord-table">
        <tr><td>表示</td><td>${current.part.name}</td></tr>
        <tr><td>解像度</td><td>${W} × ${H}</td></tr>
        <tr><td>Anchor</td><td>${a.ax.toFixed(2)}, ${a.ay.toFixed(2)}</td></tr>
        <tr><td>Pivot</td><td>${current.part.px.toFixed(2)}, ${current.part.py.toFixed(2)}</td></tr>
        <tr><td>Offset</td><td>${current.part.ox.toFixed(0)}, ${current.part.oy.toFixed(0)}</td></tr>
        <tr><td>Widget TL</td><td>${current.L.x.toFixed(0)}, ${current.L.y.toFixed(0)}</td></tr>
        <tr><td>画面右から左上</td><td>${(W - current.L.x).toFixed(0)} px</td></tr>
      </table>`;
  if (statsEl && statsEl.dataset.key !== statsHtml) {
    statsEl.dataset.key = statsHtml;
    statsEl.innerHTML = statsHtml;
  }
  const statusLine = `${current.part.name} anchor=(${a.ax},${a.ay}) pivot=(${current.part.px.toFixed(2)},${current.part.py.toFixed(2)})`;
  if (!pinnedStatus && statusLine !== lastStatus) {
    lastStatus = statusLine;
    setStatus(statusLine);
  }
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

/**
 * Anchor プリセットを変えたとき、表示が画面の外に出ないよう Offset だけを直す。
 * Pivot と、URL で開いたときの Offset は変えない。
 */
function pullActiveInside() {
  const part = activePart();
  const W = canvas.width;
  const H = canvas.height;
  if (W <= 0 || H <= 0) return;
  const a = anchorOf(part.anchor);
  const L = layoutWidget(W, H, a.ax, a.ay, part.px, part.py, part.ox, part.oy, part.w, part.h);
  const maxX = Math.max(0, W - part.w);
  const maxY = Math.max(0, H - part.h);
  const x = Math.min(Math.max(L.x, 0), maxX);
  const y = Math.min(Math.max(L.y, 0), maxY);
  if (Math.abs(x - L.x) < 0.5 && Math.abs(y - L.y) < 0.5) return;
  part.ox = Math.round(x - a.ax * W + part.px * part.w);
  part.oy = Math.round(y - a.ay * H + part.py * part.h);
  if (offXEl) offXEl.value = String(part.ox);
  if (offYEl) offYEl.value = String(part.oy);
  const h = hidden[part.id];
  h.ox.value = String(part.ox);
  h.oy.value = String(part.oy);
}

function onEdit() {
  storeVisible();
  syncLabels();
  draw();
}
for (const el of [offXEl, offYEl]) {
  el?.addEventListener("input", onEdit);
}
for (const el of [pivotXEl, pivotYEl]) {
  el?.addEventListener("input", onEdit);
}
anchorEl?.addEventListener("change", () => {
  storeVisible();
  pullActiveInside();
  syncLabels();
  draw();
});
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
if (urlResult.warning) {
  pinnedStatus = urlResult.warning;
  lastStatus = urlResult.warning;
  setStatus(urlResult.warning);
}
function onUserEdit() {
  pinnedStatus = "";
}
for (const el of [anchorEl, pivotXEl, pivotYEl, offXEl, offYEl, partEl, resEl, viewwEl]) {
  el?.addEventListener("input", onUserEdit);
}
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
function stageFrame() {
  if (!document.hidden) draw();
  requestAnimationFrame(stageFrame);
}
requestAnimationFrame(stageFrame);
