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
  readSpeedScale,
  bindSpeedScaleControl,
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
const lagModeEl = /** @type {HTMLSelectElement} */ (
  document.getElementById("lag-mode")
);
const refEl = /** @type {HTMLInputElement} */ (document.getElementById("ref"));
const speedVal = document.getElementById("speed-val");
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
const REST_V = C.restVelocity;
/** 浮動小数の誤差で FIXED_DT ちょうどの時間が「足りない」と判定されないように */
const ACC_EPS = 1e-6;

/** @typedef {{ t: number, y: number }} TimePoint */
/**
 * simMs: 物理が進んだ時間。横軸の位置に使う
 * updates: 更新1回ごとの位置（小さい点） / frames: 描画した位置（輪）
 * @typedef {{ y: number, v: number, bounces: number, apex: number, firstPeak: number | null, rising: boolean, restMs: number | null, simMs: number, updates: TimePoint[], frames: TimePoint[] }} Hero
 */

function makeHero() {
  return {
    y: START_Y,
    v: 0,
    bounces: 0,
    apex: START_Y,
    firstPeak: /** @type {number | null} */ (null),
    rising: false,
    restMs: /** @type {number | null} */ (null),
    simMs: 0,
    updates: /** @type {TimePoint[]} */ ([]),
    frames: /** @type {TimePoint[]} */ ([]),
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
let fpsEma = 60;
/** 再生中: 実時間（再生速度を掛けたもの）の溜まり。フレーム間隔に達したら1フレーム進める */
let wallAcc = 0;
let lastSimTs = 0;
/** 直近フレームの表示用 */
let lastFrame = { realMs: 0, steps: 0 };
let lowFpsMs = 0;
let elapsedMs = 0;
let suppressResult = false;

/** @type {ReturnType<typeof collectStats> | null} */
let prevResult = null;

function readFixedDtMs() {
  const v = Math.min(
    C.maxFixedDtMs,
    Math.max(C.minFixedDtMs, Number(fixedDtEl.value) || C.defaultFixedDtMs)
  );
  // スライダーは 0.1 ms 刻み。16.7 のように整数 Hz の周期に近い値はその周期（1000/60 など）として扱う。
  // そうしないと描画 1 回（1000/60 ms）と FIXED_DT がわずかにずれ、ときどき更新 0 回や 2 回のフレームが出る
  const hz = Math.round(1000 / v);
  const exact = 1000 / hz;
  return Math.abs(exact - v) < 0.05 ? exact : v;
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
function spikeOn() {
  return lagModeEl?.value === "1";
}
function refOn() {
  return refEl ? !!refEl.checked : true;
}
/**
 * i 番目（1 始まり）のフレームにかける人工遅延。「ときどき重い」は spikeEvery ごとに1回だけ
 * @param {number} i
 */
function lagForFrame(i) {
  const lag = readLagMs();
  if (!spikeOn()) return lag;
  return i % C.spikeEvery === 0 ? lag : 0;
}
/** @param {number} i */
function frameMsFor(i) {
  return C.frameMs + lagForFrame(i);
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
  fpsEma = 60;
  lowFpsMs = 0;
  elapsedMs = 0;
  wallAcc = 0;
  lastSimTs = 0;
  lastFrame = { realMs: 0, steps: 0 };
  rebuildExtras();
}

function floorY() {
  return C.floorY - C.ballRadius;
}

/**
 * @param {Hero} body
 * @param {number} dtSec
 * @param {boolean} [record] 更新1回ごとの位置を残す（正解の軌道の計算では残さない）
 */
function updateBody(body, dtSec, record = true) {
  body.v += C.gravity * dtSec;
  body.y += body.v * dtSec;
  body.simMs += dtSec * 1000;
  const elapsedNow = body.simMs;
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
  if (record) body.updates.push({ t: body.simMs, y: body.y });
}

/** 正解の軌道: 同じ物理を 1 ms 刻みで計算したもの（描画用に 10 ms ごとに間引く） */
const REF = (() => {
  const b = makeHero();
  /** @type {TimePoint[]} */
  const pts = [{ t: 0, y: b.y }];
  let n = 0;
  while (b.simMs < C.windowMs) {
    updateBody(b, C.refDtMs / 1000, false);
    if (++n % 10 === 0) pts.push({ t: b.simMs, y: b.y });
  }
  return { pts, firstPeak: b.firstPeak, restMs: b.restMs };
})();

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
    updateBody(hero, dt);
    if (withExtras) updateExtras(dt);
    steps = 1;
  } else {
    const fixedMs = readFixedDtMs();
    const fixedSec = fixedMs / 1000;
    const maxSteps = readMaxSteps();
    accBox.acc += Math.min(realMs, 250);
    while (accBox.acc + ACC_EPS >= fixedMs && steps < maxSteps) {
      updateBody(hero, fixedSec);
      if (withExtras) updateExtras(fixedSec);
      accBox.acc -= fixedMs;
      steps += 1;
    }
    if (steps >= maxSteps && accBox.acc + ACC_EPS >= fixedMs) {
      clamped = true;
      accBox.acc = Math.min(accBox.acc, fixedMs * 2);
    }
  }
  hero.frames.push({ t: hero.simMs, y: hero.y });
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
          <tr><td>平均 FPS</td><td colspan="2">${fmtNum(cur.fps, 0)}</td><td>${p ? fmtNum(p.fps, 0) : "—"}</td></tr>
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
          <tr><td>平均 FPS</td><td>${cell(cur.fps, p?.fps, 0)}</td></tr>
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
    <p class="result-note">正解（同じ物理を 1 ms 刻みで計算）: 最高点 ${fmtNum(REF.firstPeak, 3)}、停止まで ${fmtNum(REF.restMs, 0)} ms。キャンバスの点線がこの軌道です。</p>
    <p class="result-note">最高点は床からの正規化座標。更新回数と最高点は同じ操作なら一致します（負荷ボールで実際に重くなったときを除く）。</p>
  `);
  if (commitPrev) prevResult = cur;
}

/**
 * @param {number} realMs このフレームの実経過（人工遅延込み）
 */
function runFrame(realMs) {
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
    fpsEl.textContent = `FPS: ${fpsEma.toFixed(0)}（このフレーム ${fps.toFixed(0)}）  負荷 ${Math.max(0, readBalls() - 1)}`;
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
  lastFrame = { realMs, steps };
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

  // 横軸（windowMs）の右端まで進んだら、繰り返しなら最初から、そうでなければ止めて結果を出す
  const simNow = compareOn() ? Math.min(worldVar.simMs, worldFix.simMs) : world.simMs;
  if (simNow >= C.windowMs) {
    if (loopEl?.checked) {
      const wasRunning = running;
      suppressResult = true;
      resetWorld();
      suppressResult = false;
      if (!wasRunning) draw();
    } else if (running) {
      stopLoop();
      setStatus(`${(C.windowMs / 1000).toFixed(0)} 秒分を再生しました — 結果を右に表示。リセットでやり直し`);
    }
  }
}

const PAD_L = 34;
const PAD_R = 14;
const COLOR_VAR = "91,159,212";
const COLOR_FIX = "107,203,143";

/** 横軸: シミュレーション時間 → x */
function xOf(tMs) {
  const W = canvas.width;
  return PAD_L + (Math.min(tMs, C.windowMs) / C.windowMs) * (W - PAD_L - PAD_R);
}
function yOf(y) {
  return (y / C.worldHeight) * canvas.height;
}

function drawReference() {
  if (!ctx || !refOn()) return;
  ctx.save();
  ctx.strokeStyle = "rgba(220,226,235,0.45)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  REF.pts.forEach((p, i) => {
    const x = xOf(p.t);
    const y = yOf(p.y);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.restore();
}

/**
 * 更新1回ごと = 小さい点、描画した位置 = 輪、今の位置 = ボール
 * @param {Hero} hero
 * @param {string} color "r,g,b"
 * @param {string} label
 */
function drawHero(hero, color, label) {
  if (!ctx || !canvas) return;
  const H = canvas.height;
  if (trailEl?.checked) {
    ctx.fillStyle = `rgba(${color},0.9)`;
    for (const p of hero.updates) {
      ctx.beginPath();
      ctx.arc(xOf(p.t), yOf(p.y), 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = `rgba(${color},0.75)`;
    ctx.lineWidth = 1.5;
    for (const p of hero.frames) {
      ctx.beginPath();
      ctx.arc(xOf(p.t), yOf(p.y), 4.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  const cx = xOf(hero.simMs);
  const cy = yOf(hero.y);
  const r = (C.ballRadius / C.worldHeight) * H;
  ctx.fillStyle = `rgba(${color},0.85)`;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#dfe8f2";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // 速度の矢印（0.05 秒で進む距離）
  ctx.strokeStyle = "#f2cc8f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy + yOf(hero.v) * 0.05);
  ctx.stroke();
  if (label) {
    // 並走で2つのボールが重なってもラベルが重ならないよう、可変は左・固定は右に書く
    const left = color === COLOR_VAR;
    ctx.fillStyle = `rgb(${color})`;
    ctx.font = "bold 12px ui-monospace, monospace";
    ctx.textAlign = left ? "right" : "left";
    ctx.fillText(label, left ? cx - r - 4 : cx + r + 4, cy - r);
    ctx.textAlign = "left";
  }
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

  // 時間の目盛り（0.5 秒ごと）
  ctx.font = "10px ui-monospace, monospace";
  ctx.textAlign = "center";
  for (let t = 0; t <= C.windowMs; t += 500) {
    const x = xOf(t);
    ctx.strokeStyle = t % 1000 === 0 ? "rgba(90,106,128,0.45)" : "rgba(90,106,128,0.2)";
    ctx.beginPath();
    ctx.moveTo(x, 22);
    ctx.lineTo(x, floorPy);
    ctx.stroke();
    ctx.fillStyle = "#6a7d94";
    ctx.fillText(`${(t / 1000).toFixed(1)}s`, x, floorPy + 12);
  }
  ctx.textAlign = "left";

  drawReference();
  if (compareOn()) {
    drawHero(worldVar, COLOR_VAR, "可変");
    drawHero(worldFix, COLOR_FIX, "固定");
  } else {
    const fixed = readMode() === "fixed";
    drawHero(world, fixed ? COLOR_FIX : COLOR_VAR, fixed ? "固定" : "可変");
  }

  drawLoadStrip();

  // このフレームで何回更新したか
  ctx.fillStyle = "#c9d4e0";
  ctx.font = "12px ui-monospace, monospace";
  ctx.textAlign = "left";
  const label = compareOn() ? "並走（更新回数は固定側）" : readMode() === "fixed" ? "固定" : "可変";
  ctx.fillText(
    frameIndex > 0
      ? `フレーム #${frameIndex}  実経過 ${lastFrame.realMs.toFixed(1)} ms  更新 ${lastFrame.steps} 回  ${label}`
      : `フレーム #0  ${label}`,
    8,
    15
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
        <td>${e.mode === "variable" ? "—" : Math.max(0, e.accMs).toFixed(1)}</td>
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

/**
 * 再生: requestAnimationFrame で実時間を溜め、次のフレームの間隔（基本 + 人工遅延）に達したら1フレーム進める。
 * 人工遅延は描画の間隔そのものを伸ばすので、重いフレームは「カクカクになる」ように見える（進む速さは同じ）。
 * 再生速度は溜める実時間に掛ける。負荷ボールで実際に間隔が大きく伸びたときだけ、実測の経過を使う。
 */
function scheduleNext() {
  if (!running) return;
  rafId = requestAnimationFrame((ts) => {
    if (!running) return;
    const scale = readSpeedScale(speedEl);
    if (!lastTs) lastTs = ts;
    const dt = Math.min(250, Math.max(0, ts - lastTs));
    lastTs = ts;
    wallAcc += dt * scale;
    const need = frameMsFor(frameIndex + 1);
    if (wallAcc + 2 >= need) {
      let realMs = need;
      if (lastSimTs) {
        const since = (ts - lastSimTs) * scale;
        if (since > need * 1.5 + 8) realMs = Math.min(250, since);
      }
      wallAcc = Math.max(0, wallAcc - realMs);
      if (wallAcc > need) wallAcc = 0;
      lastSimTs = ts;
      runFrame(realMs);
    }
    scheduleNext();
  });
}

function startLoop() {
  if (running) return;
  running = true;
  lastTs = 0;
  lastSimTs = 0;
  wallAcc = 0;
  if (btnPlay) btnPlay.textContent = "一時停止";
  setPhase("run");
  scheduleNext();
}

function togglePlay() {
  if (running) {
    stopLoop();
    setStatus("一時停止 — 結果を右に表示");
    return;
  }
  const simNow = compareOn() ? Math.min(worldVar.simMs, worldFix.simMs) : world.simMs;
  if (simNow >= C.windowMs) {
    resetWorld();
    draw();
    renderLog();
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
  runFrame(frameMsFor(frameIndex + 1));
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

for (const el of [fixedDtEl, lagEl, maxStepsEl, modeEl, lagModeEl]) {
  el?.addEventListener("input", () => {
    syncLabels();
  });
  el?.addEventListener("change", () => {
    syncLabels();
    setStatus(
      `設定: mode=${readMode()} FIXED=${readFixedDtMs().toFixed(1)}ms lag=${readLagMs()}${spikeOn() ? `（${C.spikeEvery}フレームに1回）` : ""} maxSteps=${readMaxSteps()}`
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
for (const el of [trailEl, refEl, modeEl]) {
  el?.addEventListener("change", () => draw());
}

bindSpeedScaleControl(speedEl, speedVal);
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
  spike: { el: lagModeEl, kind: "select" },
  maxsteps: { el: maxStepsEl, kind: "range" },
  speed: { el: speedEl, kind: "range" },
  balls: { el: ballsEl, kind: "range" },
  loop: { el: loopEl, kind: "checkbox" },
  trail: { el: trailEl, kind: "checkbox" },
  drawload: { el: drawLoadEl, kind: "checkbox" },
  compare: { el: compareEl, kind: "checkbox" },
  ref: { el: refEl, kind: "checkbox" },
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
  setStatus("準備完了 — 固定 timestep が既定。「可変と固定を並べる」をオンにして人工遅延を上げると差が出る");
}
