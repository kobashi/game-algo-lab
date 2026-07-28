/**
 * 円同士・円と AABB
 * @see docs/topics/circle-collision/SPEC.md
 */
import { CIRCLE_COLLISION_CONFIG as C } from "./maps/circle-collision-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("cc-canvas")
);
const ctx = canvas.getContext("2d");
const statsEl = document.getElementById("cc-stats");
const formulaEl = document.getElementById("cc-formula");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

let circleA = { ...C.circleA };
let circleB = { ...C.circleB };
let box = { ...C.box };

/**
 * @typedef {{ kind: 'A'|'B'|'box', ox: number, oy: number, mx: number, my: number }} Drag
 * @type {Drag | null}
 */
let drag = null;

/**
 * @param {number} x1
 * @param {number} y1
 * @param {number} r1
 * @param {number} x2
 * @param {number} y2
 * @param {number} r2
 */
export function circlesOverlap(x1, y1, r1, x2, y2, r2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const rr = r1 + r2;
  return dx * dx + dy * dy <= rr * rr;
}

/**
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @param {{x:number,y:number,w:number,h:number}} b
 */
export function circleAabbOverlap(cx, cy, r, b) {
  const nx = Math.min(Math.max(cx, b.x), b.x + b.w);
  const ny = Math.min(Math.max(cy, b.y), b.y + b.h);
  const dx = cx - nx;
  const dy = cy - ny;
  return { hit: dx * dx + dy * dy <= r * r, nx, ny, dist: Math.hypot(dx, dy) };
}

function nearestOnBox(cx, cy, b) {
  return {
    x: Math.min(Math.max(cx, b.x), b.x + b.w),
    y: Math.min(Math.max(cy, b.y), b.y + b.h),
  };
}

function evaluate() {
  const cc = circlesOverlap(
    circleA.x,
    circleA.y,
    circleA.r,
    circleB.x,
    circleB.y,
    circleB.r
  );
  const ca = circleAabbOverlap(circleA.x, circleA.y, circleA.r, box);
  const cb = circleAabbOverlap(circleB.x, circleB.y, circleB.r, box);
  const distAB = Math.hypot(circleB.x - circleA.x, circleB.y - circleA.y);
  return { cc, ca, cb, distAB };
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const ev = evaluate();
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  // box
  ctx.fillStyle = ev.ca.hit || ev.cb.hit ? "rgba(224,122,95,0.35)" : "#3d4f66";
  ctx.strokeStyle = "#e07a5f";
  ctx.lineWidth = 2;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.strokeRect(box.x, box.y, box.w, box.h);
  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("AABB", box.x + 8, box.y + 18);

  // nearest point lines for A
  const na = nearestOnBox(circleA.x, circleA.y, box);
  ctx.strokeStyle = "rgba(242, 204, 143, 0.7)";
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(circleA.x, circleA.y);
  ctx.lineTo(na.x, na.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#f2cc8f";
  ctx.beginPath();
  ctx.arc(na.x, na.y, 4, 0, Math.PI * 2);
  ctx.fill();

  // circles
  const drawC = (c, label, hit) => {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fillStyle = hit ? "rgba(107, 203, 143, 0.35)" : "rgba(91, 159, 212, 0.35)";
    ctx.fill();
    ctx.strokeStyle = hit ? "#6bcb8f" : "#5b9fd4";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#e8eef7";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(label, c.x - 6, c.y + 4);
  };
  drawC(circleA, "A", ev.cc || ev.ca.hit);
  drawC(circleB, "B", ev.cc || ev.cb.hit);

  // line A-B
  ctx.strokeStyle = ev.cc ? "#6bcb8f" : "rgba(154,171,191,0.5)";
  ctx.beginPath();
  ctx.moveTo(circleA.x, circleA.y);
  ctx.lineTo(circleB.x, circleB.y);
  ctx.stroke();

  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("ドラッグで移動 · 黄点 = AABB への最近点", 12, H - 12);

  renderPanel(ev);
}

function renderPanel(ev) {
  const sumR = circleA.r + circleB.r;
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>円A–円B 距離</td><td>${ev.distAB.toFixed(1)}</td></tr>
        <tr><td>rA+rB</td><td>${sumR.toFixed(1)}</td></tr>
        <tr><td>円同士</td><td class="${ev.cc ? "ok" : ""}">${ev.cc ? "HIT" : "miss"}</td></tr>
        <tr><td>円A–AABB</td><td>${ev.ca.hit ? "HIT" : "miss"} (d=${ev.ca.dist.toFixed(1)})</td></tr>
        <tr><td>円B–AABB</td><td>${ev.cb.hit ? "HIT" : "miss"} (d=${ev.cb.dist.toFixed(1)})</td></tr>
      </table>`;
  }
  if (formulaEl) {
    formulaEl.innerHTML = `
      <p><code>circles: dx²+dy² ≤ (r1+r2)²</code></p>
      <p><code>circle–AABB: dist(center, clamp(center, box)) ≤ r</code></p>`;
  }
  setStatus(
    `円同士 ${ev.cc ? "HIT" : "miss"} · A–箱 ${ev.ca.hit ? "HIT" : "miss"} · B–箱 ${ev.cb.hit ? "HIT" : "miss"}`
  );
}

function hitTest(mx, my) {
  const dA = Math.hypot(mx - circleA.x, my - circleA.y);
  if (dA <= circleA.r) return "A";
  const dB = Math.hypot(mx - circleB.x, my - circleB.y);
  if (dB <= circleB.r) return "B";
  if (
    mx >= box.x &&
    mx <= box.x + box.w &&
    my >= box.y &&
    my <= box.y + box.h
  ) {
    return "box";
  }
  return null;
}

function pointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * sx,
    y: (e.clientY - rect.top) * sy,
  };
}

canvas?.addEventListener("pointerdown", (e) => {
  const p = pointerPos(e);
  const kind = hitTest(p.x, p.y);
  if (!kind) return;
  canvas.setPointerCapture(e.pointerId);
  if (kind === "A") {
    drag = { kind: "A", ox: circleA.x, oy: circleA.y, mx: p.x, my: p.y };
  } else if (kind === "B") {
    drag = { kind: "B", ox: circleB.x, oy: circleB.y, mx: p.x, my: p.y };
  } else {
    drag = { kind: "box", ox: box.x, oy: box.y, mx: p.x, my: p.y };
  }
});

canvas?.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const p = pointerPos(e);
  const dx = p.x - drag.mx;
  const dy = p.y - drag.my;
  if (drag.kind === "A") {
    circleA.x = drag.ox + dx;
    circleA.y = drag.oy + dy;
  } else if (drag.kind === "B") {
    circleB.x = drag.ox + dx;
    circleB.y = drag.oy + dy;
  } else {
    box.x = drag.ox + dx;
    box.y = drag.oy + dy;
  }
  draw();
});

canvas?.addEventListener("pointerup", () => {
  drag = null;
});
canvas?.addEventListener("pointercancel", () => {
  drag = null;
});

function reset() {
  circleA = { ...C.circleA };
  circleB = { ...C.circleB };
  box = { ...C.box };
  drag = null;
  draw();
  setStatus("リセット — 円や箱をドラッグ");
}

btnReset?.addEventListener("click", reset);

loadTextSample(
  "../samples/CircleCollisionExample.cs",
  csharpSample,
  "// CircleCollisionExample.cs"
);
draw();
