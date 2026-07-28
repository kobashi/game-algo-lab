/**
 * 総当たり O(n²)
 * @see docs/topics/brute-force-pairs/SPEC.md
 */
import { BRUTE_FORCE_PAIRS_CONFIG as C } from "./maps/brute-force-pairs-config.js";
import {
  createStatus,
  loadTextSample,
  mulberry32,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("bf-canvas")
);
const ctx = canvas.getContext("2d");
const nEl = /** @type {HTMLInputElement} */ (document.getElementById("count-n"));
const nVal = document.getElementById("n-val");
const statsEl = document.getElementById("bf-stats");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/**
 * @typedef {{ x: number, y: number, vx: number, vy: number, r: number }} Body
 * @type {Body[]}
 */
let bodies = [];
let checks = 0;
let hits = 0;
/** @type {[number, number][]} */
let hitPairs = [];
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;

function readN() {
  const n = Math.min(
    C.maxN,
    Math.max(C.minN, Math.floor(Number(nEl?.value) || C.defaultN))
  );
  if (nVal) nVal.textContent = String(n);
  return n;
}

function spawn(n) {
  const rng = mulberry32(42 + n * 17);
  bodies = [];
  for (let i = 0; i < n; i++) {
    const ang = rng() * Math.PI * 2;
    const sp = C.speed * (0.5 + rng());
    bodies.push({
      x: 40 + rng() * (canvas.width - 80),
      y: 40 + rng() * (canvas.height - 80),
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      r: C.radius,
    });
  }
}

/**
 * @param {Body[]} list
 */
export function bruteForcePairs(list) {
  let c = 0;
  let h = 0;
  /** @type {[number, number][]} */
  const pairs = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      c += 1;
      const dx = list[j].x - list[i].x;
      const dy = list[j].y - list[i].y;
      const rr = list[i].r + list[j].r;
      if (dx * dx + dy * dy <= rr * rr) {
        h += 1;
        pairs.push([i, j]);
      }
    }
  }
  return { checks: c, hits: h, pairs };
}

function step(dt) {
  for (const b of bodies) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.x < b.r) {
      b.x = b.r;
      b.vx = Math.abs(b.vx);
    }
    if (b.x > canvas.width - b.r) {
      b.x = canvas.width - b.r;
      b.vx = -Math.abs(b.vx);
    }
    if (b.y < b.r) {
      b.y = b.r;
      b.vy = Math.abs(b.vy);
    }
    if (b.y > canvas.height - b.r) {
      b.y = canvas.height - b.r;
      b.vy = -Math.abs(b.vy);
    }
  }
  const res = bruteForcePairs(bodies);
  checks = res.checks;
  hits = res.hits;
  hitPairs = res.pairs;
  draw();
  renderStats();
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(224, 122, 95, 0.55)";
  ctx.lineWidth = 1;
  for (const [i, j] of hitPairs) {
    ctx.beginPath();
    ctx.moveTo(bodies[i].x, bodies[i].y);
    ctx.lineTo(bodies[j].x, bodies[j].y);
    ctx.stroke();
  }

  for (const b of bodies) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(91, 159, 212, 0.55)";
    ctx.fill();
  }

  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText(`全ペア検査 n(n−1)/2 · 赤線=重なり`, 12, 18);
}

function renderStats() {
  const n = bodies.length;
  const expected = (n * (n - 1)) / 2;
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>n</td><td>${n}</td></tr>
        <tr><td>検査回数</td><td>${checks} <span class="footer-muted">(= ${expected})</span></td></tr>
        <tr><td>重なり</td><td>${hits}</td></tr>
        <tr><td>計算量</td><td>O(n²)</td></tr>
      </table>`;
  }
  setStatus(`checks=${checks} hits=${hits} n=${n}`);
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
  spawn(readN());
  const res = bruteForcePairs(bodies);
  checks = res.checks;
  hits = res.hits;
  hitPairs = res.pairs;
  draw();
  renderStats();
  setStatus("リセット — n を変えて検査回数の伸びを見る");
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
nEl?.addEventListener("input", () => {
  readN();
  reset();
});

loadTextSample(
  "../samples/BruteForcePairsExample.cs",
  csharpSample,
  "// BruteForcePairsExample.cs"
);
if (nEl) nEl.value = String(C.defaultN);
reset();
