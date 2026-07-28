/**
 * プロファイリング循環
 */
import { PROFILING_LOOP_CONFIG as C } from "./maps/profiling-loop-config.js";
import {
  createStatus,
  loadTextSample,
  mulberry32,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("pf-canvas")
);
const ctx = canvas.getContext("2d");
const nEl = /** @type {HTMLInputElement} */ (document.getElementById("count-n"));
const modeEl = /** @type {HTMLSelectElement} */ (
  document.getElementById("collide-mode")
);
const nVal = document.getElementById("n-val");
const barsEl = document.getElementById("pf-bars");
const histEl = document.getElementById("pf-hist");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/**
 * @typedef {{ x:number,y:number,vx:number,vy:number,r:number }} Body
 * @type {Body[]}
 */
let bodies = [];
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
/** @type {{ update: number, collide: number, draw: number, total: number, mode: string }[]} */
let samples = [];

function readN() {
  const n = Math.floor(Number(nEl?.value) || C.defaultN);
  if (nVal) nVal.textContent = String(n);
  return Math.min(120, Math.max(8, n));
}

function spawn(n) {
  const rng = mulberry32(9 + n);
  bodies = [];
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2;
    bodies.push({
      x: 40 + rng() * (canvas.width - 80),
      y: 40 + rng() * (canvas.height - 80),
      vx: Math.cos(a) * 50,
      vy: Math.sin(a) * 50,
      r: C.radius,
    });
  }
}

function updateBodies(dt) {
  for (const b of bodies) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.x < b.r || b.x > canvas.width - b.r) b.vx *= -1;
    if (b.y < b.r || b.y > canvas.height - b.r) b.vy *= -1;
  }
}

function collideBrute() {
  let hits = 0;
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const dx = bodies[j].x - bodies[i].x;
      const dy = bodies[j].y - bodies[i].y;
      const rr = bodies[i].r + bodies[j].r;
      if (dx * dx + dy * dy <= rr * rr) hits += 1;
    }
  }
  return hits;
}

function collideGrid() {
  const cell = C.cell;
  /** @type {Map<string, number[]>} */
  const map = new Map();
  for (let i = 0; i < bodies.length; i++) {
    const cx = Math.floor(bodies[i].x / cell);
    const cy = Math.floor(bodies[i].y / cell);
    const k = `${cx},${cy}`;
    if (!map.has(k)) map.set(k, []);
    map.get(k)?.push(i);
  }
  let hits = 0;
  const seen = new Set();
  for (let i = 0; i < bodies.length; i++) {
    const cx = Math.floor(bodies[i].x / cell);
    const cy = Math.floor(bodies[i].y / cell);
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const arr = map.get(`${cx + ox},${cy + oy}`);
        if (!arr) continue;
        for (const j of arr) {
          if (j <= i) continue;
          const pk = `${i},${j}`;
          if (seen.has(pk)) continue;
          seen.add(pk);
          const dx = bodies[j].x - bodies[i].x;
          const dy = bodies[j].y - bodies[i].y;
          const rr = bodies[i].r + bodies[j].r;
          if (dx * dx + dy * dy <= rr * rr) hits += 1;
        }
      }
    }
  }
  return hits;
}

function drawScene() {
  if (!ctx) return;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const b of bodies) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(91,159,212,0.55)";
    ctx.fill();
  }
}

function renderBars(prof) {
  if (!barsEl) return;
  const max = Math.max(prof.total, 0.001);
  const row = (name, ms, color) => {
    const pct = Math.min(100, (ms / max) * 100);
    return `<div class="pf-row"><span>${name}</span>
      <div class="pf-bar"><i style="width:${pct}%;background:${color}"></i></div>
      <span class="pf-ms">${ms.toFixed(2)} ms</span></div>`;
  };
  barsEl.innerHTML =
    row("update", prof.update, "#5b9fd4") +
    row("collide", prof.collide, "#e07a5f") +
    row("draw", prof.draw, "#6bcb8f") +
    `<p class="footer-muted">合計 ${prof.total.toFixed(2)} ms · モード ${prof.mode}</p>`;
}

function renderHist() {
  if (!histEl || samples.length < 2) return;
  const last = samples[samples.length - 1];
  const prev = samples[samples.length - 2];
  if (prev.mode !== last.mode) {
    histEl.innerHTML = `<p class="result-note">直前: <strong>${prev.mode}</strong> ${prev.total.toFixed(2)} ms → 今: <strong>${last.mode}</strong> ${last.total.toFixed(2)} ms
      （比 ${(last.total / Math.max(0.001, prev.total)).toFixed(2)}x）</p>`;
  }
}

function frame(dt) {
  const t0 = performance.now();
  updateBodies(dt);
  const t1 = performance.now();
  const mode = modeEl?.value || "brute";
  if (mode === "grid") collideGrid();
  else collideBrute();
  const t2 = performance.now();
  drawScene();
  const t3 = performance.now();
  const prof = {
    update: t1 - t0,
    collide: t2 - t1,
    draw: t3 - t2,
    total: t3 - t0,
    mode,
  };
  samples.push(prof);
  if (samples.length > 90) samples.shift();
  // average last 30
  const slice = samples.slice(-30);
  const avg = {
    update: slice.reduce((s, x) => s + x.update, 0) / slice.length,
    collide: slice.reduce((s, x) => s + x.collide, 0) / slice.length,
    draw: slice.reduce((s, x) => s + x.draw, 0) / slice.length,
    total: 0,
    mode,
  };
  avg.total = avg.update + avg.collide + avg.draw;
  renderBars(avg);
  renderHist();
  setStatus(`${mode} · ~${avg.total.toFixed(2)} ms/frame (avg30)`);
}

function loop(ts) {
  if (!running) return;
  if (!lastTs) lastTs = ts;
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (dt > 0.05) dt = 0.05;
  frame(dt);
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
  spawn(readN());
  samples = [];
  drawScene();
  if (barsEl) barsEl.innerHTML = "";
  if (histEl) histEl.innerHTML = "";
  setStatus("リセット — 総当たりとグリッドを切り替えて再測定");
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
btnReset?.addEventListener("click", reset);
nEl?.addEventListener("change", reset);
modeEl?.addEventListener("change", () => {
  samples.push({
    update: 0,
    collide: 0,
    draw: 0,
    total: 0,
    mode: `switch→${modeEl.value}`,
  });
  setStatus(`モード変更: ${modeEl.value} — 数秒測って比較`);
});

loadTextSample(
  "../samples/ProfilingLoopExample.cs",
  csharpSample,
  "// ProfilingLoopExample.cs"
);
if (nEl) nEl.value = String(C.defaultN);
reset();
