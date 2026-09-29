/**
 * 入力の基礎 — held / down / up / 長押し
 * @see docs/topics/input-basics/SPEC.md
 */

import {
  INPUT_ACTIONS,
  INPUT_BASICS_CONFIG as C,
} from "./maps/input-basics-config.js";
import {
  createStatus,
  createResultPanel,
  loadTextSample,
  mountTopicShellFromDataset,
  applyParamsToControls,
  mountShareLink,
  readSpeedScale,
  bindSpeedScaleControl,
  mountGlossary,
} from "./platform/index.js";

mountTopicShellFromDataset();
mountGlossary();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("ib-canvas")
);
const ctx = canvas.getContext("2d");
const actionPanels = document.getElementById("action-panels");
const eventLogEl = document.getElementById("event-log");
const focusHint = document.getElementById("focus-hint");
const btnPlay = document.getElementById("btn-play");
const btnStep = document.getElementById("btn-step");
const btnReset = document.getElementById("btn-reset");
const longMsEl = /** @type {HTMLInputElement} */ (
  document.getElementById("long-ms")
);
const longMsVal = document.getElementById("long-ms-val");
const speedEl = /** @type {HTMLInputElement} */ (
  document.getElementById("speed")
);
const speedVal = document.getElementById("speed-val");
const tlCanvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("ib-timeline")
);
const tlCtx = tlCanvas?.getContext("2d");
const csharpSample = document.getElementById("csharp-sample");

const setStatus = createStatus(document.getElementById("status"));
const resultPanel = createResultPanel(
  document.getElementById("result-compare")
);

/** @type {Set<string>} */
const rawDown = new Set();

/**
 * @typedef {{
 *   held: boolean,
 *   down: boolean,
 *   up: boolean,
 *   holdTime: number,
 *   longPressFired: boolean,
 * }} ActionRuntime
 */

/** @type {Record<string, ActionRuntime>} */
const actions = {};
for (const a of INPUT_ACTIONS) {
  actions[a.id] = {
    held: false,
    down: false,
    up: false,
    holdTime: 0,
    longPressFired: false,
  };
}

let playerX = 0.5;
/** 今のジャンプの残り時間（秒）。0 なら接地。down のときだけ始め、押し続けでは始めない */
let jumpLeft = 0;
/** 空中にもう一度 down が来たとき、着地後に続ける回数 */
let jumpQueued = 0;
const JUMP_SEC = 0.48;
const JUMP_PX = 96;
let jumpCount = 0;
let fireCount = 0;
/** Z を離したあと、結果欄に残す文。次に Fire を押し始めたら消す */
let fireResetNote = "";
let chargeCount = 0;
let frameIndex = 0;
/** @type {string[]} */
let eventLog = [];
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
let focused = false;
/** 帯グラフの時刻。再生中に進んだ分だけを足す（実時間そのものではない）。 */
let simMs = 0;
/** @type {Record<string, number | null>} */
const holdStartMs = {};
/** @type {{ id: string, t0: number, t1: number | null, long: boolean }[]} */
let bands = [];

function readLongMs() {
  return Math.min(
    C.maxLongPressMs,
    Math.max(C.minLongPressMs, Number(longMsEl?.value) || C.defaultLongPressMs)
  );
}

function syncLabels() {
  if (longMsVal) longMsVal.textContent = String(readLongMs());
  if (speedVal) speedVal.textContent = readSpeedScale(speedEl).toFixed(1);
}

function keyMatches(action, code, key) {
  return action.keys.some(
    (k) => k === code || k === key || k.toLowerCase() === (key || "").toLowerCase()
  );
}

function isActionRawDown(action) {
  for (const k of rawDown) {
    // rawDown stores KeyboardEvent.code primarily
    if (action.keys.includes(k)) return true;
  }
  // also check by matching any code in set against keys list loosely
  for (const code of rawDown) {
    if (keyMatches(action, code, code)) return true;
  }
  return false;
}

/**
 * @param {number} dtSec
 */
