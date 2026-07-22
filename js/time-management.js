/**
 * 時間管理デモ — real time / game time / time scale / ポーズ
 * @see docs/topics/time-management/SPEC.md
 */

import { TIME_MGMT_CONFIG as C } from "./maps/time-management-config.js";
import {
  createStatus,
  createResultPanel,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("tm-canvas")
);
const ctx = canvas.getContext("2d");
const phaseEl = document.getElementById("phase-badge");
const logEl = document.getElementById("frame-log");
const clockReal = document.getElementById("clock-real");
const clockGame = document.getElementById("clock-game");
const clockScale = document.getElementById("clock-scale");
const btnPlay = document.getElementById("btn-play");
const btnStep = document.getElementById("btn-step");
const btnReset = document.getElementById("btn-reset");
const pausedEl = /** @type {HTMLInputElement} */ (
  document.getElementById("paused")
);
const scaleEl = /** @type {HTMLInputElement} */ (
  document.getElementById("scale")
);
const scaleVal = document.getElementById("scale-val");
const csharpSample = document.getElementById("csharp-sample");

const setStatus = createStatus(document.getElementById("status"));
const resultPanel = createResultPanel(
  document.getElementById("result-compare")
);

let realTime = 0;
let gameTime = 0;
let frameIndex = 0;
/** @type {{ i: number, realMs: number, scaledMs: number, scale: number, paused: boolean }[]} */
let log = [];
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;

function readScale() {
  return Math.min(
    C.maxScale,
    Math.max(C.minScale, Number(scaleEl.value) || C.defaultScale)
  );
}

function isPaused() {
  return !!pausedEl?.checked;
}

function syncLabels() {
  if (scaleVal) scaleVal.textContent = readScale().toFixed(2);
}

function setPhase(phase) {
  if (!phaseEl) return;
  const labels = {
    idle: "待機",
    run: "再生中",
    paused: "ポーズ",
  };
  phaseEl.textContent = labels[phase] || phase;
  phaseEl.dataset.phase = phase === "paused" ? "done" : phase === "run" ? "done" : "idle";
}

/**
 * @param {number} realDtMs
 */
function tick(realDtMs) {
  const realSec = Math.min(realDtMs, 100) / 1000;
  const scale = readScale();
  const paused = isPaused();
  const scaledSec = paused ? 0 : realSec * scale;

  realTime += realSec;
  gameTime += scaledSec;
  frameIndex += 1;

  log.unshift({
    i: frameIndex,
    realMs: realSec * 1000,
    scaledMs: scaledSec * 1000,
    scale,
    paused,
  });
  if (log.length > C.logMax) log.pop();

  draw();
  renderClocks();
  renderLog();

  setStatus(
    `F#${frameIndex}: realDt=${(realSec * 1000).toFixed(1)}ms` +
      ` scaledDt=${(scaledSec * 1000).toFixed(1)}ms` +
      ` scale=${scale.toFixed(2)}` +
      (paused ? " [PAUSED]" : "")
  );

  if (paused && scaledSec === 0) {
    resultPanel.show(`
      <p class="result-verdict">ポーズ中 — game time は進みません</p>
      <p class="result-note">
        壁時計 real は増え続け、ゲーム内 game とキャラ位置は止まります。
        チェックを外すと、保持していた time scale で再開します。
      </p>
    `);
  } else if (scale !== 1 && !paused) {
    resultPanel.show(`
      <p class="result-verdict">time scale = ${scale.toFixed(2)}</p>
      <p class="result-note">
        scaledDt = realDt × ${scale.toFixed(2)}。
        ${scale < 1 ? "スローモーション" : "早送り"}として game が進みます。
      </p>
    `);
  } else {
    resultPanel.hide();
  }

  setPhase(paused ? "paused" : running ? "run" : "idle");
}

/** @param {number} gameT */
function patrol01(gameT) {
  const half = C.patrolHalfPeriod;
  const cycle = gameT / half;
  const t = cycle - Math.floor(cycle);
  return t < 0.5 ? t * 2 : 2 - t * 2;
}

