/**
 * BGM 切替: 即時 / クロスフェード / 拍同期
 */
import { BGM_TRANSITION_COMPARE_CONFIG as C } from "./maps/bgm-transition-compare-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("tr-canvas")
);
const ctx = canvas.getContext("2d");
const modeEl = /** @type {HTMLSelectElement} */ (
  document.getElementById("mode")
);
const fadeEl = /** @type {HTMLInputElement} */ (
  document.getElementById("fade-sec")
);
const bpmEl = /** @type {HTMLInputElement} */ (
  document.getElementById("bpm")
);
const fadeVal = document.getElementById("fade-val");
const bpmVal = document.getElementById("bpm-val");
const metersEl = document.getElementById("tr-meters");
const muteEl = /** @type {HTMLInputElement} */ (
  document.getElementById("mute")
);
const btnPlay = document.getElementById("btn-play");
const btnSwitch = document.getElementById("btn-switch");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** active track 'A' | 'B' after transition completes */
let active = "A";
let gainA = 1;
let gainB = 0;
/** @type {{ mode: string, t0: number, dur: number, from: string, to: string, startAt: number } | null} */
let xfade = null;
let clock = 0;
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
/** @type {AudioContext | null} */
let ac = null;
/** @type {OscillatorNode | null} */
let oscA = null;
/** @type {OscillatorNode | null} */
let oscB = null;
/** @type {GainNode | null} */
let gA = null;
/** @type {GainNode | null} */
let gB = null;

/**
 * Linear crossfade gains at local time u in [0,1].
 * @returns {{ ga: number, gb: number }}
 */
export function crossfadeGains(u, fromIsA) {
  const t = Math.max(0, Math.min(1, u));
  if (fromIsA) return { ga: 1 - t, gb: t };
  return { ga: t, gb: 1 - t };
}

/**
 * Next bar boundary after t.
 */
export function nextBarTime(t, bpm, beatsPerBar) {
  const bar = (60 / bpm) * beatsPerBar;
  return Math.ceil((t + 1e-9) / bar) * bar;
}

function syncLabels() {
  if (fadeVal) fadeVal.textContent = Number(fadeEl?.value || 0).toFixed(1);
  if (bpmVal) bpmVal.textContent = String(Math.floor(Number(bpmEl?.value) || 120));
}

function ensureAudio() {
  if (muteEl?.checked) return false;
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    gA = ac.createGain();
    gB = ac.createGain();
    gA.gain.value = gainA * 0.05;
    gB.gain.value = gainB * 0.05;
    gA.connect(ac.destination);
    gB.connect(ac.destination);
    oscA = ac.createOscillator();
    oscB = ac.createOscillator();
    oscA.type = "triangle";
    oscB.type = "sawtooth";
    oscA.frequency.value = C.freqA;
    oscB.frequency.value = C.freqB;
    oscA.connect(gA);
    oscB.connect(gB);
    oscA.start();
    oscB.start();
  }
  if (ac.state === "suspended") ac.resume();
  applyAudioGains();
  return true;
}

function applyAudioGains() {
  if (gA) gA.gain.value = gainA * 0.05;
  if (gB) gB.gain.value = gainB * 0.05;
}

function startTransition() {
  const mode = modeEl?.value || "crossfade";
  const from = active;
  const to = active === "A" ? "B" : "A";
  const fade = Math.max(0.05, Number(fadeEl?.value) || C.defaultFadeSec);
  const bpm = Number(bpmEl?.value) || C.defaultBpm;

  if (mode === "immediate") {
    gainA = to === "A" ? 1 : 0;
    gainB = to === "B" ? 1 : 0;
    active = to;
    xfade = null;
    applyAudioGains();
    setStatus(`即時切替 → ${to}`);
    return;
  }

  let startAt = clock;
  if (mode === "beat") {
    startAt = nextBarTime(clock, bpm, C.beatsPerBar);
  }
  xfade = {
    mode,
    t0: clock,
    dur: fade,
    from,
    to,
    startAt,
  };
  setStatus(
    mode === "beat"
      ? `拍同期: ${startAt.toFixed(2)}s から ${fade.toFixed(1)}s フェード → ${to}`
      : `クロスフェード ${fade.toFixed(1)}s → ${to}`
  );
}