function pollActions(dtSec) {
  const thr = readLongMs() / 1000;
  /** @type {string[]} */
  const edges = [];

  for (const def of INPUT_ACTIONS) {
    const st = actions[def.id];
    const prev = st.held;
    const now = isActionRawDown(def);
    st.held = now;
    st.down = now && !prev;
    st.up = !now && prev;

    if (st.down) holdStartMs[def.id] = performance.now();
    if (st.held && holdStartMs[def.id] != null) {
      st.holdTime = (performance.now() - holdStartMs[def.id]) / 1000;
    } else {
      st.holdTime = 0;
      st.longPressFired = false;
      holdStartMs[def.id] = null;
    }

    if (st.down) {
      edges.push(`${def.label} DOWN`);
      bands.push({ id: def.id, t0: simMs, t1: null, long: false });
    }
    if (st.up) {
      edges.push(
        def.id === "fire"
          ? `${def.label} UP（${fireCount} → 0）`
          : `${def.label} UP`
      );
      for (let i = bands.length - 1; i >= 0; i--) {
        if (bands[i].id === def.id && bands[i].t1 == null) {
          bands[i].t1 = simMs;
          break;
        }
      }
    }

    // 長押し消費
    if (
      def.id === "charge" &&
      st.held &&
      !st.longPressFired &&
      st.holdTime >= thr
    ) {
      st.longPressFired = true;
      chargeCount += 1;
      edges.push(`${def.label} LONG (≥${readLongMs()}ms)`);
      for (let i = bands.length - 1; i >= 0; i--) {
        if (bands[i].id === def.id && bands[i].t1 == null) {
          bands[i].long = true;
          break;
        }
      }
    }
  }

  // Jump: down only。押し続け（held）では始めない
  if (actions.jump.down) {
    jumpCount += 1;
    if (jumpLeft <= 0) jumpLeft = JUMP_SEC;
    else jumpQueued += 1;
  }

  // Fire: held のあいだ毎フレーム +1。離したフレーム（up）で 0 に戻す
  if (actions.fire.down) fireResetNote = "";
  if (actions.fire.held) fireCount += 1;
  if (actions.fire.up) {
    fireResetNote = `離す前は ${fireCount} 回でした。Z の up で 0 に戻しています。`;
    fireCount = 0;
  }

  // Move: held
  if (actions.move.held) {
    // ArrowRight / ArrowLeft in rawDown
    let dir = 0;
    if (rawDown.has("ArrowRight")) dir += 1;
    if (rawDown.has("ArrowLeft")) dir -= 1;
    playerX += dir * C.moveSpeed * dtSec;
    playerX = Math.max(0.08, Math.min(0.92, playerX));
  }

  if (edges.length) {
    for (const e of edges) {
      eventLog.unshift(`#${frameIndex} ${e}`);
    }
    if (eventLog.length > C.logMax) eventLog.length = C.logMax;
  }
}

/**
 * @param {number} realDtMs シミュレーションの1歩（移動などに使う）
 * @param {number} [bandMs] 帯グラフの時刻を進める量。再生中は実経過時間、
 *   1ステップでは1歩分。長押しの判定は実時間なので、帯グラフもそれに揃える
 *   （再生速度を落としても、1秒の長押しが帯グラフ上で1秒に見えるように）。
 */
