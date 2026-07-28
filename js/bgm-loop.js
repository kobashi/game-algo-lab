/**
 * BGM イントロ + ループ区間
 */
import { BGM_LOOP_CONFIG as C } from "./maps/bgm-loop-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("bgm-canvas")
);
const ctx = canvas.getContext("2d");
const introEl = /** @type {HTMLInputElement} */ (
  document.getElementById("intro-sec")
);
const loopEl = /** @type {HTMLInputElement} */ (
  document.getElementById("loop-sec")
);
const introVal = document.getElementById("intro-val");
const loopVal = document.getElementById("loop-val");
const statsEl = document.getElementById("bgm-stats");
const muteEl = /** @type {HTMLInputElement} */ (
  document.getElementById("mute")
);
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

let playhead = 0;
let running = false;
let loopCount = 0;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
/** @type {AudioContext | null} */
let ac = null;
let lastBeepRegion = "";

function readIntro() {
  return Math.min(
    C.maxIntro,
    Math.max(C.minIntro, Number(introEl?.value) || C.defaultIntroSec)
  );
}
function readLoop() {
  return Math.min(
    C.maxLoop,
    Math.max(C.minLoop, Number(loopEl?.value) || C.defaultLoopSec)
  );
}

/**
 * Advance playhead; wrap at loop end to loopStart (= intro length).
 * @returns {{ t: number, looped: boolean, region: 'intro'|'loop' }}
 */
export function advancePlayhead(t, dt, introSec, loopSec) {
  let nt = t + dt;
  let looped = false;
  const total = introSec + loopSec;
  const loopStart = introSec;
  const loopEnd = total;
  if (nt >= loopEnd) {
    // map excess into loop
    const over = nt - loopEnd;
    nt = loopStart + (over % loopSec);
    looped = true;
  }
  const region = nt < introSec ? "intro" : "loop";
  return { t: nt, looped, region };
}

function sync() {
  if (introVal) introVal.textContent = readIntro().toFixed(1);
  if (loopVal) loopVal.textContent = readLoop().toFixed(1);
}

function renderStats(region) {
  if (!statsEl) return;
  const intro = readIntro();
  const loop = readLoop();
  statsEl.innerHTML = `
    <table class="coord-table">
      <tr><td>再生位置</td><td>${playhead.toFixed(2)} s</td></tr>
      <tr><td>区間</td><td>${region}</td></tr>
      <tr><td>loopStart</td><td>${intro.toFixed(2)} s</td></tr>
      <tr><td>loopEnd</td><td>${(intro + loop).toFixed(2)} s</td></tr>
      <tr><td>ループ回数</td><td>${loopCount}</td></tr>
    </table>`;
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const intro = readIntro();
  const loop = readLoop();
  const total = intro + loop;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  const pad = 40;
  const barY = H * 0.4;
  const barH = 48;
  const barW = W - pad * 2;
  const introW = (intro / total) * barW;
  const loopW = (loop / total) * barW;

  // intro
  ctx.fillStyle = "rgba(91, 159, 212, 0.45)";
  ctx.fillRect(pad, barY, introW, barH);
  // loop
  ctx.fillStyle = "rgba(107, 203, 143, 0.45)";
  ctx.fillRect(pad + introW, barY, loopW, barH);
  ctx.strokeStyle = "#5a6a80";
  ctx.strokeRect(pad, barY, barW, barH);

  ctx.fillStyle = "#e8eef7";
  ctx.font = "12px sans-serif";
  ctx.fillText("INTRO", pad + 8, barY + 28);
  ctx.fillText("LOOP", pad + introW + 8, barY + 28);

  // markers
  ctx.fillStyle = "#f2cc8f";
  ctx.fillText("0", pad - 4, barY + barH + 18);
  ctx.fillText("loopStart", pad + introW - 24, barY - 10);
  ctx.fillText("loopEnd", pad + barW - 30, barY + barH + 18);

  // playhead
  const x = pad + (playhead / total) * barW;
  ctx.strokeStyle = "#e07a5f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, barY - 12);
  ctx.lineTo(x, barY + barH + 12);
  ctx.stroke();
  ctx.lineWidth = 1;

  // fake waveform ticks
  ctx.strokeStyle = "rgba(232,238,247,0.15)";
  for (let i = 0; i < 40; i++) {
    const tx = pad + (i / 40) * barW;
    const h = 8 + ((i * 17) % 20);
    ctx.beginPath();
    ctx.moveTo(tx, barY + barH / 2 - h);
    ctx.lineTo(tx, barY + barH / 2 + h);
    ctx.stroke();
  }
}

function beepRegion(region) {
  if (muteEl?.checked) return;
  if (region === lastBeepRegion) return;
  lastBeepRegion = region;
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ac = new AC();
  }
  if (!ac) return;
  if (ac.state === "suspended") ac.resume();
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = "sine";
  o.frequency.value = region === "intro" ? 330 : 494;
  g.gain.value = 0.04;
  o.connect(g);
  g.connect(ac.destination);
  const t0 = ac.currentTime;
  g.gain.setValueAtTime(0.04, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.06);
  o.start(t0);
  o.stop(t0 + 0.08);
}

function tick(dt) {
  const intro = readIntro();
  const loop = readLoop();
  const r = advancePlayhead(playhead, dt, intro, loop);
  if (r.looped) {
    loopCount += 1;
    setStatus(`ループ #${loopCount} → loopStart`);
    lastBeepRegion = "";
  }
  playhead = r.t;
  beepRegion(r.region);
  draw();
  renderStats(r.region);
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

function stop() {
  running = false;
  if (rafId != null) cancelAnimationFrame(rafId);
  rafId = null;
  if (btnPlay) btnPlay.textContent = "再生";
}

function reset() {
  stop();
  playhead = 0;
  loopCount = 0;
  lastBeepRegion = "";
  sync();
  draw();
  renderStats("intro");
  setStatus("リセット — 再生でイントロ→ループ");
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
btnReset?.addEventListener("click", reset);
for (const el of [introEl, loopEl]) {
  el?.addEventListener("input", () => {
    sync();
    // clamp playhead if total shrunk
    const total = readIntro() + readLoop();
    if (playhead > total) playhead = readIntro();
    draw();
    renderStats(playhead < readIntro() ? "intro" : "loop");
  });
}

loadTextSample(
  "../samples/BgmLoopExample.cs",
  csharpSample,
  "// BgmLoopExample.cs"
);
if (introEl) introEl.value = String(C.defaultIntroSec);
if (loopEl) loopEl.value = String(C.defaultLoopSec);
reset();