function updateXfade() {
  if (!xfade) return;
  if (clock < xfade.startAt) return;
  const u = (clock - xfade.startAt) / xfade.dur;
  const fromIsA = xfade.from === "A";
  if (u >= 1) {
    gainA = xfade.to === "A" ? 1 : 0;
    gainB = xfade.to === "B" ? 1 : 0;
    active = xfade.to;
    xfade = null;
    applyAudioGains();
    setStatus(`切替完了 → ${active}`);
    return;
  }
  const g = crossfadeGains(u, fromIsA);
  gainA = g.ga;
  gainB = g.gb;
  applyAudioGains();
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  // gain bars over time strip
  const pad = 30;
  const barW = W - pad * 2;
  const yA = 70;
  const yB = 140;
  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("Gain A (青)", pad, yA - 20);
  ctx.fillText("Gain B (赤)", pad, yB - 20);

  ctx.fillStyle = "rgba(61,79,102,0.5)";
  ctx.fillRect(pad, yA, barW, 24);
  ctx.fillRect(pad, yB, barW, 24);
  ctx.fillStyle = "#5b9fd4";
  ctx.fillRect(pad, yA, barW * gainA, 24);
  ctx.fillStyle = "#e07a5f";
  ctx.fillRect(pad, yB, barW * gainB, 24);

  // timeline marker for pending/active xfade
  if (xfade) {
    const total = 4;
    const x0 = pad + ((xfade.startAt - (clock - 1)) / total) * barW;
    ctx.strokeStyle = "#f2cc8f";
    ctx.beginPath();
    ctx.moveTo(Math.max(pad, Math.min(pad + barW, x0)), 40);
    ctx.lineTo(Math.max(pad, Math.min(pad + barW, x0)), H - 20);
    ctx.stroke();
    ctx.fillStyle = "#f2cc8f";
    ctx.fillText(`start ${xfade.startAt.toFixed(2)}s`, pad, H - 12);
  }

  ctx.fillStyle = "#e8eef7";
  ctx.fillText(`active=${active}  mode=${modeEl?.value || "-"}`, pad, 24);
}

function renderMeters() {
  if (!metersEl) return;
  metersEl.innerHTML = `
    <div class="pf-row"><span>A</span>
      <div class="pf-bar"><i style="width:${gainA * 100}%;background:#5b9fd4"></i></div>
      <span class="pf-ms">${gainA.toFixed(2)}</span></div>
    <div class="pf-row"><span>B</span>
      <div class="pf-bar"><i style="width:${gainB * 100}%;background:#e07a5f"></i></div>
      <span class="pf-ms">${gainB.toFixed(2)}</span></div>`;
}

function loop(ts) {
  if (!running) return;
  if (!lastTs) lastTs = ts;
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (dt > 0.05) dt = 0.05;
  clock += dt;
  updateXfade();
  draw();
  renderMeters();
  rafId = requestAnimationFrame(loop);
}

btnPlay?.addEventListener("click", () => {
  if (running) {
    running = false;
    if (rafId != null) cancelAnimationFrame(rafId);
    if (btnPlay) btnPlay.textContent = "再生";
    return;
  }
  ensureAudio();
  running = true;
  lastTs = 0;
  if (btnPlay) btnPlay.textContent = "一時停止";
  rafId = requestAnimationFrame(loop);
});
btnSwitch?.addEventListener("click", () => {
  ensureAudio();
  if (!running) {
    running = true;
    lastTs = 0;
    if (btnPlay) btnPlay.textContent = "一時停止";
    rafId = requestAnimationFrame(loop);
  }
  startTransition();
});
for (const el of [fadeEl, bpmEl, modeEl]) {
  el?.addEventListener("input", syncLabels);
}

loadTextSample(
  "../samples/BgmTransitionCompareExample.cs",
  csharpSample,
  "// BgmTransitionCompareExample.cs"
);
if (fadeEl) fadeEl.value = String(C.defaultFadeSec);
if (bpmEl) bpmEl.value = String(C.defaultBpm);
syncLabels();
draw();
renderMeters();
setStatus("再生後、方式を選んで切替");