function tick(realDtMs, bandMs = realDtMs) {
  const dt = Math.min(realDtMs, 50) / 1000;
  // 帯グラフの時刻は「再生中に進んだ分」だけを足す。1ステップのクリック間隔や
  // 一時停止中の時間は入れない（壁時計の差分をそのまま使わない）。
  simMs += bandMs;
  frameIndex += 1;
  pollActions(dt);
  advanceJump(dt);
  draw();
  drawTimeline();
  renderPanels();
  renderEventLog();

  const j = actions.jump;
  const f = actions.fire;
  setStatus(
    `F#${frameIndex} Jump ${j.held ? "held" : "—"}${j.down ? " DOWN" : ""}` +
      ` · Fire fires=${fireCount}` +
      ` · Charge=${chargeCount} · JumpCount=${jumpCount}`
  );

  if (f.held && f.holdTime > 0.15 && !j.down) {
    resultPanel.show(`
      <p class="result-verdict">Fire は held 連射中（今 ${fireCount}）</p>
      <p class="result-note">
        Z を押し続けると毎フレーム Fire が +1 されます。離したフレーム（up）で 0 に戻ります。
        Jump（Space）は down なので、押し続けても 1 回だけです。
      </p>
    `);
  } else if (actions.charge.held && !actions.charge.longPressFired) {
    const thr = readLongMs();
    const pct = Math.min(100, (actions.charge.holdTime * 1000 * 100) / thr);
    resultPanel.show(`
      <p class="result-verdict">チャージ中 ${pct.toFixed(0)}%</p>
      <p class="result-note">X を ${thr} ms 以上押し続けると LONG が 1 回だけ発火します。</p>
    `);
  } else if (fireResetNote) {
    resultPanel.show(`
      <p class="result-verdict">Fire を 0 に戻した</p>
      <p class="result-note">${fireResetNote}</p>
    `);
  } else {
    resultPanel.hide();
  }
}

/** 経過割合 0→1 の放物線。端は 0、真ん中が JUMP_PX */
function jumpLiftPx() {
  if (jumpLeft <= 0) return 0;
  const u = 1 - jumpLeft / JUMP_SEC;
  return 4 * JUMP_PX * u * (1 - u);
}

/**
 * @param {number} dtSec
 */
function advanceJump(dtSec) {
  if (jumpLeft <= 0) return;
  jumpLeft = Math.max(0, jumpLeft - dtSec);
  if (jumpLeft === 0 && jumpQueued > 0) {
    jumpQueued -= 1;
    jumpLeft = JUMP_SEC;
  }
}

function draw() {
  if (!ctx || !canvas) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  // ground
  const gy = H * 0.72;
  ctx.fillStyle = "#3d4f66";
  ctx.fillRect(0, gy, W, H - gy);

  // player。足は地面。Jump の down で一度だけ放物線を描く
  const px = playerX * W;
  const lift = jumpLiftPx();
  const bodyW = 28;
  const bodyH = 40;
  const footY = gy - lift;
  const shadowW = 16 * (1 - 0.4 * (lift / JUMP_PX));
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(px, gy + 4, Math.max(6, shadowW), 4, 0, 0, Math.PI * 2);
  ctx.fill();
  const py = footY - bodyH + 28;
  ctx.fillStyle = "#6bcb8f";
  ctx.fillRect(px - bodyW / 2, footY - bodyH, bodyW, bodyH);
  ctx.strokeStyle = "#9ee0b8";
  ctx.strokeRect(px - bodyW / 2, footY - bodyH, bodyW, bodyH);

  // charge bar
  const thr = readLongMs() / 1000;
  if (actions.charge.held) {
    const w = Math.min(1, actions.charge.holdTime / thr) * 80;
    ctx.fillStyle = "#f2cc8f";
    ctx.fillRect(px - 40, py - 50, w, 6);
    ctx.strokeStyle = "#a08050";
    ctx.strokeRect(px - 40, py - 50, 80, 6);
  }

  // bullets for fire
  ctx.fillStyle = "#e07a5f";
  const n = Math.min(12, fireCount % 24);
  for (let i = 0; i < n; i++) {
    ctx.fillRect(px + 20 + i * 10, py - 10, 6, 3);
  }

  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.fillText(
    `Jump×${jumpCount}  Fire×${fireCount}  Charge×${chargeCount}  x=${playerX.toFixed(2)}`,
    12,
    18
  );

  if (!focused) {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#e8eef6";
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("クリックしてキー入力を有効化", W / 2, H / 2);
  }
}

