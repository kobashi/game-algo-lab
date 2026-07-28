/**
 * Dirty Flag — 変換キャッシュ
 */
import { DIRTY_FLAG_CONFIG as C } from "./maps/dirty-flag-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("df-canvas")
);
const ctx = canvas.getContext("2d");
const statsEl = document.getElementById("df-stats");
const autoEl = /** @type {HTMLInputElement} */ (
  document.getElementById("auto-rotate")
);
const btnDirty = document.getElementById("btn-dirty");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/**
 * @typedef {{
 *   name: string,
 *   localRot: number,
 *   dirty: boolean,
 *   worldRot: number,
 *   recomputeCount: number,
 * }} Node
 */

/** @type {Node[]} */
let nodes = [];
let frames = 0;
let naiveRecomputes = 0;
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;

/**
 * Mark node dirty (and cascade to children conceptually).
 * @param {Node[]} list
 * @param {number} i
 */
export function markDirty(list, i) {
  for (let j = i; j < list.length; j++) list[j].dirty = true;
}

/**
 * Recompute world rotation if dirty. Parent world is previous node.
 * @returns {number} recomputes this call (0 or 1 per node visited clean/dirty)
 */
export function ensureWorld(list) {
  let recomputes = 0;
  let parentWorld = 0;
  for (let i = 0; i < list.length; i++) {
    const n = list[i];
    if (n.dirty) {
      n.worldRot = parentWorld + n.localRot;
      n.dirty = false;
      n.recomputeCount += 1;
      recomputes += 1;
    }
    parentWorld = n.worldRot;
  }
  return recomputes;
}

function reset() {
  nodes = [];
  for (let i = 0; i < C.childCount; i++) {
    nodes.push({
      name: i === 0 ? "root" : `child${i}`,
      localRot: i * 0.3,
      dirty: true,
      worldRot: 0,
      recomputeCount: 0,
    });
  }
  frames = 0;
  naiveRecomputes = 0;
  ensureWorld(nodes);
  draw();
  setStatus("リセット — dirty 時のみ再計算");
}

function tick(dt) {
  frames += 1;
  // naive: always recompute all
  naiveRecomputes += nodes.length;

  if (autoEl?.checked) {
    nodes[0].localRot += dt * 0.8;
    markDirty(nodes, 0);
  }
  const r = ensureWorld(nodes);
  draw();
  setStatus(
    `frame ${frames} · 今回再計算 ${r} · 累計 dirty方式 ${nodes.reduce((s, n) => s + n.recomputeCount, 0)} / 毎フレ全計算 ${naiveRecomputes}`
  );
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  const cx = W * 0.35;
  const cy = H * 0.55;
  let x = cx;
  let y = cy;
  let ang = 0;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    ang = n.worldRot;
    const len = 70;
    const x2 = x + Math.cos(ang) * len;
    const y2 = y + Math.sin(ang) * len;
    ctx.strokeStyle = n.dirty ? "#e07a5f" : "#6bcb8f";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = "#e8eef7";
    ctx.font = "11px sans-serif";
    ctx.fillText(
      `${n.name} ${n.dirty ? "DIRTY" : "clean"}`,
      x2 - 20,
      y2 - 8
    );
    x = x2;
    y = y2;
  }

  // bars
  const dirtyTotal = nodes.reduce((s, n) => s + n.recomputeCount, 0);
  const max = Math.max(naiveRecomputes, dirtyTotal, 1);
  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("累計行列再計算", W * 0.58, 40);
  ctx.fillStyle = "#e07a5f";
  ctx.fillRect(W * 0.58, 50, 160 * (naiveRecomputes / max), 18);
  ctx.fillStyle = "#e8eef7";
  ctx.fillText(`毎フレ全計算 ${naiveRecomputes}`, W * 0.58, 80);
  ctx.fillStyle = "#6bcb8f";
  ctx.fillRect(W * 0.58, 100, 160 * (dirtyTotal / max), 18);
  ctx.fillStyle = "#e8eef7";
  ctx.fillText(`dirty 方式 ${dirtyTotal}`, W * 0.58, 130);

  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        ${nodes
          .map(
            (n) =>
              `<tr><td>${n.name}</td><td>${n.dirty ? "DIRTY" : "clean"}</td><td>再計算 ${n.recomputeCount}</td><td>θ=${n.worldRot.toFixed(2)}</td></tr>`
          )
          .join("")}
        <tr><td colspan="2">節約率</td><td colspan="2">${(
          (1 - dirtyTotal / Math.max(1, naiveRecomputes)) *
          100
        ).toFixed(0)}%</td></tr>
      </table>`;
  }
}

function loop(ts) {
  if (!running) return;
  if (!lastTs) lastTs = ts;
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (dt > 0.05) dt = 0.05;
  tick(dt);
  rafId = requestAnimationFrame(loop);
}

btnDirty?.addEventListener("click", () => {
  nodes[1].localRot += 0.4;
  markDirty(nodes, 1);
  ensureWorld(nodes);
  draw();
  setStatus("child1 を回転 → 子孫を dirty");
});
btnPlay?.addEventListener("click", () => {
  if (running) {
    running = false;
    if (rafId != null) cancelAnimationFrame(rafId);
    if (btnPlay) btnPlay.textContent = "再生";
    return;
  }
  running = true;
  lastTs = 0;
  if (btnPlay) btnPlay.textContent = "一時停止";
  rafId = requestAnimationFrame(loop);
});
btnReset?.addEventListener("click", () => {
  running = false;
  if (rafId != null) cancelAnimationFrame(rafId);
  if (btnPlay) btnPlay.textContent = "再生";
  reset();
});

loadTextSample(
  "../samples/DirtyFlagExample.cs",
  csharpSample,
  "// DirtyFlagExample.cs"
);
reset();
