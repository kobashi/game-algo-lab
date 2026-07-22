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
} from "./platform/index.js";

mountTopicShellFromDataset();

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
let jumpCount = 0;
let fireCount = 0;
let chargeCount = 0;
let frameIndex = 0;
/** @type {string[]} */
let eventLog = [];
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
let focused = false;

function readLongMs() {
  return Math.min(
    C.maxLongPressMs,
    Math.max(C.minLongPressMs, Number(longMsEl?.value) || C.defaultLongPressMs)
  );
}

function syncLabels() {
  if (longMsVal) longMsVal.textContent = String(readLongMs());
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

    if (st.held) st.holdTime += dtSec;
    else {
      st.holdTime = 0;
      st.longPressFired = false;
    }

    if (st.down) edges.push(`${def.label} DOWN`);
    if (st.up) edges.push(`${def.label} UP`);

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
    }
  }

  // Jump: down only
  if (actions.jump.down) jumpCount += 1;

  // Fire: held every frame (bad example)
  if (actions.fire.held) fireCount += 1;

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

function tick(realDtMs) {
  const dt = Math.min(realDtMs, 50) / 1000;
  frameIndex += 1;
  pollActions(dt);
  draw();
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
      <p class="result-verdict">Fire は held 連射中</p>
      <p class="result-note">
        Z を押し続けると毎フレーム Fire が +1 されます（ジャンプに使うと困るパターン）。
        Jump（Space）は down エッジなので押し続けても 1 回だけです。
      </p>
    `);
  } else if (actions.charge.held && !actions.charge.longPressFired) {
    const thr = readLongMs();
    const pct = Math.min(100, (actions.charge.holdTime * 1000 * 100) / thr);
    resultPanel.show(`
      <p class="result-verdict">チャージ中 ${pct.toFixed(0)}%</p>
      <p class="result-note">X を ${thr} ms 以上押し続けると LONG が 1 回だけ発火します。</p>
    `);
  } else {
    resultPanel.hide();
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

  // player
  const px = playerX * W;
  const py = gy - 28;
  ctx.fillStyle = "#6bcb8f";
  ctx.fillRect(px - 14, py - 28, 28, 40);
  ctx.strokeStyle = "#9ee0b8";
  ctx.strokeRect(px - 14, py - 28, 28, 40);

  // jump arc indicator
  if (actions.jump.held) {
    ctx.strokeStyle = "rgba(91,159,212,0.6)";
    ctx.beginPath();
    ctx.arc(px, py - 40, 18, Math.PI, 0);
    ctx.stroke();
  }

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
  rafId = requestAnimationFrame((ts) => {
    if (!running) return;
    if (!lastTs) lastTs = ts;
    let dt = ts - lastTs;
    lastTs = ts;
    if (dt < 1) dt = 1;
    if (dt > 50) dt = 50;
    tick(dt);
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
  jumpCount = 0;
  fireCount = 0;
  chargeCount = 0;
  frameIndex = 0;
  eventLog = [];
  resultPanel.hide();
  draw();
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

loadTextSample(
  "../samples/InputBasicsExample.cs",
  csharpSample,
  "// samples/InputBasicsExample.cs を読み込めませんでした。"
);

syncLabels();
resetAll();
// auto-start polling so demo is interactive after focus
startLoop();
setStatus("ポーリング中 — キャンバスをクリックしてからキー操作");
