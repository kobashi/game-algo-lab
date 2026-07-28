/**
 * Boids — 分離・整列・結合
 * @see docs/topics/boids/SPEC.md
 */
import { BOIDS_CONFIG as C } from "./maps/boids-config.js";
import {
  createStatus,
  loadTextSample,
  mulberry32,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("bo-canvas")
);
const ctx = canvas.getContext("2d");
const nEl = /** @type {HTMLInputElement} */ (document.getElementById("count-n"));
const percEl = /** @type {HTMLInputElement} */ (
  document.getElementById("perception")
);
const sepEl = /** @type {HTMLInputElement} */ (document.getElementById("w-sep"));
const aliEl = /** @type {HTMLInputElement} */ (document.getElementById("w-ali"));
const cohEl = /** @type {HTMLInputElement} */ (document.getElementById("w-coh"));
const onSep = /** @type {HTMLInputElement} */ (document.getElementById("on-sep"));
const onAli = /** @type {HTMLInputElement} */ (document.getElementById("on-ali"));
const onCoh = /** @type {HTMLInputElement} */ (document.getElementById("on-coh"));
const nVal = document.getElementById("n-val");
const percVal = document.getElementById("perc-val");
const sepVal = document.getElementById("sep-val");
const aliVal = document.getElementById("ali-val");
const cohVal = document.getElementById("coh-val");
const statsEl = document.getElementById("bo-stats");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/**
 * @typedef {{ x: number, y: number, vx: number, vy: number }} Boid
 * @type {Boid[]}
 */
let boids = [];
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;

function readN() {
  const n = Math.floor(Number(nEl?.value) || C.defaultN);
  if (nVal) nVal.textContent = String(n);
  return Math.min(120, Math.max(5, n));
}
function readPerc() {
  const v = Number(percEl?.value) || C.defaultPerception;
  if (percVal) percVal.textContent = String(v);
  return v;
}
function readW() {
  const sep = Number(sepEl?.value) || C.defaultSep;
  const ali = Number(aliEl?.value) || C.defaultAli;
  const coh = Number(cohEl?.value) || C.defaultCoh;
  if (sepVal) sepVal.textContent = sep.toFixed(1);
  if (aliVal) aliVal.textContent = ali.toFixed(1);
  if (cohVal) cohVal.textContent = coh.toFixed(1);
  return { sep, ali, coh };
}

function spawn(n) {
  const rng = mulberry32(5 + n);
  boids = [];
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2;
    boids.push({
      x: rng() * canvas.width,
      y: rng() * canvas.height,
      vx: Math.cos(a) * C.maxSpeed * 0.5,
      vy: Math.sin(a) * C.maxSpeed * 0.5,
    });
  }
}

function clampMag(x, y, max) {
  const m = Math.hypot(x, y);
  if (m > max && m > 1e-9) return { x: (x / m) * max, y: (y / m) * max };
  return { x, y };
}

/**
 * @param {Boid} b
 * @param {Boid[]} flock
 * @param {number} perc
 * @param {{sep:number,ali:number,coh:number}} w
 */
export function boidForces(b, flock, perc, w) {
  let sx = 0;
  let sy = 0;
  let ax = 0;
  let ay = 0;
  let cx = 0;
  let cy = 0;
  let count = 0;
  for (const o of flock) {
    if (o === b) continue;
    const dx = o.x - b.x;
    const dy = o.y - b.y;
    // wrap-aware rough distance (toroidal-ish via min axis? keep simple Euclidean + wrap positions)
    let d = Math.hypot(dx, dy);
    if (d > 0 && d < perc) {
      count += 1;
      // separation: away from neighbor
      sx -= dx / d;
      sy -= dy / d;
      ax += o.vx;
      ay += o.vy;
      cx += o.x;
      cy += o.y;
    }
  }
  let fx = 0;
  let fy = 0;
  if (count > 0) {
    if (onSep?.checked) {
      const s = clampMag(sx, sy, C.maxForce);
      fx += s.x * w.sep;
      fy += s.y * w.sep;
    }
    if (onAli?.checked) {
      ax /= count;
      ay /= count;
      const a = clampMag(ax - b.vx, ay - b.vy, C.maxForce);
      fx += a.x * w.ali;
      fy += a.y * w.ali;
    }
    if (onCoh?.checked) {
      cx = cx / count - b.x;
      cy = cy / count - b.y;
      const c = clampMag(cx, cy, C.maxForce);
      // cohesion as seek-ish
      const cl = clampMag(c.x - b.vx * 0.1, c.y - b.vy * 0.1, C.maxForce);
      fx += cl.x * w.coh;
      fy += cl.y * w.coh;
    }
  }
  return clampMag(fx, fy, C.maxForce);
}

function step(dt) {
  const perc = readPerc();
  const w = readW();
  const forces = boids.map((b) => boidForces(b, boids, perc, w));
  for (let i = 0; i < boids.length; i++) {
    const b = boids[i];
    const f = forces[i];
    b.vx += f.x * dt;
    b.vy += f.y * dt;
    const cl = clampMag(b.vx, b.vy, C.maxSpeed);
    b.vx = cl.x;
    b.vy = cl.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.x < 0) b.x += canvas.width;
    if (b.x > canvas.width) b.x -= canvas.width;
    if (b.y < 0) b.y += canvas.height;
    if (b.y > canvas.height) b.y -= canvas.height;
  }
  draw();
  renderStats();
}

function draw() {
  if (!ctx) return;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const b of boids) {
    const ang = Math.atan2(b.vy, b.vx);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(ang);
    ctx.fillStyle = "#5b9fd4";
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-6, 4);
    ctx.lineTo(-6, -4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // highlight one boid perception
  if (boids[0]) {
    ctx.strokeStyle = "rgba(242, 204, 143, 0.35)";
    ctx.beginPath();
    ctx.arc(boids[0].x, boids[0].y, readPerc(), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("黄円=代表個体の知覚半径 · 力を ON/OFF して群れの変化を見る", 12, 18);
}

function renderStats() {
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>n</td><td>${boids.length}</td></tr>
        <tr><td>知覚</td><td>${readPerc()}</td></tr>
        <tr><td>力</td><td>${[
          onSep?.checked ? "分離" : null,
          onAli?.checked ? "整列" : null,
          onCoh?.checked ? "結合" : null,
        ]
          .filter(Boolean)
          .join("·") || "なし"}</td></tr>
      </table>`;
  }
  setStatus(`boids=${boids.length}`);
}

function loop(ts) {
  if (!running) return;
  if (!lastTs) lastTs = ts;
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (dt > 0.05) dt = 0.05;
  step(dt);
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
  if (nEl) nEl.value = String(C.defaultN);
  if (percEl) percEl.value = String(C.defaultPerception);
  if (sepEl) sepEl.value = String(C.defaultSep);
  if (aliEl) aliEl.value = String(C.defaultAli);
  if (cohEl) cohEl.value = String(C.defaultCoh);
  readN();
  readPerc();
  readW();
  spawn(readN());
  draw();
  renderStats();
  setStatus("リセット");
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
nEl?.addEventListener("change", () => {
  spawn(readN());
  draw();
  renderStats();
});
for (const el of [percEl, sepEl, aliEl, cohEl, onSep, onAli, onCoh]) {
  el?.addEventListener("input", () => {
    readPerc();
    readW();
    renderStats();
  });
}

loadTextSample("../samples/BoidsExample.cs", csharpSample, "// BoidsExample.cs");
reset();
