/**
 * Swept AABB / TOI
 * @see docs/topics/swept-aabb/SPEC.md
 */
import { SWEPT_AABB_CONFIG as C } from "./maps/swept-aabb-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("sw-canvas")
);
const ctx = canvas.getContext("2d");
const vxEl = /** @type {HTMLInputElement} */ (document.getElementById("vx"));
const vyEl = /** @type {HTMLInputElement} */ (document.getElementById("vy"));
const modeEl = /** @type {HTMLSelectElement} */ (
  document.getElementById("mode")
);
const vxVal = document.getElementById("vx-val");
const vyVal = document.getElementById("vy-val");
const statsEl = document.getElementById("sw-stats");
const btnPlay = document.getElementById("btn-play");
const btnStep = document.getElementById("btn-step");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

let px = C.player.x;
let py = C.player.y;
const pw = C.player.w;
const ph = C.player.h;
const wall = { ...C.wall };
let lastT = 1;
let hit = false;
let tunneled = false;
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;

function readVx() {
  const v = Number(vxEl?.value) || 0;
  if (vxVal) vxVal.textContent = String(v);
  return v;
}
function readVy() {
  const v = Number(vyEl?.value) || 0;
  if (vyVal) vyVal.textContent = String(v);
  return v;
}

function aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

/**
 * Swept AABB vs static AABB. Returns first time of impact in [0,1] or null.
 * @param {number} ax
 * @param {number} ay
 * @param {number} aw
 * @param {number} ah
 * @param {number} vx  displacement this frame
 * @param {number} vy
 * @param {number} bx
 * @param {number} by
 * @param {number} bw
 * @param {number} bh
 */
export function sweptAabb(ax, ay, aw, ah, vx, vy, bx, by, bw, bh) {
  // Expand wall by player half-size → point vs expanded rect
  const ex = bx - aw;
  const ey = by - ah;
  const ew = bw + aw;
  const eh = bh + ah;
  // Ray from (ax,ay) with dir (vx,vy) against expanded AABB (slab)
  let tmin = 0;
  let tmax = 1;
  const o = [ax, ay];
  const d = [vx, vy];
  const min = [ex, ey];
  const max = [ex + ew, ey + eh];
  for (let i = 0; i < 2; i++) {
    if (Math.abs(d[i]) < 1e-12) {
      if (o[i] < min[i] || o[i] > max[i]) return null;
      continue;
    }
    let t1 = (min[i] - o[i]) / d[i];
    let t2 = (max[i] - o[i]) / d[i];
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmax < tmin) return null;
  }
  if (tmin < 0 || tmin > 1) return null;
  return tmin;
}

function stepFrame(dt) {
  const vx = readVx();
  const vy = readVy();
  const dx = vx * dt;
  const dy = vy * dt;
  const mode = modeEl?.value || "swept";
  hit = false;
  tunneled = false;
  lastT = 1;

  if (mode === "discrete") {
    px += dx;
    py += dy;
    if (aabbOverlap(px, py, pw, ph, wall.x, wall.y, wall.w, wall.h)) {
      hit = true;
      // push out simply
      px -= dx;
      py -= dy;
    } else {
      // check if we crossed wall without ending inside (tunnel)
      const midHit = aabbOverlap(
        px - dx * 0.5,
        py - dy * 0.5,
        pw,
        ph,
        wall.x,
        wall.y,
        wall.w,
        wall.h
      );
      // if start and end outside but path crosses - hard; use swept for detection
      const t = sweptAabb(px - dx, py - dy, pw, ph, dx, dy, wall.x, wall.y, wall.w, wall.h);
      if (t != null && t < 1 && !hit) {
        tunneled = true;
      }
    }
  } else {
    const t = sweptAabb(px, py, pw, ph, dx, dy, wall.x, wall.y, wall.w, wall.h);
    if (t != null) {
      hit = true;
      lastT = t;
      px += dx * t;
      py += dy * t;
    } else {
      px += dx;
      py += dy;
    }
  }

  // wrap vertical lightly / floor clamp
  if (py < 20) py = 20;
  if (py > canvas.height - ph - 20) py = canvas.height - ph - 20;
  if (px > canvas.width) {
    px = C.player.x;
    py = C.player.y;
    setStatus("右端到達 → リセット位置");
  }

  draw(dx, dy);
  renderStats();
}

function draw(dx, dy) {
  if (!ctx) return;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // swept volume ghost
  ctx.strokeStyle = "rgba(242, 204, 143, 0.4)";
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(px, py, pw + Math.abs(dx), ph + Math.abs(dy));
  ctx.setLineDash([]);

  // path
  ctx.strokeStyle = "rgba(91, 159, 212, 0.5)";
  ctx.beginPath();
  ctx.moveTo(px + pw / 2, py + ph / 2);
  ctx.lineTo(px + pw / 2 + dx, py + ph / 2 + dy);
  ctx.stroke();

  // wall
  ctx.fillStyle = "#3d4f66";
  ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
  ctx.strokeStyle = "#9aabbf";
  ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);

  // player
  ctx.fillStyle = hit ? "#e07a5f" : "#5b9fd4";
  ctx.fillRect(px, py, pw, ph);

  if (tunneled) {
    ctx.fillStyle = "#f2cc8f";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("トンネル！（離散では壁を抜けた）", 12, 28);
  }

  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("黄破線=移動スイープ · 速度を上げて離散 vs Swept を比較", 12, canvas.height - 12);
}

function renderStats() {
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>モード</td><td>${modeEl?.value || "swept"}</td></tr>
        <tr><td>TOI t</td><td>${hit ? lastT.toFixed(3) : "—"}</td></tr>
        <tr><td>ヒット</td><td>${hit ? "yes" : "no"}</td></tr>
        <tr><td>トンネル</td><td>${tunneled ? "YES" : "no"}</td></tr>
        <tr><td>v</td><td>(${readVx()}, ${readVy()})</td></tr>
      </table>`;
  }
}

function loop(ts) {
  if (!running) return;
  if (!lastTs) lastTs = ts;
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (dt > 0.05) dt = 0.05;
  stepFrame(dt);
  rafId = requestAnimationFrame(loop);
}

function stop() {
  running = false;
  if (rafId != null) cancelAnimationFrame(rafId);
  rafId = null;
  if (btnPlay) btnPlay.textContent = "再生";
}

function reset() {
  stop();
  px = C.player.x;
  py = C.player.y;
  hit = false;
  tunneled = false;
  lastT = 1;
  if (vxEl) vxEl.value = String(C.defaultVx);
  if (vyEl) vyEl.value = String(C.defaultVy);
  readVx();
  readVy();
  draw(0, 0);
  renderStats();
  setStatus("リセット — 速度を上げて貫通を観察");
}

btnPlay?.addEventListener("click", () => {
  if (running) {
    stop();
    return;
  }
  running = true;
  lastTs = 0;
  if (btnPlay) btnPlay.textContent = "一時停止";
  rafId = requestAnimationFrame(loop);
});
btnStep?.addEventListener("click", () => {
  stop();
  stepFrame(1 / 30);
});
btnReset?.addEventListener("click", reset);
for (const el of [vxEl, vyEl, modeEl]) {
  el?.addEventListener("input", () => {
    readVx();
    readVy();
    renderStats();
  });
}

loadTextSample(
  "../samples/SweptAabbExample.cs",
  csharpSample,
  "// SweptAabbExample.cs"
);
reset();
