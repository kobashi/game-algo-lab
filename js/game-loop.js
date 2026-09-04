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
  applyParamsToControls,
  mountShareLink,
  drawTrailDots,
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
const ballsEl = /** @type {HTMLInputElement} */ (document.getElementById("balls"));
const loopEl = /** @type {HTMLInputElement} */ (document.getElementById("loop"));
const trailEl = /** @type {HTMLInputElement} */ (document.getElementById("trail"));
const drawLoadEl = /** @type {HTMLInputElement} */ (
  document.getElementById("draw-load")
);
const compareEl = /** @type {HTMLInputElement} */ (
  document.getElementById("compare")
);
const ballsVal = document.getElementById("balls-val");
const fpsEl = document.getElementById("gl-fps");
const fixedDtVal = document.getElementById("fixed-dt-val");
const lagVal = document.getElementById("lag-val");
const maxStepsVal = document.getElementById("max-steps-val");
const csharpSample = document.getElementById("csharp-sample");

const setStatus = createStatus(document.getElementById("status"));
const resultPanel = createResultPanel(
  document.getElementById("result-compare")
);

const START_Y = 0.12;
const REST_V = 8;

/** @typedef {{ y: number, v: number, bounces: number, apex: number, firstPeak: number | null, rising: boolean, restMs: number | null }} Hero */

function makeHero() {
  return {
    y: START_Y,
    v: 0,
    bounces: 0,
    apex: START_Y,
    firstPeak: /** @type {number | null} */ (null),
    rising: false,
    restMs: /** @type {number | null} */ (null),
  };
}

/** @type {Hero} */
let world = makeHero();
/** @type {Hero} */
let worldVar = makeHero();
/** @type {Hero} */
let worldFix = makeHero();
let acc = 0;
let accFix = 0;
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
let totalStepsVar = 0;
let totalStepsFix = 0;
/** @type {{ y: number, v: number }[]} */
let extras = [];
/** @type {{x:number,y:number}[]} */
let trail = [];
/** @type {{x:number,y:number}[]} */
let trailVar = [];
/** @type {{x:number,y:number}[]} */
let trailFix = [];
let fpsEma = 60;
let lowFpsMs = 0;
let elapsedMs = 0;
let suppressResult = false;

/** @type {ReturnType<typeof collectStats> | null} */
let prevResult = null;

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
function readBalls() {
  const n = Math.floor(Number(ballsEl?.value) || 1);
  return Math.min(200, Math.max(1, n));
}
function compareOn() {
  return !!compareEl?.checked;
}
function drawLoadOn() {
  return drawLoadEl ? !!drawLoadEl.checked : true;
}

