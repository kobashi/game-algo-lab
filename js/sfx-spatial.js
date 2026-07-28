/**
 * 距離減衰 + ステレオパン
 */
import { SFX_SPATIAL_CONFIG as C } from "./maps/sfx-spatial-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("sp-canvas")
);
const ctx2d = canvas.getContext("2d");
const statsEl = document.getElementById("sp-stats");
const muteEl = /** @type {HTMLInputElement} */ (
  document.getElementById("mute")
);
const btnPlay = document.getElementById("btn-play");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

const listener = { x: canvas.width / 2, y: canvas.height / 2 };
const source = { x: canvas.width * 0.72, y: canvas.height * 0.35 };
let dragging = false;
/** @type {AudioContext | null} */
let ac = null;

/**
 * Linear falloff then clamp. pan in [-1,1] from relative x.
 * @returns {{ dist: number, gain: number, pan: number }}
 */
export function spatialParams(sx, sy, lx, ly, refDist, maxDist) {
  const dx = sx - lx;
  const dy = sy - ly;
  const dist = Math.hypot(dx, dy);
  let gain = 1;
  if (dist > refDist) {
    gain = 1 - (dist - refDist) / (maxDist - refDist);
  }
  gain = Math.max(0, Math.min(1, gain));
  const pan = Math.max(-1, Math.min(1, dx / (maxDist * 0.55)));
  return { dist, gain, pan };
}

function ensureAc() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ac = new AC();
  }
  if (ac?.state === "suspended") ac.resume();
  return ac;
}

function playOnce() {
  const p = spatialParams(
    source.x,
    source.y,
    listener.x,
    listener.y,
    C.refDist,
    C.maxDist
  );
  renderStats(p);
  setStatus(`dist=${p.dist.toFixed(0)} gain=${p.gain.toFixed(2)} pan=${p.pan.toFixed(2)}`);
  if (muteEl?.checked) return;
  const ctx = ensureAc();
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const panNode = ctx.createStereoPanner?.() || null;
  o.type = "sine";
  o.frequency.value = C.baseFreq;
  const vol = C.baseGain * p.gain;
  g.gain.value = vol;
  o.connect(g);
  if (panNode) {
    panNode.pan.value = p.pan;
    g.connect(panNode);
    panNode.connect(ctx.destination);
  } else {
    g.connect(ctx.destination);
  }
  const t0 = ctx.currentTime;
  g.gain.setValueAtTime(Math.max(0.0001, vol), t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + C.baseDur);
  o.start(t0);
  o.stop(t0 + C.baseDur + 0.02);
}

function renderStats(p) {
  if (!statsEl) return;
  statsEl.innerHTML = `
    <table class="coord-table">
      <tr><td>距離</td><td>${p.dist.toFixed(1)}</td></tr>
      <tr><td>Gain</td><td>${p.gain.toFixed(3)}</td></tr>
      <tr><td>Pan</td><td>${p.pan.toFixed(3)}（−1=左 … +1=右）</td></tr>
      <tr><td>ref / max</td><td>${C.refDist} / ${C.maxDist}</td></tr>
    </table>`;
}

function draw() {
  if (!ctx2d) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx2d.fillStyle = "#0a0e14";
  ctx2d.fillRect(0, 0, W, H);

  // falloff rings
  for (const r of [C.refDist, C.maxDist * 0.5, C.maxDist]) {
    ctx2d.strokeStyle = "rgba(90,106,128,0.35)";
    ctx2d.beginPath();
    ctx2d.arc(listener.x, listener.y, r, 0, Math.PI * 2);
    ctx2d.stroke();
  }
  // line
  ctx2d.strokeStyle = "rgba(242,204,143,0.5)";
  ctx2d.beginPath();
  ctx2d.moveTo(listener.x, listener.y);
  ctx2d.lineTo(source.x, source.y);
  ctx2d.stroke();

  // listener
  ctx2d.fillStyle = "#6bcb8f";
  ctx2d.beginPath();
  ctx2d.arc(listener.x, listener.y, 12, 0, Math.PI * 2);
  ctx2d.fill();
  ctx2d.fillStyle = "#e8eef7";
  ctx2d.font = "12px sans-serif";
  ctx2d.fillText("Listener", listener.x - 22, listener.y - 18);

  // source
  ctx2d.fillStyle = "#5b9fd4";
  ctx2d.beginPath();
  ctx2d.arc(source.x, source.y, 14, 0, Math.PI * 2);
  ctx2d.fill();
  ctx2d.fillStyle = "#e8eef7";
  ctx2d.fillText("Source（ドラッグ）", source.x - 40, source.y - 20);
}

function pointerPos(e) {
  const r = canvas.getBoundingClientRect();
  const sx = canvas.width / r.width;
  const sy = canvas.height / r.height;
  return {
    x: (e.clientX - r.left) * sx,
    y: (e.clientY - r.top) * sy,
  };
}

canvas.addEventListener("pointerdown", (e) => {
  const p = pointerPos(e);
  if (Math.hypot(p.x - source.x, p.y - source.y) < 28) {
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
  }
});
canvas.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const p = pointerPos(e);
  source.x = Math.max(16, Math.min(canvas.width - 16, p.x));
  source.y = Math.max(16, Math.min(canvas.height - 16, p.y));
  const sp = spatialParams(
    source.x,
    source.y,
    listener.x,
    listener.y,
    C.refDist,
    C.maxDist
  );
  draw();
  renderStats(sp);
});
canvas.addEventListener("pointerup", () => {
  dragging = false;
});

btnPlay?.addEventListener("click", playOnce);

loadTextSample(
  "../samples/SfxSpatialExample.cs",
  csharpSample,
  "// SfxSpatialExample.cs"
);
draw();
renderStats(
  spatialParams(source.x, source.y, listener.x, listener.y, C.refDist, C.maxDist)
);
setStatus("音源をドラッグして再生");
