/**
 * ゲームループデモ — 可変 / 固定 timestep
 * @see docs/topics/game-loop/SPEC.md
 */

import { GAME_LOOP_CONFIG as C } from "./maps/game-loop-config.js";
import {
  createStatus,
  createResultPanel,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("gl-canvas")
);
const ctx = canvas.getContext("2d");
const phaseEl = document.getElementById("phase-badge");
const logEl = document.getElementById("frame-log");
const btnPlay = document.getElementById("btn-play");
const btnStep = document.getElementById("btn-step");
const btnReset = document.getElementById("btn-reset");
const modeEl = /** @type {HTMLSelectElement} */ (document.getElementById("mode"));
const fixedDtEl = /** @type {HTMLInputElement} */ (
  document.getElementById("fixed-dt")
);
const lagEl = /** @type {HTMLInputElement} */ (document.getElementById("lag"));
const maxStepsEl = /** @type {HTMLInputElement} */ (
  document.getElementById("max-steps")
);
const speedEl = /** @type {HTMLInputElement} */ (document.getElementById("speed"));
const fixedDtVal = document.getElementById("fixed-dt-val");
const lagVal = document.getElementById("lag-val");
const maxStepsVal = document.getElementById("max-steps-val");
const csharpSample = document.getElementById("csharp-sample");

const setStatus = createStatus(document.getElementById("status"));
const resultPanel = createResultPanel(
  document.getElementById("result-compare")
);

/** @type {{ y: number, v: number }} */
let world = { y: 0.15, v: 0 };
let acc = 0;
let frameIndex = 0;
/** @type {{ i: number, realMs: number, steps: number, accMs: number, mode: string, clamped: boolean }[]} */
let log = [];
let running = false;
/** @type {number | null} */
let rafId = null;
/** @type {ReturnType<typeof setTimeout> | null} */
let timerId = null;
let lastTs = 0;
let spiralWarns = 0;
let totalSteps = 0;

function readFixedDtMs() {
  return Math.min(
    C.maxFixedDtMs,
    Math.max(C.minFixedDtMs, Number(fixedDtEl.value) || C.defaultFixedDtMs)
  );
}
function readLagMs() {
  return Math.min(C.maxLagMs, Math.max(0, Number(lagEl.value) || 0));
}
function readMaxSteps() {
  return Math.min(
    C.maxMaxSteps,
    Math.max(C.minMaxSteps, Math.floor(Number(maxStepsEl.value) || C.defaultMaxSteps))
  );
}
function readMode() {
  return modeEl.value === "variable" ? "variable" : "fixed";
}

function syncLabels() {
  if (fixedDtVal) fixedDtVal.textContent = readFixedDtMs().toFixed(1);
  if (lagVal) lagVal.textContent = String(readLagMs());
  if (maxStepsVal) maxStepsVal.textContent = String(readMaxSteps());
}

function setPhase(phase) {
  if (!phaseEl) return;
  const labels = {
    idle: "待機",
    update: "更新",
    render: "描画",
    run: "ループ中",
  };
  phaseEl.textContent = labels[phase] || phase;
  phaseEl.dataset.phase = phase;
}

function resetWorld() {
  world = { y: 0.12, v: 0 };
  acc = 0;
  frameIndex = 0;
  log = [];
  spiralWarns = 0;
  totalSteps = 0;
  resultPanel.hide();
}

function updatePhysics(dtSec) {
  world.v += C.gravity * dtSec;
  world.y += world.v * dtSec;
  const floor = C.floorY - C.ballRadius;
  if (world.y > floor) {
    world.y = floor;
    world.v = -Math.abs(world.v) * C.restitution;
  }
  if (world.y < C.ballRadius) {
    world.y = C.ballRadius;
    world.v = Math.abs(world.v) * C.restitution;
  }
}

/**
 * 1 フレーム分
 * @param {number} realDtMs 実経過（人工遅延込み）
 */
function runFrame(realDtMs) {
  const mode = readMode();
  const lag = readLagMs();
  const realMs = realDtMs + lag;
  let steps = 0;
  let clamped = false;

  setPhase("update");

  if (mode === "variable") {
    const dt = Math.min(realMs / 1000, 0.1);
    updatePhysics(dt);
    steps = 1;
    totalSteps += 1;
  } else {
    const fixedMs = readFixedDtMs();
    const fixedSec = fixedMs / 1000;
    const maxSteps = readMaxSteps();
    acc += Math.min(realMs, 250);
    while (acc >= fixedMs && steps < maxSteps) {
      updatePhysics(fixedSec);
      acc -= fixedMs;
      steps += 1;
      totalSteps += 1;
    }
    if (steps >= maxSteps && acc >= fixedMs) {
      clamped = true;
      spiralWarns += 1;
      // 余りを捨てすぎないが、溢れ防止で少し落とす
      acc = Math.min(acc, fixedMs * 2);
    }
  }

  setPhase("render");
  frameIndex += 1;
  log.unshift({
    i: frameIndex,
    realMs,
    steps,
    accMs: mode === "fixed" ? acc : 0,
    mode,
    clamped,
  });
  if (log.length > C.logMax) log.pop();

  draw();
  renderLog();

  if (clamped) {
    setStatus(
      `フレーム #${frameIndex}: realDt=${realMs.toFixed(1)}ms / steps=${steps} ★MAX_STEPS で打ち切り（追いつき切れず）`
    );
    resultPanel.show(`
      <p class="result-verdict">スパイラル防止が働きました</p>
      <p class="result-note">
        1 フレーム内の固定更新が MAX_STEPS=${readMaxSteps()} に達しました。
        遅延を下げるか MAX_STEPS を上げると追いつきやすくなります。
        上げすぎると 1 フレームがさらに重くなる悪循環（スパイラル・オブ・デス）になり得ます。
      </p>
    `);
  } else {
    setStatus(
      `フレーム #${frameIndex}: mode=${mode} realDt=${realMs.toFixed(1)}ms / updates=${steps}` +
        (mode === "fixed" ? ` / acc=${acc.toFixed(1)}ms` : "")
    );
  }
  setPhase(running ? "run" : "idle");
}