function syncLabels() {
  if (fixedDtVal) fixedDtVal.textContent = readFixedDtMs().toFixed(1);
  if (lagVal) lagVal.textContent = String(readLagMs());
  if (maxStepsVal) maxStepsVal.textContent = String(readMaxSteps());
  if (ballsVal) ballsVal.textContent = String(readBalls());
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

function rebuildExtras() {
  const n = Math.max(0, readBalls() - 1);
  extras = [];
  for (let i = 0; i < n; i++) {
    extras.push({ y: START_Y, v: 0 });
  }
}

function resetWorld() {
  world = makeHero();
  worldVar = makeHero();
  worldFix = makeHero();
  acc = 0;
  accFix = 0;
  frameIndex = 0;
  log = [];
  spiralWarns = 0;
  totalSteps = 0;
  totalStepsVar = 0;
  totalStepsFix = 0;
  trail = [];
  trailVar = [];
  trailFix = [];
  fpsEma = 60;
  lowFpsMs = 0;
  elapsedMs = 0;
  rebuildExtras();
}

function floorY() {
  return C.floorY - C.ballRadius;
}

/**
 * @param {Hero} body
 * @param {number} dtSec
 * @param {number} elapsedNow
 */
function updateBody(body, dtSec, elapsedNow) {
  body.v += C.gravity * dtSec;
  body.y += body.v * dtSec;
  const floor = floorY();
  if (body.y > floor) {
    body.y = floor;
    body.v = -Math.abs(body.v) * C.restitution;
    body.bounces += 1;
    if (body.bounces === 1) {
      body.rising = true;
      body.apex = body.y;
    }
    if (Math.abs(body.v) < REST_V) {
      body.v = 0;
      if (body.restMs == null) body.restMs = elapsedNow;
    }
  }
  if (body.y < C.ballRadius) {
    body.y = C.ballRadius;
    body.v = Math.abs(body.v) * C.restitution;
  }
  if (body.rising && body.firstPeak == null) {
    if (body.y < body.apex) body.apex = body.y;
    if (body.v >= 0) {
      body.firstPeak = Math.max(0, floor - body.apex);
      body.rising = false;
    }
  }
}

function updateLoadBody(body, dtSec) {
  body.v += C.gravity * dtSec;
  body.y += body.v * dtSec;
  const floor = floorY();
  if (body.y > floor) {
    body.y = floor;
    body.v = -Math.abs(body.v) * C.restitution;
    if (Math.abs(body.v) < REST_V) body.v = 0;
  }
  if (body.y < C.ballRadius) {
    body.y = C.ballRadius;
    body.v = Math.abs(body.v) * C.restitution;
  }
}

function updateExtras(dtSec) {
  for (const b of extras) updateLoadBody(b, dtSec);
}

/**
 * @param {Hero} hero
 * @param {number} realMs
 * @param {"variable" | "fixed"} mode
 * @param {{ acc: number }} accBox
 * @param {boolean} withExtras
 */
function stepHero(hero, realMs, mode, accBox, withExtras) {
  let steps = 0;
  let clamped = false;
  if (mode === "variable") {
    const dt = Math.min(realMs / 1000, 0.1);
    updateBody(hero, dt, elapsedMs + realMs);
    if (withExtras) updateExtras(dt);
    steps = 1;
  } else {
    const fixedMs = readFixedDtMs();
    const fixedSec = fixedMs / 1000;
    const maxSteps = readMaxSteps();
    accBox.acc += Math.min(realMs, 250);
    while (accBox.acc >= fixedMs && steps < maxSteps) {
      updateBody(hero, fixedSec, elapsedMs + realMs);
      if (withExtras) updateExtras(fixedSec);
      accBox.acc -= fixedMs;
      steps += 1;
    }
    if (steps >= maxSteps && accBox.acc >= fixedMs) {
      clamped = true;
      accBox.acc = Math.min(accBox.acc, fixedMs * 2);
    }
  }
  return { steps, clamped, acc: accBox.acc };
}

function fmtNum(v, digits) {
  if (v == null || Number.isNaN(v)) return "—";
  return Number(v).toFixed(digits);
}

function collectStats() {
  const comparing = compareOn();
  const hero = comparing ? worldFix : world;
  const frames = Math.max(1, frameIndex);
  return {
    comparing,
    mode: comparing ? "compare" : readMode(),
    elapsedMs,
    frames: frameIndex,
    totalSteps: comparing ? totalStepsFix : totalSteps,
    totalStepsVar,
    totalStepsFix,
    avgUpdates: (comparing ? totalStepsFix : totalSteps) / frames,
    avgUpdatesVar: totalStepsVar / frames,
    avgUpdatesFix: totalStepsFix / frames,
    fps: fpsEma,
    firstPeak: comparing ? worldFix.firstPeak : hero.firstPeak,
    firstPeakVar: worldVar.firstPeak,
    firstPeakFix: worldFix.firstPeak,
    restMs: comparing ? worldFix.restMs : hero.restMs,
    restMsVar: worldVar.restMs,
    restMsFix: worldFix.restMs,
    spiralWarns,
  };
}

function cell(cur, prev, digits) {
  const a = fmtNum(cur, digits);
  if (prev == null) return a;
  const b = fmtNum(prev, digits);
  if (a === b) return `${a}（変わらず）`;
  return `${b} → ${a}`;
}

function showRunResult(commitPrev = true) {
  if (frameIndex <= 0) return;
  const cur = collectStats();
  const p = prevResult;
  const modeLabel =
    cur.mode === "variable" ? "可変" : cur.mode === "fixed" ? "固定" : "並走";
  let body = "";
  if (cur.comparing) {
    body = `
      <table class="gl-log-table">
        <thead><tr><th>項目</th><th>可変</th><th>固定</th><th>前回(固定)</th></tr></thead>
        <tbody>
          <tr><td>経過</td><td colspan="2">${fmtNum(cur.elapsedMs, 0)} ms</td><td>${p ? fmtNum(p.elapsedMs, 0) : "—"}</td></tr>
          <tr><td>更新回数</td><td>${cur.totalStepsVar}</td><td>${cur.totalStepsFix}</td><td>${p ? p.totalSteps : "—"}</td></tr>
          <tr><td>平均 updates/F</td><td>${fmtNum(cur.avgUpdatesVar, 2)}</td><td>${fmtNum(cur.avgUpdatesFix, 2)}</td><td>${p ? fmtNum(p.avgUpdates, 2) : "—"}</td></tr>
          <tr><td>平均 FPS（実測）</td><td colspan="2">${fmtNum(cur.fps, 0)}</td><td>${p ? fmtNum(p.fps, 0) : "—"}</td></tr>
          <tr><td>1バウンド目の最高点</td><td>${fmtNum(cur.firstPeakVar, 3)}</td><td>${fmtNum(cur.firstPeakFix, 3)}</td><td>${p ? fmtNum(p.firstPeak, 3) : "—"}</td></tr>
          <tr><td>停止までの時間</td><td>${fmtNum(cur.restMsVar, 0)} ms</td><td>${fmtNum(cur.restMsFix, 0)} ms</td><td>${p ? fmtNum(p.restMs, 0) : "—"}</td></tr>
        </tbody>
      </table>`;
  } else {
    body = `
      <table class="gl-log-table">
        <thead><tr><th>項目</th><th>今回</th></tr></thead>
        <tbody>
          <tr><td>モード</td><td>${modeLabel}${p && p.mode !== cur.mode ? `（前回 ${p.mode === "variable" ? "可変" : p.mode === "fixed" ? "固定" : "並走"}）` : ""}</td></tr>
          <tr><td>経過時間</td><td>${cell(cur.elapsedMs, p?.elapsedMs, 0)} ms</td></tr>
          <tr><td>更新回数</td><td>${cell(cur.totalSteps, p?.totalSteps, 0)}</td></tr>
          <tr><td>平均 updates/フレーム</td><td>${cell(cur.avgUpdates, p?.avgUpdates, 2)}</td></tr>
          <tr><td>平均 FPS（実測）</td><td>${cell(cur.fps, p?.fps, 0)}</td></tr>
          <tr><td>1バウンド目の最高点</td><td>${cell(cur.firstPeak, p?.firstPeak, 3)}</td></tr>
          <tr><td>床で停止するまでの時間</td><td>${cell(cur.restMs, p?.restMs, 0)} ms</td></tr>
        </tbody>
      </table>`;
  }
  const spiral =
    cur.spiralWarns > 0
      ? `<p class="result-note">MAX_STEPS 打ち切り ${cur.spiralWarns} 回。固定更新が追いつき切れていません。</p>`
      : "";
  resultPanel.show(`
    <h3>この実行の結果</h3>
    ${body}
    ${spiral}
    <p class="result-note">最高点は床からの正規化座標。FPS は実測なので実行ごとに少し変わります。更新回数と最高点は同じ操作なら一致します。</p>
  `);
  if (commitPrev) prevResult = cur;
}

/**
 * @param {number} realDtMs 実経過（人工遅延込み）
 */
function runFrame(realDtMs) {
  const lag = readLagMs();
  const realMs = realDtMs + lag;
  let steps = 0;
  let clamped = false;

  setPhase("update");

  if (compareOn()) {
    const boxV = { acc: 0 };
    const boxF = { acc: accFix };
    const rV = stepHero(worldVar, realMs, "variable", boxV, false);
    const rF = stepHero(worldFix, realMs, "fixed", boxF, true);
    accFix = rF.acc;
    steps = rF.steps;
    clamped = rF.clamped;
    totalStepsVar += rV.steps;
    totalStepsFix += rF.steps;
    totalSteps += rF.steps;
    if (rF.clamped) spiralWarns += 1;
  } else {
    const box = { acc };
    const r = stepHero(world, realMs, readMode(), box, true);
    acc = r.acc;
    steps = r.steps;
    clamped = r.clamped;
    totalSteps += r.steps;
    if (r.clamped) spiralWarns += 1;
  }

  elapsedMs += realMs;
  const fps = realMs > 0.5 ? 1000 / realMs : 60;
  fpsEma = fpsEma * 0.85 + fps * 0.15;
  if (fpsEl) {
    fpsEl.textContent = `FPS: ${fpsEma.toFixed(0)}（実測 ${fps.toFixed(0)}）  負荷 ${Math.max(0, readBalls() - 1)}`;
  }
  if (fpsEma < 15) lowFpsMs += realMs;
  else lowFpsMs = 0;
  if (lowFpsMs > 2000 && readBalls() > 1) {
    const next = Math.max(1, Math.floor(readBalls() / 2));
    if (ballsEl) ballsEl.value = String(next);
    syncLabels();
    lowFpsMs = 0;
    const was = running;
    suppressResult = true;
    resetWorld();
    suppressResult = false;
    setStatus(`⚠ FPS が低いためボール数を ${next} に戻しました`);
    if (!was) draw();
  }

  setPhase("render");
  frameIndex += 1;
  log.unshift({
    i: frameIndex,
    realMs,
    steps,
    accMs: compareOn() || readMode() === "fixed" ? (compareOn() ? accFix : acc) : 0,
    mode: compareOn() ? "compare" : readMode(),
    clamped,
  });
  if (log.length > C.logMax) log.pop();

  draw();
  renderLog();

  if (clamped) {
    setStatus(
      `フレーム #${frameIndex}: realDt=${realMs.toFixed(1)}ms / steps=${steps} ★MAX_STEPS で打ち切り（追いつき切れず）`
    );
  } else {
    setStatus(
      `フレーム #${frameIndex}: ${compareOn() ? "並走" : readMode()} realDt=${realMs.toFixed(1)}ms / updates=${steps}`
    );
  }
  setPhase(running ? "run" : "idle");

  const floor = floorY();
  if (loopEl?.checked) {
    const h = compareOn() ? worldFix : world;
    if (Math.abs(h.v) < REST_V && h.y >= floor - 0.002) {
      const wasRunning = running;
      suppressResult = true;
      resetWorld();
      suppressResult = false;
      if (!wasRunning) draw();
    }
  }
}

function drawHero(hero, cx, trailPts, color, label) {
  if (!ctx || !canvas) return;
  const W = canvas.width;
  const H = canvas.height;
  const floorPy = (C.floorY / C.worldHeight) * H;
  const cy = (hero.y / C.worldHeight) * H;
  const r = (C.ballRadius / C.worldHeight) * H;
  if (trailEl?.checked && trailPts) {
    trailPts.push({ x: cx, y: cy });
    if (trailPts.length > 90) trailPts.shift();
    drawTrailDots(ctx, trailPts, { rgb: color, radius: 2 });
  }
  ctx.fillStyle = `rgb(${color})`;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8ec0e8";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "#f2cc8f";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy + hero.v * 0.04);
  ctx.stroke();
  if (label) {
    ctx.fillStyle = "#9aabbf";
    ctx.font = "12px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText(label, cx, 16);
    ctx.textAlign = "left";
  }
  void W;
  void floorPy;
}

function drawLoadStrip() {
  if (!ctx || !canvas || !drawLoadOn() || extras.length === 0) return;
  const W = canvas.width;
  const H = canvas.height;
  const floorPy = (C.floorY / C.worldHeight) * H;
  const top = floorPy + 10;
  const stripH = Math.max(18, H - top - 4);
  ctx.fillStyle = "rgba(26,35,50,0.95)";
  ctx.fillRect(0, top - 2, W, stripH + 4);
  ctx.fillStyle = "#6a7d94";
  ctx.font = "10px sans-serif";
  ctx.fillText("負荷", 6, top + 10);
  const cols = 40;
  const r = 2.2;
  for (let i = 0; i < extras.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const bx = 40 + col * ((W - 48) / cols);
    const t = extras[i].y / C.worldHeight;
    const by = top + 8 + row * 7 + t * (stripH - 16);
    ctx.fillStyle = "#8a9bb0";
    ctx.beginPath();
    ctx.arc(bx, Math.min(H - 3, by), r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function draw() {
  if (!ctx || !canvas) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  const floorPy = (C.floorY / C.worldHeight) * H;
  ctx.fillStyle = "#3d4f66";
  ctx.fillRect(0, floorPy, W, Math.max(4, H * 0.04));
  ctx.strokeStyle = "#5a6a80";
  ctx.beginPath();
  ctx.moveTo(0, floorPy);
  ctx.lineTo(W, floorPy);
  ctx.stroke();

  ctx.strokeStyle = "rgba(90,106,128,0.35)";
  for (let i = 1; i < 4; i++) {
    const y = (i / 4) * floorPy;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  if (compareOn()) {
    ctx.strokeStyle = "rgba(90,106,128,0.6)";
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, floorPy);
    ctx.stroke();
    drawHero(worldVar, W * 0.25, trailVar, "91,159,212", "可変");
    drawHero(worldFix, W * 0.75, trailFix, "107,203,143", "固定");
  } else {
    const r = (C.ballRadius / C.worldHeight) * H;
    void r;
    drawHero(world, W * 0.5, trail, "91,159,212", "");
  }

  drawLoadStrip();

  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px ui-monospace, monospace";
  ctx.textAlign = "left";
  const h = compareOn() ? worldFix : world;
  ctx.fillText(
    `y=${h.y.toFixed(3)}  v=${h.v.toFixed(1)}  ${compareOn() ? "並走" : readMode()}`,
    12,
    floorPy - 8
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
      const mode =
        e.mode === "fixed" ? "固定" : e.mode === "variable" ? "可変" : "並走";
      return `<tr${warn}>
        <td>#${e.i}</td>
        <td>${mode}</td>
        <td>${e.realMs.toFixed(1)}</td>
        <td>${e.steps}</td>
        <td>${e.mode === "variable" ? "—" : e.accMs.toFixed(1)}</td>
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
  const wasRunning = running;
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
  if (wasRunning && !suppressResult) showRunResult();
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
    setStatus("一時停止 — 結果を下に表示");
    return;
  }
  startLoop();
}

function restartFromControls() {
  const was = running;
  suppressResult = true;
  stopLoop();
  suppressResult = false;
  resetWorld();
  draw();
  renderLog();
  if (was) startLoop();
}

btnPlay?.addEventListener("click", togglePlay);
btnStep?.addEventListener("click", () => {
  suppressResult = true;
  stopLoop();
  suppressResult = false;
  runFrame(1000 / 60);
  showRunResult(false);
});
btnReset?.addEventListener("click", () => {
  suppressResult = true;
  stopLoop();
  suppressResult = false;
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
ballsEl?.addEventListener("input", () => {
  syncLabels();
  restartFromControls();
});
ballsEl?.addEventListener("change", () => {
  syncLabels();
  setStatus(`負荷ボール ${Math.max(0, readBalls() - 1)} 個。同じ高さからやり直します`);
});
compareEl?.addEventListener("change", () => {
  restartFromControls();
  setStatus(compareOn() ? "可変（左）と固定（右）を同時に実行します" : "単一モード");
});
drawLoadEl?.addEventListener("change", () => {
  draw();
});

loadTextSample(
  "../samples/GameLoopExample.cs",
  csharpSample,
  "// samples/GameLoopExample.cs を読み込めませんでした。"
);

syncLabels();
resetWorld();
draw();
renderLog();

const urlSpec = {
  mode: { el: modeEl, kind: "select" },
  dt: { el: fixedDtEl, kind: "range" },
  lag: { el: lagEl, kind: "range" },
  maxsteps: { el: maxStepsEl, kind: "range" },
  balls: { el: ballsEl, kind: "range" },
  loop: { el: loopEl, kind: "checkbox" },
  trail: { el: trailEl, kind: "checkbox" },
  drawload: { el: drawLoadEl, kind: "checkbox" },
  compare: { el: compareEl, kind: "checkbox" },
};
mountShareLink({
  spec: urlSpec,
  button: document.getElementById("btn-copy-url"),
  statusEl: document.getElementById("status"),
});
const urlResult = applyParamsToControls(urlSpec);
syncLabels();
resetWorld();
draw();
if (urlResult.warning) {
  setStatus(urlResult.warning);
} else if (!urlResult.applied.length) {
  setStatus("準備完了 — 固定 timestep が既定。人工遅延を上げて重いフレームを試す");
}