function drawTimeline() {
  if (!tlCtx || !tlCanvas) return;
  const W = tlCanvas.width;
  const H = tlCanvas.height;
  tlCtx.fillStyle = "#0a0e14";
  tlCtx.fillRect(0, 0, W, H);
  const windowMs = 4000;
  const tEnd = Math.max(windowMs, simMs);
  const t0 = tEnd - windowMs;
  const rows = INPUT_ACTIONS;
  const rowH = (H - 18) / rows.length;
  const xAt = (t) => 56 + ((t - t0) / windowMs) * (W - 64);
  tlCtx.fillStyle = "#9aabbf";
  tlCtx.font = "11px sans-serif";
  rows.forEach((def, i) => {
    const y = 14 + i * rowH;
    tlCtx.fillStyle = "#9aabbf";
    tlCtx.fillText(def.label, 4, y + rowH * 0.55);
    tlCtx.fillStyle = "rgba(61,79,102,0.5)";
    tlCtx.fillRect(56, y + 6, W - 64, rowH - 12);
  });
  const thr = readLongMs();
  for (const b of bands) {
    const i = rows.findIndex((d) => d.id === b.id);
    if (i < 0) continue;
    const y = 14 + i * rowH;
    const x1 = xAt(b.t0);
    const x2 = xAt(b.t1 == null ? simMs : b.t1);
    if (x2 < 56 || x1 > W) continue;
    tlCtx.fillStyle = b.long ? "rgba(242,204,143,0.85)" : "rgba(91,159,212,0.75)";
    tlCtx.fillRect(Math.max(56, x1), y + 8, Math.max(2, x2 - x1), rowH - 16);
    tlCtx.fillStyle = "#6bcb8f";
    tlCtx.fillRect(Math.max(56, x1) - 1, y + 4, 3, rowH - 8);
    if (b.t1 != null) {
      tlCtx.fillStyle = "#e07a5f";
      tlCtx.fillRect(Math.min(W - 4, x2) - 1, y + 4, 3, rowH - 8);
    }
    if (b.id === "charge") {
      const lx = xAt(b.t0 + thr);
      if (lx >= 56 && lx <= W) {
        tlCtx.strokeStyle = "rgba(242,204,143,0.9)";
        tlCtx.setLineDash([3, 3]);
        tlCtx.beginPath();
        tlCtx.moveTo(lx, y + 2);
        tlCtx.lineTo(lx, y + rowH - 2);
        tlCtx.stroke();
        tlCtx.setLineDash([]);
      }
    }
  }
  tlCtx.fillStyle = "#8a9bb0";
  tlCtx.font = "10px sans-serif";
  tlCtx.fillText("帯=held  緑=down  赤=up  点線=長押し閾値", 56, H - 4);
}

function renderPanels() {
  if (!actionPanels) return;
  actionPanels.innerHTML = INPUT_ACTIONS.map((def) => {
    const st = actions[def.id];
    const thr = readLongMs() / 1000;
    const holdPct =
      def.id === "charge" && st.held
        ? Math.min(100, (st.holdTime / thr) * 100)
        : st.held
          ? 100
          : 0;
    return `<div class="ib-action-card${st.held ? " is-held" : ""}${st.down ? " is-down" : ""}">
      <div class="ib-action-title">${def.label}</div>
      <div class="ib-flags">
        <span class="ib-flag${st.held ? " on" : ""}">held</span>
        <span class="ib-flag${st.down ? " on edge" : ""}">down</span>
        <span class="ib-flag${st.up ? " on edge" : ""}">up</span>
      </div>
      <div class="ib-hold-bar"><i style="width:${holdPct}%"></i></div>
      <p class="ib-hint">${def.hint}</p>
    </div>`;
  }).join("");
}

function renderEventLog() {
  if (!eventLogEl) return;
  if (!eventLog.length) {
    eventLogEl.innerHTML =
      '<p class="gl-log-empty">（down / up / long が発生するとここに出ます）</p>';
    return;
  }
  eventLogEl.innerHTML = `<ul class="ib-event-list">${eventLog
    .map((e) => `<li>${e}</li>`)
    .join("")}</ul>`;
}

function stopLoop() {
  running = false;
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (btnPlay) btnPlay.textContent = "ポーリング開始";
}

