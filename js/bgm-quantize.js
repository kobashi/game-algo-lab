/**
 * 拍・小節への量子化
 */
import { BGM_QUANTIZE_CONFIG as C } from "./maps/bgm-quantize-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("q-canvas")
);
const ctx = canvas.getContext("2d");
const bpmEl = /** @type {HTMLInputElement} */ (document.getElementById("bpm"));
const bpmVal = document.getElementById("bpm-val");
const statsEl = document.getElementById("q-stats");
const logEl = document.getElementById("q-log");
const muteEl = /** @type {HTMLInputElement} */ (
  document.getElementById("mute")
);
const btnPlay = document.getElementById("btn-play");
const btnNow = document.getElementById("btn-now");
const btnBeat = document.getElementById("btn-beat");
const btnBar = document.getElementById("btn-bar");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

let clock = 0;
let running = false;
/** @type {{ t: number, kind: string }[]} */
let pending = [];
/** @type {string[]} */
let logs = [];
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
/** @type {AudioContext | null} */
let ac = null;
/** last fired markers for flash */
let flashT = -1;

function readBpm() {
  return Math.min(
    C.maxBpm,
    Math.max(C.minBpm, Number(bpmEl?.value) || C.defaultBpm)
  );
}
function beatSec() {
  return 60 / readBpm();
}
function barSec() {
  return beatSec() * C.beatsPerBar;
}

/**
 * @param {number} t current time
 * @param {'now'|'beat'|'bar'} mode
 * @param {number} beatLen
 * @param {number} barLen
 */
export function quantizeTime(t, mode, beatLen, barLen) {
  if (mode === "now") return t;
  if (mode === "beat") {
    const next = Math.ceil((t + 1e-9) / beatLen) * beatLen;
    return next;
  }
  const next = Math.ceil((t + 1e-9) / barLen) * barLen;
  return next;
}

function pushLog(msg) {
  logs.unshift(msg);
  if (logs.length > 14) logs.pop();
  if (logEl) {
    logEl.innerHTML = logs
      .map((m) => `<div class="es-log es-log-sub">${m}</div>`)
      .join("");
  }
}

function beep(freq) {
  if (muteEl?.checked) return;
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ac = new AC();
  }
  if (!ac) return;
  if (ac.state === "suspended") ac.resume();
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = "square";
  o.frequency.value = freq;
  g.gain.value = 0.07;
  o.connect(g);
  g.connect(ac.destination);
  const t0 = ac.currentTime;
  g.gain.setValueAtTime(0.07, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08);
  o.start(t0);
  o.stop(t0 + 0.1);
}

function schedule(mode) {
  const t = quantizeTime(clock, mode, beatSec(), barSec());
  pending.push({ t, kind: mode });
  pending.sort((a, b) => a.t - b.t);
  pushLog(`予約 ${mode} @ ${t.toFixed(2)}s (now ${clock.toFixed(2)})`);
  setStatus(`予約 ${mode} → ${t.toFixed(2)}s`);
  draw();
}

function fireReady() {
  while (pending.length && pending[0].t <= clock + 1e-6) {
    const ev = pending.shift();
    flashT = clock;
    pushLog(`発火 ${ev.kind} @ ${clock.toFixed(2)}s`);
    beep(ev.kind === "bar" ? 660 : ev.kind === "beat" ? 520 : 400);
  }
}

function renderStats() {
  if (!statsEl) return;
  const b = beatSec();
  const bar = barSec();
  const beatIdx = Math.floor(clock / b);
  const barIdx = Math.floor(clock / bar);
  const beatInBar = beatIdx % C.beatsPerBar;
  statsEl.innerHTML = `
    <table class="coord-table">
      <tr><td>時刻</td><td>${clock.toFixed(2)} s</td></tr>
      <tr><td>BPM</td><td>${readBpm()}</td></tr>
      <tr><td>拍</td><td>${beatIdx}（小節内 ${beatInBar + 1}/${C.beatsPerBar}）</td></tr>
      <tr><td>小節</td><td>${barIdx}</td></tr>
      <tr><td>予約</td><td>${pending.length}</td></tr>
    </table>`;
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const b = beatSec();
  const bar = barSec();
  const windowSec = bar * 2;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  const pad = 24;
  const usable = W - pad * 2;
  const t0 = Math.floor(clock / bar) * bar;
  // grid
  for (let t = t0; t <= t0 + windowSec + 0.001; t += b) {
    const x = pad + ((t - t0) / windowSec) * usable;
    const isBar = Math.abs(t / bar - Math.round(t / bar)) < 1e-6;
    ctx.strokeStyle = isBar ? "rgba(107,203,143,0.7)" : "rgba(90,106,128,0.4)";
    ctx.lineWidth = isBar ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, 30);
    ctx.lineTo(x, H - 20);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
  // playhead
  const ph = pad + ((clock - t0) / windowSec) * usable;
  ctx.strokeStyle = "#e07a5f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ph, 20);
  ctx.lineTo(ph, H - 10);
  ctx.stroke();
  ctx.lineWidth = 1;

  // pending markers
  for (const ev of pending) {
    if (ev.t < t0 || ev.t > t0 + windowSec) continue;
    const x = pad + ((ev.t - t0) / windowSec) * usable;
    ctx.fillStyle = ev.kind === "bar" ? "#6bcb8f" : "#f2cc8f";
    ctx.beginPath();
    ctx.arc(x, H / 2, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  if (flashT >= 0 && clock - flashT < 0.15) {
    ctx.fillStyle = "rgba(224,122,95,0.25)";
    ctx.fillRect(0, 0, W, H);
  }
  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("緑=小節 · 灰=拍 · 黄/緑点=予約", 12, 16);
}

function loop(ts) {
  if (!running) return;
  if (!lastTs) lastTs = ts;
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (dt > 0.05) dt = 0.05;
  clock += dt;
  fireReady();
  draw();
  renderStats();
  if (bpmVal) bpmVal.textContent = String(readBpm());
  rafId = requestAnimationFrame(loop);
}

function stop() {
  running = false;
  if (rafId != null) cancelAnimationFrame(rafId);
  rafId = null;
  if (btnPlay) btnPlay.textContent = "再生";
}

btnPlay?.addEventListener("click", () => {
  if (running) {
    stop();
    return;
  }
  running = true;
  lastTs = 0;
  if (btnPlay) btnPlay.textContent = "一時停止";
  if (ac?.state === "suspended") ac.resume();
  rafId = requestAnimationFrame(loop);
});
btnNow?.addEventListener("click", () => schedule("now"));
btnBeat?.addEventListener("click", () => schedule("beat"));
btnBar?.addEventListener("click", () => schedule("bar"));
bpmEl?.addEventListener("input", () => {
  if (bpmVal) bpmVal.textContent = String(readBpm());
  draw();
  renderStats();
});

loadTextSample(
  "../samples/BgmQuantizeExample.cs",
  csharpSample,
  "// BgmQuantizeExample.cs"
);
if (bpmEl) bpmEl.value = String(C.defaultBpm);
if (bpmVal) bpmVal.textContent = String(C.defaultBpm);
draw();
renderStats();
setStatus("再生してから即時 / 次拍 / 次小節で予約");
