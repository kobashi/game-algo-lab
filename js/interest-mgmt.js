/**
 * 関心管理（AOI）— 視野内エンティティだけ送信
 */
import { INTEREST_MGMT_CONFIG as C } from "./maps/interest-mgmt-config.js";
import {
  createStatus,
  loadTextSample,
  mulberry32,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("aoi-canvas")
);
const ctx = canvas.getContext("2d");
const radEl = /** @type {HTMLInputElement} */ (document.getElementById("aoi-r"));
const countEl = /** @type {HTMLInputElement} */ (
  document.getElementById("ent-count")
);
const radVal = document.getElementById("rad-val");
const countVal = document.getElementById("count-val");
const statsEl = document.getElementById("aoi-stats");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/**
 * @typedef {{ id: number, x: number, y: number, vx: number, vy: number }} Ent
 */

/** viewer / local player */
let viewer = { x: C.worldW / 2, y: C.worldH / 2 };
/** @type {Ent[]} */
let ents = [];
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
let tickAcc = 0;
let bytesSent = 0;
let lastBps = 0;
let bpsWindow = 0;
let bpsBytes = 0;
/** @type {Set<string>} */
const keys = new Set();
let rng = mulberry32(7);

function readR() {
  return Math.floor(Number(radEl?.value) || C.defaultAoiRadius);
}
function readCount() {
  return Math.floor(Number(countEl?.value) || C.entityCount);
}

function syncLabels() {
  if (radVal) radVal.textContent = String(readR());
  if (countVal) countVal.textContent = String(readCount());
}

/**
 * Entities inside AOI circle around viewer.
 * @param {Ent[]} list
 * @param {{x:number,y:number}} v
 * @param {number} r
 */
export function filterAoi(list, v, r) {
  const r2 = r * r;
  return list.filter((e) => {
    const dx = e.x - v.x;
    const dy = e.y - v.y;
    return dx * dx + dy * dy <= r2;
  });
}

/**
 * @param {number} n
 * @param {() => number} rand
 */
export function spawnEntities(n, rand) {
  /** @type {Ent[]} */
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({
      id: i,
      x: 30 + rand() * (C.worldW - 60),
      y: 30 + rand() * (C.worldH - 60),
      vx: (rand() - 0.5) * 80,
      vy: (rand() - 0.5) * 80,
    });
  }
  return out;
}

function rebuild() {
  rng = mulberry32(7);
  ents = spawnEntities(readCount(), rng);
  bytesSent = 0;
  lastBps = 0;
  bpsWindow = 0;
  bpsBytes = 0;
}

function stepEntities(dt) {
  for (const e of ents) {
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (e.x < 20 || e.x > C.worldW - 20) e.vx *= -1;
    if (e.y < 20 || e.y > C.worldH - 20) e.vy *= -1;
    e.x = Math.max(20, Math.min(C.worldW - 20, e.x));
    e.y = Math.max(20, Math.min(C.worldH - 20, e.y));
  }
}

function moveViewer(dt) {
  let dx = 0;
  let dy = 0;
  if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) dx -= 1;
  if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) dx += 1;
  if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) dy -= 1;
  if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) dy += 1;
  const sp = 160;
  viewer.x = Math.max(20, Math.min(C.worldW - 20, viewer.x + dx * sp * dt));
  viewer.y = Math.max(20, Math.min(C.worldH - 20, viewer.y + dy * sp * dt));
}

/**
 * Network tick: send only AOI entities.
 * @returns {{ sent: number, total: number, bytes: number }}
 */
export function networkTick(list, v, r, bytesEach) {
  const inside = filterAoi(list, v, r);
  return {
    sent: inside.length,
    total: list.length,
    bytes: inside.length * bytesEach,
  };
}

function onNetTick() {
  const r = networkTick(ents, viewer, readR(), C.bytesPerEntity);
  bytesSent += r.bytes;
  bpsBytes += r.bytes;
  return r;
}

function tick(dt) {
  moveViewer(dt);
  stepEntities(dt);
  tickAcc += dt;
  bpsWindow += dt;
  const period = 1 / C.tickHz;
  let last = { sent: 0, total: ents.length, bytes: 0 };
  while (tickAcc >= period) {
    tickAcc -= period;
    last = onNetTick();
  }
  if (bpsWindow >= 1) {
    lastBps = bpsBytes / bpsWindow;
    bpsBytes = 0;
    bpsWindow = 0;
  }
  const fullBps = ents.length * C.bytesPerEntity * C.tickHz;
  draw(last);
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>全体</td><td>${ents.length}</td></tr>
        <tr><td>AOI 内（送信）</td><td>${last.sent}</td></tr>
        <tr><td>tick バイト</td><td>${last.bytes}</td></tr>
        <tr><td>実効 B/s</td><td>${lastBps.toFixed(0)}</td></tr>
        <tr><td>全送信なら B/s</td><td>${fullBps}</td></tr>
        <tr><td>削減率</td><td>${fullBps ? ((1 - lastBps / fullBps) * 100).toFixed(0) : 0}%</td></tr>
      </table>`;
  }
  setStatus(
    `AOI r=${readR()} · 送信 ${last.sent}/${ents.length} · WASD で視点移動`
  );
}

function draw(last) {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  const r = readR();
  // AOI circle
  ctx.strokeStyle = "rgba(107, 203, 143, 0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(viewer.x, viewer.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = "rgba(107, 203, 143, 0.08)";
  ctx.beginPath();
  ctx.arc(viewer.x, viewer.y, r, 0, Math.PI * 2);
  ctx.fill();

  const inside = new Set(filterAoi(ents, viewer, r).map((e) => e.id));
  for (const e of ents) {
    const on = inside.has(e.id);
    ctx.fillStyle = on ? "#5b9fd4" : "rgba(90, 106, 128, 0.45)";
    ctx.beginPath();
    ctx.arc(e.x, e.y, on ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // viewer
  ctx.fillStyle = "#e07a5f";
  ctx.beginPath();
  ctx.arc(viewer.x, viewer.y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8eef7";
  ctx.font = "11px sans-serif";
  ctx.fillText("YOU", viewer.x - 12, viewer.y - 14);
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

function reset() {
  running = false;
  if (rafId != null) cancelAnimationFrame(rafId);
  if (btnPlay) btnPlay.textContent = "再生";
  viewer = { x: C.worldW / 2, y: C.worldH / 2 };
  rebuild();
  tickAcc = 0;
  draw({ sent: 0, total: ents.length, bytes: 0 });
  syncLabels();
  setStatus("リセット");
}

radEl?.addEventListener("input", () => {
  syncLabels();
  if (!running) draw({ sent: filterAoi(ents, viewer, readR()).length, total: ents.length, bytes: 0 });
});
countEl?.addEventListener("input", () => {
  syncLabels();
  rebuild();
  draw({ sent: 0, total: ents.length, bytes: 0 });
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
btnReset?.addEventListener("click", reset);

window.addEventListener("keydown", (e) => {
  keys.add(e.key);
});
window.addEventListener("keyup", (e) => {
  keys.delete(e.key);
});

loadTextSample(
  "../samples/InterestMgmtExample.cs",
  csharpSample,
  "// InterestMgmtExample.cs"
);
canvas.width = C.worldW;
canvas.height = C.worldH;
rebuild();
syncLabels();
draw({ sent: 0, total: ents.length, bytes: 0 });
setStatus("再生 · 青=送信対象 · 灰=関心外 · WASD/矢印で移動");