function draw() {
  if (!ctx || !canvas) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  const pad = C.worldPad * W;
  const trackY = H * 0.55;
  const left = pad;
  const right = W - pad;

  // トラック
  ctx.strokeStyle = "#3d4f66";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(left, trackY);
  ctx.lineTo(right, trackY);
  ctx.stroke();

  // キャラ位置
  const p = patrol01(gameTime);
  const cx = left + (right - left) * p;
  const cy = trackY;
  ctx.fillStyle = "#6bcb8f";
  ctx.beginPath();
  ctx.arc(cx, cy, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#9ee0b8";
  ctx.lineWidth = 2;
  ctx.stroke();

  // 回転マーカ（game time）
  const ox = W * 0.85;
  const oy = H * 0.28;
  const ang = gameTime * Math.PI; // 0.5 rev / game-sec
  ctx.strokeStyle = "#5a6a80";
  ctx.beginPath();
  ctx.arc(ox, oy, 36, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#f2cc8f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(ox + Math.cos(ang) * 32, oy + Math.sin(ang) * 32);
  ctx.stroke();
  ctx.fillStyle = "#f2cc8f";
  ctx.beginPath();
  ctx.arc(ox, oy, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.fillText(
    `patrol=${p.toFixed(2)}  game=${gameTime.toFixed(2)}s  real=${realTime.toFixed(2)}s`,
    12,
    18
  );

  if (isPaused()) {
    ctx.fillStyle = "rgba(224,122,95,0.85)";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", W / 2, H * 0.22);
  }
}

function renderClocks() {
  if (clockReal) clockReal.textContent = `${realTime.toFixed(2)} s`;
  if (clockGame) clockGame.textContent = `${gameTime.toFixed(2)} s`;
  if (clockScale) {
    clockScale.textContent = isPaused()
      ? `${readScale().toFixed(2)} × PAUSE`
      : `${readScale().toFixed(2)}`;
  }
}

function renderLog() {
  if (!logEl) return;
  if (!log.length) {
    logEl.innerHTML =
      '<p class="gl-log-empty">（まだフレームがありません）</p>';
    return;
  }
  const rows = log
    .map((e) => {
      const warn = e.paused || e.scaledMs === 0 ? ' class="is-warn"' : "";
      return `<tr${warn}>
        <td>#${e.i}</td>
        <td>${e.realMs.toFixed(1)}</td>
        <td>${e.scaledMs.toFixed(1)}</td>
        <td>${e.scale.toFixed(2)}</td>
        <td>${e.paused ? "pause" : ""}</td>
      </tr>`;
    })
    .join("");
  logEl.innerHTML = `<table class="gl-log-table">
    <thead><tr>
      <th>F#</th><th>realDt ms</th><th>scaledDt ms</th><th>scale</th><th></th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="gl-log-sum">real ${realTime.toFixed(2)}s · game ${gameTime.toFixed(2)}s · 差 ${(realTime - gameTime).toFixed(2)}s</p>`;
}

function stopLoop() {
  running = false;
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (btnPlay) btnPlay.textContent = "再生";
  setPhase(isPaused() ? "paused" : "idle");
}

function scheduleNext() {
  if (!running) return;
  rafId = requestAnimationFrame((ts) => {
    if (!running) return;
    if (!lastTs) lastTs = ts;
    let dt = ts - lastTs;
    lastTs = ts;
    if (dt < 1) dt = 1;
    if (dt > 100) dt = 100;
    tick(dt);
    scheduleNext();
  });
}

function startLoop() {
  if (running) return;
  running = true;
  lastTs = 0;
  if (btnPlay) btnPlay.textContent = "一時停止";
  setPhase(isPaused() ? "paused" : "run");
  scheduleNext();
}

function togglePlay() {
  if (running) {
    stopLoop();
    setStatus("一時停止（ループ停止 — ポーズフラグとは別）");
    return;
  }
  startLoop();
}

function resetAll() {
  stopLoop();
  realTime = 0;
  gameTime = 0;
  frameIndex = 0;
  log = [];
  resultPanel.hide();
  draw();
  renderClocks();
  renderLog();
  setStatus("リセット完了");
  setPhase("idle");
}

btnPlay?.addEventListener("click", togglePlay);
btnStep?.addEventListener("click", () => {
  stopLoop();
  tick(1000 / 60);
});
btnReset?.addEventListener("click", resetAll);

scaleEl?.addEventListener("input", () => {
  syncLabels();
  renderClocks();
});
pausedEl?.addEventListener("change", () => {
  setPhase(isPaused() ? "paused" : running ? "run" : "idle");
  setStatus(isPaused() ? "ポーズ ON — game 停止" : "ポーズ OFF");
  draw();
  renderClocks();
});

document.querySelectorAll("[data-scale]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const v = Number(/** @type {HTMLElement} */ (btn).dataset.scale);
    if (scaleEl) scaleEl.value = String(v);
    if (pausedEl && v > 0) pausedEl.checked = false;
    syncLabels();
    renderClocks();
    setStatus(`time scale = ${v}`);
  });
});

loadTextSample(
  "../samples/TimeManagementExample.cs",
  csharpSample,
  "// samples/TimeManagementExample.cs を読み込めませんでした。"
);

syncLabels();
resetAll();
setStatus("準備完了 — 再生し、scale やポーズを試す");