function scheduleNext() {
  if (!running) return;
  const scale = readSpeedScale(speedEl);
  rafId = requestAnimationFrame((ts) => {
    if (!running) return;
    if (!lastTs) lastTs = ts;
    const elapsed = ts - lastTs;
    const interval = 16.7 / scale;
    if (elapsed < interval) {
      scheduleNext();
      return;
    }
    lastTs = ts;
    // 帯グラフは実経過時間で進める。上限は1歩の間隔の2倍（再生速度 0.1× なら約 334 ms）。
    // 固定の上限だと、遅い再生速度で毎歩切り捨てられて長押しが短く描かれる。
    // 上限そのものは、タブを裏に回して戻ったときに時刻が一気に飛ばないために残す。
    tick(16.7, Math.min(elapsed, interval * 2));
    scheduleNext();
  });
}

function startLoop() {
  if (running) return;
  running = true;
  lastTs = 0;
  if (btnPlay) btnPlay.textContent = "一時停止";
  canvas?.focus();
  scheduleNext();
}

function resetAll() {
  stopLoop();
  for (const id of Object.keys(actions)) {
    actions[id] = {
      held: false,
      down: false,
      up: false,
      holdTime: 0,
      longPressFired: false,
    };
  }
  rawDown.clear();
  playerX = 0.5;
  jumpLeft = 0;
  jumpQueued = 0;
  jumpCount = 0;
  fireCount = 0;
  fireResetNote = "";
  chargeCount = 0;
  frameIndex = 0;
  eventLog = [];
  simMs = 0;
  for (const id of Object.keys(holdStartMs)) holdStartMs[id] = null;
  bands = [];
  resultPanel.hide();
  draw();
  drawTimeline();
  renderPanels();
  renderEventLog();
  setStatus("リセット完了 — キャンバスをフォーカスしてキー入力");
}

// Keyboard
window.addEventListener("keydown", (e) => {
  if (!focused && document.activeElement !== canvas) return;
  // prevent page scroll on Space / arrows when focused
  if (
    e.code === "Space" ||
    e.code === "ArrowLeft" ||
    e.code === "ArrowRight"
  ) {
    e.preventDefault();
  }
  rawDown.add(e.code);
  if (!running) {
    // still update one-shot when not polling? better require play
  }
});
window.addEventListener("keyup", (e) => {
  rawDown.delete(e.code);
});
window.addEventListener("blur", () => {
  rawDown.clear();
});

canvas?.addEventListener("focus", () => {
  focused = true;
  if (focusHint) focusHint.textContent = "キー入力有効（Space / Z / X / ←→）";
  draw();
});
canvas?.addEventListener("blur", () => {
  focused = false;
  rawDown.clear();
  if (focusHint) focusHint.textContent = "クリックしてフォーカスを当て、キーを押してください";
  draw();
});
canvas?.addEventListener("click", () => canvas.focus());

btnPlay?.addEventListener("click", () => {
  if (running) {
    stopLoop();
    setStatus("ポーリング停止");
    return;
  }
  startLoop();
  setStatus("ポーリング中 — キーを押して held/down を観察");
});
btnStep?.addEventListener("click", () => {
  stopLoop();
  tick(1000 / 60);
});
btnReset?.addEventListener("click", resetAll);
longMsEl?.addEventListener("input", () => {
  syncLabels();
});
bindSpeedScaleControl(speedEl, speedVal);

loadTextSample(
  "../samples/InputBasicsExample.cs",
  csharpSample,
  "// samples/InputBasicsExample.cs を読み込めませんでした。"
);

syncLabels();
resetAll();

const urlSpec = {
  longms: { el: longMsEl, kind: "range" },
  speed: { el: speedEl, kind: "range" },
};
mountShareLink({
  spec: urlSpec,
  button: document.getElementById("btn-copy-url"),
  statusEl: document.getElementById("status"),
});
const urlResult = applyParamsToControls(urlSpec);
syncLabels();

// auto-start polling so demo is interactive after focus
startLoop();
if (urlResult.warning) {
  setStatus(urlResult.warning);
} else {
  setStatus("ポーリング中 — キャンバスをクリックしてからキー操作");
}
