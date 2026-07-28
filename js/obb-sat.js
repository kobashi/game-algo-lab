/**
 * OBB / SAT
 * @see docs/topics/obb-sat/SPEC.md
 */
import { OBB_SAT_CONFIG as C } from "./maps/obb-sat-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("obb-canvas")
);
const ctx = canvas.getContext("2d");
const aAngEl = /** @type {HTMLInputElement} */ (document.getElementById("a-ang"));
const bAngEl = /** @type {HTMLInputElement} */ (document.getElementById("b-ang"));
const aAngVal = document.getElementById("a-ang-val");
const bAngVal = document.getElementById("b-ang-val");
const axesEl = document.getElementById("obb-axes");
const statsEl = document.getElementById("obb-stats");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

let A = { ...C.a };
let B = { ...C.b };
/** @type {null | 'A' | 'B'} */
let drag = null;
let dmx = 0;
let dmy = 0;
let ox = 0;
let oy = 0;

/**
 * @param {{ x: number, y: number, hw: number, hh: number, angle: number }} o
 */
export function obbCorners(o) {
  const c = Math.cos(o.angle);
  const s = Math.sin(o.angle);
  const local = [
    [-o.hw, -o.hh],
    [o.hw, -o.hh],
    [o.hw, o.hh],
    [-o.hw, o.hh],
  ];
  return local.map(([lx, ly]) => ({
    x: o.x + lx * c - ly * s,
    y: o.y + lx * s + ly * c,
  }));
}

/**
 * @param {{ x: number, y: number, hw: number, hh: number, angle: number }} o
 */
export function obbAxes(o) {
  const c = Math.cos(o.angle);
  const s = Math.sin(o.angle);
  return [
    { x: c, y: s },
    { x: -s, y: c },
  ];
}

/**
 * @param {{x:number,y:number}[]} corners
 * @param {{x:number,y:number}} axis
 */
export function projectCorners(corners, axis) {
  let min = Infinity;
  let max = -Infinity;
  for (const p of corners) {
    const d = p.x * axis.x + p.y * axis.y;
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return { min, max };
}

/**
 * @param {typeof A} a
 * @param {typeof B} b
 */
export function satObb(a, b) {
  const ca = obbCorners(a);
  const cb = obbCorners(b);
  const axes = [...obbAxes(a), ...obbAxes(b)];
  /** @type {{ axis: {x:number,y:number}, a: {min:number,max:number}, b: {min:number,max:number}, overlap: boolean }[]} */
  const results = [];
  let hit = true;
  for (const axis of axes) {
    const len = Math.hypot(axis.x, axis.y) || 1;
    const n = { x: axis.x / len, y: axis.y / len };
    const pa = projectCorners(ca, n);
    const pb = projectCorners(cb, n);
    const overlap = !(pa.max < pb.min || pb.max < pa.min);
    if (!overlap) hit = false;
    results.push({ axis: n, a: pa, b: pb, overlap });
  }
  return { hit, results, ca, cb };
}

function syncLabels() {
  A.angle = ((Number(aAngEl?.value) || 0) * Math.PI) / 180;
  B.angle = ((Number(bAngEl?.value) || 0) * Math.PI) / 180;
  if (aAngVal) aAngVal.textContent = String(Math.round((A.angle * 180) / Math.PI));
  if (bAngVal) bAngVal.textContent = String(Math.round((B.angle * 180) / Math.PI));
}

function drawObb(corners, color, fill) {
  if (!ctx) return;
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i].x, corners[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function draw() {
  if (!ctx) return;
  syncLabels();
  const sat = satObb(A, B);
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawObb(
    sat.ca,
    "#5b9fd4",
    sat.hit ? "rgba(91,159,212,0.35)" : "rgba(91,159,212,0.15)"
  );
  drawObb(
    sat.cb,
    "#e07a5f",
    sat.hit ? "rgba(224,122,95,0.35)" : "rgba(224,122,95,0.15)"
  );

  // axes from origin-ish mid
  const mid = { x: canvas.width / 2, y: 40 };
  sat.results.forEach((r, i) => {
    const len = 50;
    ctx.strokeStyle = r.overlap ? "rgba(107,203,143,0.8)" : "rgba(224,122,95,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mid.x + i * 90, mid.y);
    ctx.lineTo(mid.x + i * 90 + r.axis.x * len, mid.y + r.axis.y * len);
    ctx.stroke();
  });

  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("ドラッグで移動 · 緑軸=投影重なり · 赤軸=分離", 12, canvas.height - 12);

  if (axesEl) {
    axesEl.innerHTML = sat.results
      .map(
        (r, i) => `
      <div class="es-log ${r.overlap ? "es-log-call" : "es-log-off"}">
        軸${i + 1}: A[${r.a.min.toFixed(0)},${r.a.max.toFixed(0)}]
        B[${r.b.min.toFixed(0)},${r.b.max.toFixed(0)}]
        → ${r.overlap ? "重なり" : "分離"}
      </div>`
      )
      .join("");
  }
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>判定</td><td>${sat.hit ? "HIT" : "miss"}</td></tr>
        <tr><td>分離軸</td><td>${sat.results.filter((r) => !r.overlap).length} / 4</td></tr>
      </table>`;
  }
  setStatus(sat.hit ? "SAT: 全軸で重なり → HIT" : "SAT: 分離軸あり → miss");
}

function pointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) * canvas.width) / rect.width,
    y: ((e.clientY - rect.top) * canvas.height) / rect.height,
  };
}

function hitObb(p, o) {
  const c = Math.cos(-o.angle);
  const s = Math.sin(-o.angle);
  const dx = p.x - o.x;
  const dy = p.y - o.y;
  const lx = dx * c - dy * s;
  const ly = dx * s + dy * c;
  return Math.abs(lx) <= o.hw && Math.abs(ly) <= o.hh;
}

canvas?.addEventListener("pointerdown", (e) => {
  const p = pointerPos(e);
  if (hitObb(p, A)) {
    drag = "A";
    dmx = p.x;
    dmy = p.y;
    ox = A.x;
    oy = A.y;
  } else if (hitObb(p, B)) {
    drag = "B";
    dmx = p.x;
    dmy = p.y;
    ox = B.x;
    oy = B.y;
  } else return;
  canvas.setPointerCapture(e.pointerId);
});

canvas?.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const p = pointerPos(e);
  if (drag === "A") {
    A.x = ox + (p.x - dmx);
    A.y = oy + (p.y - dmy);
  } else {
    B.x = ox + (p.x - dmx);
    B.y = oy + (p.y - dmy);
  }
  draw();
});

canvas?.addEventListener("pointerup", () => {
  drag = null;
});

btnReset?.addEventListener("click", () => {
  A = { ...C.a };
  B = { ...C.b };
  if (aAngEl) aAngEl.value = String(Math.round((C.a.angle * 180) / Math.PI));
  if (bAngEl) bAngEl.value = String(Math.round((C.b.angle * 180) / Math.PI));
  draw();
  setStatus("リセット");
});
for (const el of [aAngEl, bAngEl]) {
  el?.addEventListener("input", draw);
}

loadTextSample(
  "../samples/ObbSatExample.cs",
  csharpSample,
  "// ObbSatExample.cs"
);
if (aAngEl) aAngEl.value = String(Math.round((C.a.angle * 180) / Math.PI));
if (bAngEl) bAngEl.value = String(Math.round((C.b.angle * 180) / Math.PI));
draw();