function draw() {
  if (!ctx || !canvas) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  // 床
  const floorPy = (C.floorY / C.worldHeight) * H;
  ctx.fillStyle = "#3d4f66";
  ctx.fillRect(0, floorPy, W, H - floorPy);
  ctx.strokeStyle = "#5a6a80";
  ctx.beginPath();
  ctx.moveTo(0, floorPy);
  ctx.lineTo(W, floorPy);
  ctx.stroke();

  // グリッド線
  ctx.strokeStyle = "rgba(90,106,128,0.35)";
  for (let i = 1; i < 4; i++) {
    const y = (i / 4) * floorPy;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // ボール
  const cx = W * 0.5;
  const cy = (world.y / C.worldHeight) * H;
  const r = (C.ballRadius / C.worldHeight) * H;
  ctx.fillStyle = "#5b9fd4";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8ec0e8";
  ctx.lineWidth = 2;
  ctx.stroke();

  // 速度矢印
  ctx.strokeStyle = "#f2cc8f";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy + world.v * 0.04);
  ctx.stroke();

  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.fillText(
    `y=${world.y.toFixed(3)}  v=${world.v.toFixed(1)}  mode=${readMode()}`,
    12,
    18
  );
}

function renderLog() {
  if (!logEl) return;
  if (!log.length) {
    logEl.innerHTML = "<p class=\"gl-log-empty\">（まだフレームがありません。再生または 1フレーム）</p>";
    return;
  }
  const rows = log
    .map((e) => {
      const warn = e.clamped ? ' class="is-warn"' : "";
      return `<tr${warn}>
        <td>#${e.i}</td>
        <td>${e.mode === "fixed" ? "固定" : "可変"}</td>
        <td>${e.realMs.toFixed(1)}</td>
        <td>${e.steps}</td>
        <td>${e.mode === "fixed" ? e.accMs.toFixed(1) : "—"}</td>
        <td>${e.clamped ? "打ち切り" : ""}</td>
      </tr>`;
    })
    .join("");
  logEl.innerHTML = `<table class="gl-log-table">
    <thead><tr>
      <th>F#</th><th>mode</th><th>realDt ms</th><th>updates</th><th>acc ms</th><th></th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="gl-log-sum">累計 updates: ${totalSteps} · MAX_STEPS 警告: ${spiralWarns} 回</p>`;
}

function stopLoop() {
  running = false;
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (timerId != null) {
    clearTimeout(timerId);
    timerId = null;
  }
  if (btnPlay) btnPlay.textContent = "再生";
  setPhase("idle");
}

function scheduleNext() {
  if (!running) return;
  const pad = Number(speedEl?.value) || 0;
  if (pad <= 0) {
    rafId = requestAnimationFrame((ts) => {
      if (!running) return;
      if (!lastTs) lastTs = ts;
      let dt = ts - lastTs;
      lastTs = ts;
      if (dt < 1) dt = 1;
      if (dt > 100) dt = 100;
      runFrame(dt);
      scheduleNext();
    });
  } else {
    timerId = setTimeout(() => {
      if (!running) return;
      runFrame(16.7 + pad);
      scheduleNext();
    }, 16 + pad);
  }
}

function startLoop() {
  if (running) return;
  running = true;
  lastTs = 0;
  if (btnPlay) btnPlay.textContent = "一時停止";
  setPhase("run");
  scheduleNext();
}

function togglePlay() {
  if (running) {
    stopLoop();
    setStatus("一時停止");
    return;
  }
  startLoop();
}

btnPlay?.addEventListener("click", togglePlay);
btnStep?.addEventListener("click", () => {
  stopLoop();
  runFrame(1000 / 60 + readLagMs());
});
btnReset?.addEventListener("click", () => {
  stopLoop();
  resetWorld();
  draw();
  renderLog();
  setStatus("リセット — 再生または 1フレームで開始");
  setPhase("idle");
});

for (const el of [fixedDtEl, lagEl, maxStepsEl, modeEl]) {
  el?.addEventListener("input", () => {
    syncLabels();
  });
  el?.addEventListener("change", () => {
    syncLabels();
    setStatus(
      `設定: mode=${readMode()} FIXED=${readFixedDtMs().toFixed(1)}ms lag=${readLagMs()} maxSteps=${readMaxSteps()}`
    );
  });
}

loadTextSample(
  "../samples/GameLoopExample.cs",
  csharpSample,
  "// samples/GameLoopExample.cs を読み込めませんでした。"
);

syncLabels();
resetWorld();
draw();
renderLog();
setStatus("準備完了 — 固定 timestep が既定。人工遅延を上げて重いフレームを試す");
