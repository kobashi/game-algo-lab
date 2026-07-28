/**
 * 凹形状の凸分割（複合コライダー）
 */
import { CONCAVE_COMPOUND_CONFIG as C } from "./maps/concave-compound-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("ccx-canvas")
);
const ctx = canvas.getContext("2d");
const showUnion = /** @type {HTMLInputElement} */ (
  document.getElementById("show-union")
);
const showParts = /** @type {HTMLInputElement} */ (
  document.getElementById("show-parts")
);
const statsEl = document.getElementById("ccx-stats");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

let probe = { x: 300, y: 200, r: 10 };
let dragging = false;

function inAabb(px, py, p) {
  return px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h;
}

export function pointInCompound(px, py, parts) {
  return parts.some((p) => inAabb(px, py, p));
}

function unionAabb(parts) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of parts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + p.w);
    maxY = Math.max(maxY, p.y + p.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function draw() {
  if (!ctx) return;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const uni = unionAabb(C.parts);
  if (showUnion?.checked) {
    ctx.strokeStyle = "rgba(242, 204, 143, 0.7)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(uni.x, uni.y, uni.w, uni.h);
    ctx.setLineDash([]);
  }

  if (showParts?.checked) {
    for (const p of C.parts) {
      ctx.fillStyle = "rgba(91, 159, 212, 0.25)";
      ctx.strokeStyle = "#5b9fd4";
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    }
  }

  // outline L
  ctx.strokeStyle = "#6bcb8f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  const o = C.outline;
  ctx.moveTo(o[0][0], o[0][1]);
  for (let i = 1; i < o.length; i++) ctx.lineTo(o[i][0], o[i][1]);
  ctx.closePath();
  ctx.stroke();

  const hitCompound = pointInCompound(probe.x, probe.y, C.parts);
  const hitUnion = inAabb(probe.x, probe.y, uni);

  ctx.fillStyle = hitCompound ? "#e07a5f" : "#9aabbf";
  ctx.beginPath();
  ctx.arc(probe.x, probe.y, probe.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText(
    "緑=凹アウトライン · 青=凸部品 · 黄破線=単一 AABB（誤ヒット領域あり）",
    12,
    18
  );

  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>複合コライダー</td><td>${hitCompound ? "HIT" : "miss"}</td></tr>
        <tr><td>外接 AABB</td><td>${hitUnion ? "HIT" : "miss"}</td></tr>
        <tr><td>誤ヒット?</td><td>${hitUnion && !hitCompound ? "YES（凹の欠部）" : "no"}</td></tr>
      </table>`;
  }
  setStatus(
    hitUnion && !hitCompound
      ? "外接 AABB は当たるが実体は無い — 複合が必要"
      : hitCompound
        ? "複合ヒット"
        : "miss"
  );
}

function pointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) * canvas.width) / rect.width,
    y: ((e.clientY - rect.top) * canvas.height) / rect.height,
  };
}

canvas?.addEventListener("pointerdown", (e) => {
  dragging = true;
  const p = pointerPos(e);
  probe.x = p.x;
  probe.y = p.y;
  canvas.setPointerCapture(e.pointerId);
  draw();
});
canvas?.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const p = pointerPos(e);
  probe.x = p.x;
  probe.y = p.y;
  draw();
});
canvas?.addEventListener("pointerup", () => {
  dragging = false;
});

for (const el of [showUnion, showParts]) {
  el?.addEventListener("change", draw);
}

loadTextSample(
  "../samples/ConcaveCompoundExample.cs",
  csharpSample,
  "// ConcaveCompoundExample.cs"
);
draw();
