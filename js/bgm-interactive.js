/**
 * レイヤー型 interactive BGM
 */
import { BGM_INTERACTIVE_CONFIG as C } from "./maps/bgm-interactive-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("ix-canvas")
);
const ctx = canvas.getContext("2d");
const metersEl = document.getElementById("ix-meters");
const bpmEl = /** @type {HTMLInputElement} */ (document.getElementById("bpm"));
const bpmVal = document.getElementById("bpm-val");
const combatEl = /** @type {HTMLInputElement} */ (
  document.getElementById("combat")
);
const muteEl = /** @type {HTMLInputElement} */ (
  document.getElementById("mute")
);
const btnPlay = document.getElementById("btn-play");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** @type {Record<string, number>} current gains 0..1 */
const gains = {};
/** @type {Record<string, number>} targets */
const targets = {};
for (const L of C.layers) {
  gains[L.id] = L.gain;
  targets[L.id] = L.gain;
}

let clock = 0;
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
/** pending combat change at bar boundary */
/** @type {{ combat: boolean, at: number } | null} */
let pending = null;
/** @type {AudioContext | null} */
let ac = null;
/** @type {Record<string, { osc: OscillatorNode, g: GainNode }>} */
const voices = {};

/**
 * @param {number} t
 * @param {number} bpm
 * @param {number} beatsPerBar
 */
export function nextBar(t, bpm, beatsPerBar) {
  const bar = (60 / bpm) * beatsPerBar;
  return Math.ceil((t + 1e-9) / bar) * bar;
}

/**
 * Smooth toward targets.
 */
export function stepGains(cur, tgt, dt, fadeSec) {
  const rate = 1 / Math.max(0.05, fadeSec);
  const out = { ...cur };
  for (const k of Object.keys(tgt)) {
    const d = tgt[k] - (out[k] ?? 0);
    const step = Math.sign(d) * Math.min(Math.abs(d), rate * dt);
    out[k] = (out[k] ?? 0) + step;
  }
  return out;
}

function readBpm() {
  return Math.floor(Number(bpmEl?.value) || C.defaultBpm);
}

function ensureAudio() {
  if (muteEl?.checked) return;
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    for (const L of C.layers) {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = L.id === "drums" ? "square" : L.id === "boss" ? "sawtooth" : "triangle";
      osc.frequency.value = L.freq;
      g.gain.value = gains[L.id] * 0.04;
      osc.connect(g);
      g.connect(ac.destination);
      osc.start();
      voices[L.id] = { osc, g };
    }
  }
  if (ac.state === "suspended") ac.resume();
  applyAudio();
}

function applyAudio() {
  for (const L of C.layers) {
    const v = voices[L.id];
    if (v) v.g.gain.value = (gains[L.id] ?? 0) * 0.04;
  }
}

function scheduleCombat(want) {
  const at = nextBar(clock, readBpm(), C.beatsPerBar);
  pending = { combat: want, at };
  setStatus(
    want
      ? `戦闘レイヤー予約 @ 小節 ${at.toFixed(2)}s`
      : `探索へ戻る予約 @ ${at.toFixed(2)}s`
  );
}

function applyPending() {
  if (!pending || clock < pending.at) return;
  if (pending.combat) {
    targets.boss = 0.85;
    targets.drums = 0.75;
    targets.base = 0.65;
  } else {
    targets.boss = 0;
    targets.drums = 0.55;
    targets.base = 0.7;
  }
  setStatus(pending.combat ? "ボス層 ON（小節頭）" : "ボス層 OFF");
  pending = null;
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const bpm = readBpm();
  const beat = 60 / bpm;
  const bar = beat * C.beatsPerBar;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  const pad = 24;
  const usable = W - pad * 2;
  const windowSec = bar * 2;
  const t0 = Math.floor(clock / bar) * bar;
  for (let t = t0; t <= t0 + windowSec + 0.001; t += beat) {
    const x = pad + ((t - t0) / windowSec) * usable;
    const isBar = Math.abs(t / bar - Math.round(t / bar)) < 1e-6;
    ctx.strokeStyle = isBar ? "rgba(107,203,143,0.7)" : "rgba(90,106,128,0.35)";
    ctx.lineWidth = isBar ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, 40);
    ctx.lineTo(x, H - 50);
    ctx.stroke();
  }
  const ph = pad + ((clock - t0) / windowSec) * usable;
  ctx.strokeStyle = "#e07a5f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ph, 30);
  ctx.lineTo(ph, H - 40);
  ctx.stroke();
  if (pending) {
    const x = pad + ((pending.at - t0) / windowSec) * usable;
    ctx.fillStyle = "#f2cc8f";
    ctx.beginPath();
    ctx.arc(Math.max(pad, Math.min(pad + usable, x)), H / 2, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  // layer bars
  let ly = H - 36;
  const colors = { base: "#5b9fd4", drums: "#e07a5f", boss: "#f2cc8f" };
  for (const L of C.layers) {
    ctx.fillStyle = colors[L.id] || "#9aabbf";
    ctx.fillRect(pad, ly, usable * (gains[L.id] ?? 0), 8);
    ctx.fillStyle = "#9aabbf";
    ctx.font = "11px sans-serif";
    ctx.fillText(L.label, pad, ly - 2);
    ly -= 14;
  }
  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText(`t=${clock.toFixed(2)}s · 緑=小節`, 12, 18);
}

function renderMeters() {
  if (!metersEl) return;
  metersEl.innerHTML = C.layers
    .map((L) => {
      const g = gains[L.id] ?? 0;
      const col =
        L.id === "boss" ? "#f2cc8f" : L.id === "drums" ? "#e07a5f" : "#5b9fd4";
      return `<div class="pf-row"><span>${L.label}</span>
        <div class="pf-bar"><i style="width:${g * 100}%;background:${col}"></i></div>
        <span class="pf-ms">${g.toFixed(2)}</span></div>`;
    })
    .join("");
}

function loop(ts) {
  if (!running) return;
  if (!lastTs) lastTs = ts;
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (dt > 0.05) dt = 0.05;
  clock += dt;
  applyPending();
  const next = stepGains(gains, targets, dt, C.fadeSec);
  for (const k of Object.keys(next)) gains[k] = next[k];
  applyAudio();
  draw();
  renderMeters();
  if (bpmVal) bpmVal.textContent = String(readBpm());
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
combatEl?.addEventListener("change", () => {
  scheduleCombat(!!combatEl.checked);
  if (!running) {
    ensureAudio();
    running = true;
    lastTs = 0;
    if (btnPlay) btnPlay.textContent = "一時停止";
    rafId = requestAnimationFrame(loop);
  }
});
bpmEl?.addEventListener("input", () => {
  if (bpmVal) bpmVal.textContent = String(readBpm());
});

loadTextSample(
  "../samples/BgmInteractiveExample.cs",
  csharpSample,
  "// BgmInteractiveExample.cs"
);
if (bpmEl) bpmEl.value = String(C.defaultBpm);
if (bpmVal) bpmVal.textContent = String(C.defaultBpm);
draw();
renderMeters();
setStatus("再生後、戦闘チェックでボス層を次小節から");
