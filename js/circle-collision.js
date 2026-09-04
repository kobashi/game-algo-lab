/**
 * 円同士・円と AABB
 * @see docs/topics/circle-collision/SPEC.md
 */
import { CIRCLE_COLLISION_CONFIG as C } from "./maps/circle-collision-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
  applyParamsToControls,
  mountShareLink,
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
const arEl = /** @type {HTMLInputElement} */ (document.getElementById("ar"));
const brEl = /** @type {HTMLInputElement} */ (document.getElementById("br"));
const boxwEl = /** @type {HTMLInputElement} */ (document.getElementById("boxw"));
const boxhEl = /** @type {HTMLInputElement} */ (document.getElementById("boxh"));
const arVal = document.getElementById("ar-val");
const brVal = document.getElementById("br-val");
const boxwVal = document.getElementById("boxw-val");
const boxhVal = document.getElementById("boxh-val");
const axEl = /** @type {HTMLInputElement} */ (document.getElementById("ax"));
const ayEl = /** @type {HTMLInputElement} */ (document.getElementById("ay"));
const bxEl = /** @type {HTMLInputElement} */ (document.getElementById("bx"));
const byEl = /** @type {HTMLInputElement} */ (document.getElementById("by"));
const boxxEl = /** @type {HTMLInputElement} */ (document.getElementById("boxx"));
const boxyEl = /** @type {HTMLInputElement} */ (document.getElementById("boxy"));

let circleA = { ...C.circleA };
let circleB = { ...C.circleB };
let box = { ...C.box };

/**
 * @typedef {{ kind: 'A'|'B'|'box', ox: number, oy: number, mx: number, my: number }} Drag
 * @type {Drag | null}
 */
let drag = null;
/** @type {'A'|'B'|'box'|null} */
let selected = "A";

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
  const graze = Math.abs(ev.distAB - (circleA.r + circleB.r)) <= 1.5;
  const drawC = (c, label, hit, isSel) => {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fillStyle = graze && label !== "AABB"
      ? "rgba(242,204,143,0.4)"
      : hit
        ? "rgba(107, 203, 143, 0.35)"
        : "rgba(91, 159, 212, 0.35)";
    ctx.fill();
    ctx.strokeStyle = isSel ? "#f2cc8f" : hit ? "#6bcb8f" : graze ? "#f2cc8f" : "#5b9fd4";
    ctx.lineWidth = isSel ? 3 : 2;
    ctx.stroke();
    ctx.fillStyle = "#e8eef7";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(label, c.x - 6, c.y + 4);
  };
  drawC(circleA, "A", ev.cc || ev.ca.hit, selected === "A");
  drawC(circleB, "B", ev.cc || ev.cb.hit, selected === "B");
  if (selected === "box") {
    ctx.strokeStyle = "#f2cc8f";
    ctx.lineWidth = 3;
    ctx.strokeRect(box.x - 1, box.y - 1, box.w + 2, box.h + 2);
  }

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
  const graze = Math.abs(ev.distAB - (circleA.r + circleB.r)) <= 1.5;
  setStatus(
    graze
      ? `ぎりぎり接触（|d − (rA+rB)| ≤ 1.5）  d=${ev.distAB.toFixed(1)} rA+rB=${(circleA.r + circleB.r).toFixed(1)}`
      : `円同士 ${ev.cc ? "HIT" : "miss"} · A–箱 ${ev.ca.hit ? "HIT" : "miss"} · B–箱 ${ev.cb.hit ? "HIT" : "miss"}`
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
  selected = kind;
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
  syncControlsFromState();
});
canvas?.addEventListener("pointercancel", () => {
  drag = null;
  syncControlsFromState();
});

window.addEventListener("keydown", (e) => {
  if (!selected) return;
  const step = 1;
  let dx = 0;
  let dy = 0;
  if (e.key === "ArrowLeft") dx = -step;
  else if (e.key === "ArrowRight") dx = step;
  else if (e.key === "ArrowUp") dy = -step;
  else if (e.key === "ArrowDown") dy = step;
  else return;
  e.preventDefault();
  if (selected === "A") {
    circleA.x += dx;
    circleA.y += dy;
  } else if (selected === "B") {
    circleB.x += dx;
    circleB.y += dy;
  } else {
    box.x += dx;
    box.y += dy;
  }
  syncControlsFromState();
  draw();
});

function roundPos(n) {
  return Math.round(Number(n) || 0);
}

function syncControlsFromState() {
  if (arEl) arEl.value = String(circleA.r);
  if (brEl) brEl.value = String(circleB.r);
  if (boxwEl) boxwEl.value = String(box.w);
  if (boxhEl) boxhEl.value = String(box.h);
  if (arVal) arVal.textContent = String(circleA.r);
  if (brVal) brVal.textContent = String(circleB.r);
  if (boxwVal) boxwVal.textContent = String(box.w);
  if (boxhVal) boxhVal.textContent = String(box.h);
  if (axEl) axEl.value = String(roundPos(circleA.x));
  if (ayEl) ayEl.value = String(roundPos(circleA.y));
  if (bxEl) bxEl.value = String(roundPos(circleB.x));
  if (byEl) byEl.value = String(roundPos(circleB.y));
  if (boxxEl) boxxEl.value = String(roundPos(box.x));
  if (boxyEl) boxyEl.value = String(roundPos(box.y));
}

function applyControlsToState() {
  if (arEl) circleA.r = Number(arEl.value);
  if (brEl) circleB.r = Number(brEl.value);
  if (boxwEl) box.w = Number(boxwEl.value);
  if (boxhEl) box.h = Number(boxhEl.value);
  if (axEl) circleA.x = Number(axEl.value);
  if (ayEl) circleA.y = Number(ayEl.value);
  if (bxEl) circleB.x = Number(bxEl.value);
  if (byEl) circleB.y = Number(byEl.value);
  if (boxxEl) box.x = Number(boxxEl.value);
  if (boxyEl) box.y = Number(boxyEl.value);
}

function reset() {
  circleA = { ...C.circleA };
  circleB = { ...C.circleB };
  box = { ...C.box };
  drag = null;
  syncControlsFromState();
  draw();
  setStatus("リセット — 円や箱をドラッグ");
}

btnReset?.addEventListener("click", reset);
for (const el of [arEl, brEl, boxwEl, boxhEl]) {
  el?.addEventListener("input", () => {
    applyControlsToState();
    syncControlsFromState();
    draw();
  });
}
for (const el of [axEl, ayEl, bxEl, byEl, boxxEl, boxyEl]) {
  el?.addEventListener("change", () => {
    applyControlsToState();
    draw();
  });
}

loadTextSample(
  "../samples/CircleCollisionExample.cs",
  csharpSample,
  "// CircleCollisionExample.cs"
);

const urlSpec = {
  ax: { el: axEl, kind: "number" },
  ay: { el: ayEl, kind: "number" },
  ar: { el: arEl, kind: "range" },
  bx: { el: bxEl, kind: "number" },
  by: { el: byEl, kind: "number" },
  br: { el: brEl, kind: "range" },
  boxx: { el: boxxEl, kind: "number" },
  boxy: { el: boxyEl, kind: "number" },
  boxw: { el: boxwEl, kind: "range" },
  boxh: { el: boxhEl, kind: "range" },
};
syncControlsFromState();
mountShareLink({
  spec: urlSpec,
  button: document.getElementById("btn-copy-url"),
  statusEl: document.getElementById("status"),
});
const urlResult = applyParamsToControls(urlSpec);
applyControlsToState();
draw();
if (urlResult.warning) setStatus(urlResult.warning);
