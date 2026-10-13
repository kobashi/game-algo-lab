/**
 * コヨーテタイム — 崖際ジャンプの猶予
 * @see docs/topics/coyote-time/SPEC.md
 */
import { COYOTE_TIME_CONFIG as C } from "./maps/coyote-time-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
  applyParamsToControls,
  mountShareLink,
  readSpeedScale,
  bindSpeedScaleControl,
  mountGlossary,
  formatTenths,
  isFieldKeyTarget,
  captureParamDefaults,
} from "./platform/index.js";

mountTopicShellFromDataset();
mountGlossary();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("ct-canvas")
);
const ctx = canvas.getContext("2d");
const coyoteOnEl = /** @type {HTMLInputElement} */ (
  document.getElementById("coyote-on")
);
const coyoteMsEl = /** @type {HTMLInputElement} */ (
  document.getElementById("coyote-ms")
);
const coyoteMsVal = document.getElementById("coyote-ms-val");
const speedEl = /** @type {HTMLInputElement} */ (document.getElementById("speed"));
const speedVal = document.getElementById("speed-val");
const statsEl = document.getElementById("ct-stats");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));
const blockXEls = [1, 2, 3].map((i) =>
  /** @type {HTMLInputElement | null} */ (document.getElementById(`x${i}`))
);
const blockYEls = [1, 2, 3].map((i) =>
  /** @type {HTMLInputElement | null} */ (document.getElementById(`y${i}`))
);

/** 床（index 0）は固定。足場 1〜3 だけドラッグで動かす */
const platforms = C.platforms.map((p) => ({ ...p }));
const MOVABLE = [1, 2, 3];
const startDx = C.startX - C.platforms[C.startPlatform].x;

/** @type {Set<string>} */
const keys = new Set();
let px = 0;
let py = 0;
let vx = 0;
let vy = 0;
let grounded = true;
let coyoteLeft = 0;
let jumpGroundCount = 0;
let jumpCoyoteCount = 0;
let jumpFailCount = 0;
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
let jumpEdge = false;
/** 1 歩の刻み（固定）。再生速度は歩く間隔だけを変えるので、スロー再生でも猶予の長さ（ms）は同じ */
const STEP_SEC = 1 / 60;
/** 直近に足場を離れた位置（崖から出た瞬間） */
let leavePoint = /** @type {{ x: number, y: number } | null} */ (null);
/** ジャンプを押した位置と結果（接地 / 猶予 / 失敗）。直近 12 回 */
let jumpMarks = /** @type {{ x: number, y: number, kind: "ground" | "coyote" | "fail" }[]} */ ([]);
/**
 * ドラッグ中の足場。立っている足場なら、動かした整数分だけキャラも運ぶ。
 * @type {{
 *   index: number,
 *   ox: number,
 *   oy: number,
 *   mx: number,
 *   my: number,
 *   carry: boolean,
 *   playerOx: number,
 *   playerOy: number,
 *   pointerId: number,
 * } | null}
 */
let drag = null;

function readCoyoteSec() {
  // 0 は 0 のまま扱う（`Number(v) || 既定` だと猶予 0ms が既定の
  // C.defaultCoyoteMs（120ms）に化けてしまうため、数値かどうかで判定する）。
  const raw = Number(coyoteMsEl?.value);
  const n = Number.isFinite(raw) ? raw : C.defaultCoyoteMs;
  const ms = Math.min(C.maxCoyoteMs, Math.max(C.minCoyoteMs, n));
  if (coyoteMsVal) coyoteMsVal.textContent = formatTenths(ms);
  return ms / 1000;
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function resolvePlatforms() {
  grounded = false;
  for (const p of platforms) {
    if (!rectsOverlap(px, py, C.playerW, C.playerH, p.x, p.y, p.w, p.h)) {
      continue;
    }
    // land from above
    if (vy >= 0 && py + C.playerH - vy * 0.02 <= p.y + 4) {
      py = p.y - C.playerH;
      vy = 0;
      grounded = true;
    }
  }
  // floor clamp
  if (py + C.playerH > canvas.height) {
    py = canvas.height - C.playerH;
    vy = 0;
    grounded = true;
  }
  if (px < 0) px = 0;
  if (px + C.playerW > canvas.width) px = canvas.width - C.playerW;
}

function tryJump() {
  const use = !!coyoteOnEl?.checked;
  const ok = grounded || (use && coyoteLeft > 0);
  if (!ok) {
    markJump("fail");
    jumpFailCount += 1;
    setStatus("ジャンプ失敗（接地でもコヨーテでもない）");
    return;
  }
  // 状態を書き換える前に判定する（接地していなければ猶予で救われたジャンプ）
  const viaCoyote = !grounded;
  vy = C.jumpVy;
  grounded = false;
  coyoteLeft = 0;
  markJump(viaCoyote ? "coyote" : "ground");
  if (viaCoyote) {
    jumpCoyoteCount += 1;
    setStatus("コヨーテ猶予でジャンプ成功");
  } else {
    jumpGroundCount += 1;
    setStatus("接地ジャンプ成功");
  }
}

/** @param {"ground" | "coyote" | "fail"} kind */
function markJump(kind) {
  jumpMarks.push({ x: px + C.playerW / 2, y: py + C.playerH, kind });
  if (jumpMarks.length > 12) jumpMarks.shift();
}

function step(dt) {
  if (drag) {
    jumpEdge = false;
    draw();
    renderStats();
    return;
  }
  const wasGrounded = grounded;
  // horizontal
  vx = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) vx -= C.moveSpeed;
  if (keys.has("ArrowRight") || keys.has("KeyD")) vx += C.moveSpeed;

  if (jumpEdge) {
    tryJump();
    jumpEdge = false;
  }

  vy += C.gravity * dt;
  px += vx * dt;
  py += vy * dt;
  resolvePlatforms();
  if (wasGrounded && !grounded && vy >= 0) {
    // ジャンプではなく、歩いて足場から出た瞬間
    leavePoint = { x: px + C.playerW / 2, y: py + C.playerH };
  }

  if (grounded) coyoteLeft = readCoyoteSec();
  else coyoteLeft = Math.max(0, coyoteLeft - dt);

  draw();
  renderStats();
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  // coyote aura when active in air
  if (!grounded && coyoteLeft > 0 && coyoteOnEl?.checked) {
    ctx.fillStyle = "rgba(242, 204, 143, 0.15)";
    ctx.fillRect(px - 6, py - 6, C.playerW + 12, C.playerH + 12);
  }

  // 猶予の帯: 足場の端から、猶予のあいだに歩いて進める距離（移動速度 × 猶予）。ここまでならジャンプが間に合う
  const reach = coyoteOnEl?.checked ? C.moveSpeed * readCoyoteSec() : 0;
  if (reach > 0) {
    ctx.fillStyle = "rgba(242, 204, 143, 0.28)";
    for (const p of platforms) {
      // プレイヤーは体の半分が出るまで接地しているので、帯は端から半身ぶん外側から始まる（印はプレイヤーの中心）
      if (p.x > 0) ctx.fillRect(p.x - C.playerW / 2 - reach, p.y, reach, p.h);
      if (p.x + p.w < W) ctx.fillRect(p.x + p.w + C.playerW / 2, p.y, reach, p.h);
    }
  }

  ctx.fillStyle = "#3d4f66";
  for (const p of platforms) {
    ctx.fillRect(p.x, p.y, p.w, p.h);
  }
  ctx.font = "11px sans-serif";
  ctx.fillStyle = "#dce2eb";
  for (const i of MOVABLE) {
    const p = platforms[i];
    ctx.strokeStyle = drag?.index === i ? "#e8eef6" : "#8aa0b8";
    ctx.lineWidth = drag?.index === i ? 2 : 1;
    ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
    ctx.fillText(String(i), p.x + 4, p.y + 11);
  }
  ctx.lineWidth = 1;

  // 足場を離れた位置（縦の点線）とジャンプを押した位置
  if (leavePoint) {
    ctx.save();
    ctx.strokeStyle = "rgba(220, 226, 235, 0.55)";
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(leavePoint.x, leavePoint.y - 36);
    ctx.lineTo(leavePoint.x, leavePoint.y + 16);
    ctx.stroke();
    ctx.restore();
  }
  for (const m of jumpMarks) {
    if (m.kind === "fail") {
      ctx.strokeStyle = "#e07a7a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(m.x - 4, m.y - 4);
      ctx.lineTo(m.x + 4, m.y + 4);
      ctx.moveTo(m.x + 4, m.y - 4);
      ctx.lineTo(m.x - 4, m.y + 4);
      ctx.stroke();
    } else {
      ctx.fillStyle = m.kind === "coyote" ? "#f2cc8f" : "#6bcb8f";
      ctx.beginPath();
      ctx.arc(m.x, m.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = grounded ? "#6bcb8f" : "#5b9fd4";
  ctx.fillRect(px, py, C.playerW, C.playerH);

  // coyote bar
  const maxC = readCoyoteSec() || 0.001;
  const ratio = Math.min(1, coyoteLeft / maxC);
  ctx.fillStyle = "#1a2230";
  ctx.fillRect(12, 12, 160, 12);
  ctx.fillStyle = ratio > 0 ? "#f2cc8f" : "#5a6a80";
  ctx.fillRect(12, 12, 160 * ratio, 12);
  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText(
    `coyote ${(coyoteLeft * 1000).toFixed(0)} ms ${coyoteOnEl?.checked ? "ON" : "OFF"}`,
    12,
    40
  );
  ctx.fillText("←→ 移動 · Space ジャンプ · R 足場に戻る", 12, H - 12);
  // 凡例（右下）: 印と同じ色で書く
  const legend = [
    ["● 接地", "#6bcb8f"],
    ["● 猶予で成功", "#f2cc8f"],
    ["× 失敗", "#e07a7a"],
    ["┆ 足場を離れた位置", "#9aabbf"],
  ];
  let lx = W - 12;
  for (let i = legend.length - 1; i >= 0; i--) {
    const [text, color] = legend[i];
    lx -= ctx.measureText(text).width;
    ctx.fillStyle = color;
    ctx.fillText(text, lx, H - 12);
    lx -= 12;
  }
}

function renderStats() {
  if (!statsEl) return;
  statsEl.innerHTML = `
    <table class="coord-table">
      <tr><td>接地</td><td>${grounded ? "yes" : "no"}</td></tr>
      <tr><td>コヨーテ残</td><td>${(coyoteLeft * 1000).toFixed(0)} ms</td></tr>
      <tr><td>ジャンプ成功（接地）</td><td>${jumpGroundCount}</td></tr>
      <tr><td>ジャンプ成功（猶予で救われた）</td><td>${jumpCoyoteCount}</td></tr>
      <tr><td>ジャンプ失敗</td><td>${jumpFailCount}</td></tr>
      ${MOVABLE.map((i) => {
        const p = platforms[i];
        return `<tr><td>足場${i}</td><td>${p.x}, ${p.y}</td></tr>`;
      }).join("")}
    </table>`;
}

let stepAcc = 0;
function loop(ts) {
  if (!running) return;
  if (!lastTs) lastTs = ts;
  const wall = Math.min(0.1, (ts - lastTs) / 1000);
  lastTs = ts;
  // 実時間 × 再生速度を溜め、1/60 秒たまるごとに 1 歩。スローにしても 1 歩の中身は同じ
  stepAcc += wall * readSpeedScale(speedEl);
  let n = 0;
  while (stepAcc >= STEP_SEC && n < 4) {
    step(STEP_SEC);
    stepAcc -= STEP_SEC;
    n += 1;
  }
  if (n >= 4) stepAcc = 0;
  rafId = requestAnimationFrame(loop);
}

function stop() {
  running = false;
  if (rafId != null) cancelAnimationFrame(rafId);
  rafId = null;
  if (btnPlay) btnPlay.textContent = "再生";
}

/**
 * @param {Array<HTMLInputElement | null>} els
 * @param {number} index 足場番号（1〜3）
 */
function blockInput(els, index) {
  return els[index - 1] ?? null;
}

/**
 * 入力欄の範囲の整数に揃える。URL に載る値と画面を同じにする。
 * @param {number} n
 * @param {HTMLInputElement | null} el
 */
function clampBlock(n, el) {
  const rounded = Math.round(Number(n) || 0);
  const min = Number(el?.min);
  const max = Number(el?.max);
  const lo = Number.isFinite(min) ? min : rounded;
  const hi = Number.isFinite(max) ? max : rounded;
  return Math.min(hi, Math.max(lo, rounded));
}

function writeBlockInputs() {
  for (const i of MOVABLE) {
    const p = platforms[i];
    const xEl = blockInput(blockXEls, i);
    const yEl = blockInput(blockYEls, i);
    if (xEl) xEl.value = String(Math.round(p.x));
    if (yEl) yEl.value = String(Math.round(p.y));
  }
}

function readBlockInputs() {
  for (const i of MOVABLE) {
    const p = platforms[i];
    const xEl = blockInput(blockXEls, i);
    const yEl = blockInput(blockYEls, i);
    if (xEl) p.x = Number(xEl.value);
    if (yEl) p.y = Number(yEl.value);
  }
}

function commitBlocks() {
  for (const i of MOVABLE) {
    const p = platforms[i];
    p.x = clampBlock(p.x, blockInput(blockXEls, i));
    p.y = clampBlock(p.y, blockInput(blockYEls, i));
  }
  writeBlockInputs();
}

function restoreBlocks() {
  for (const i of MOVABLE) {
    platforms[i].x = C.platforms[i].x;
    platforms[i].y = C.platforms[i].y;
  }
  writeBlockInputs();
}

/** 今の足場 1 の上へ。最初の足場左端からのずれを保つ */
function placeOnStart() {
  const p = platforms[C.startPlatform];
  const room = p.w - C.playerW;
  const dx = room > 0 ? Math.min(room, Math.max(0, startDx)) : 0;
  px = p.x + dx;
  py = p.y - C.playerH;
  vx = 0;
  vy = 0;
  grounded = true;
  coyoteLeft = readCoyoteSec();
}

/**
 * @param {PointerEvent | MouseEvent} e
 */
function pointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * sx,
    y: (e.clientY - rect.top) * sy,
  };
}

function hitBlock(mx, my) {
  if (mx >= px && mx < px + C.playerW && my >= py && my < py + C.playerH) return null;
  for (let i = platforms.length - 1; i >= 1; i--) {
    const p = platforms[i];
    if (mx >= p.x && mx < p.x + p.w && my >= p.y && my < p.y + p.h) return i;
  }
  return null;
}

function standingOn(index) {
  const p = platforms[index];
  if (Math.abs(py + C.playerH - p.y) > 0.51) return false;
  return px < p.x + p.w && px + C.playerW > p.x;
}

function finishDrag() {
  if (!drag) return;
  drag = null;
  commitBlocks();
  draw();
  renderStats();
}

/** 今の足場 1 の上に戻る。配置・統計・ジャンプの印は残す */
function backToStart() {
  placeOnStart();
  leavePoint = null;
  draw();
  renderStats();
  setStatus("足場 1 に戻った（R）。配置と統計はそのまま");
}

function reset() {
  stop();
  drag = null;
  canvas.style.cursor = "";
  restoreBlocks();
  placeOnStart();
  jumpGroundCount = 0;
  jumpCoyoteCount = 0;
  jumpFailCount = 0;
  jumpEdge = false;
  leavePoint = null;
  jumpMarks = [];
  stepAcc = 0;
  draw();
  renderStats();
  setStatus("リセット — 足場を最初の配置に戻した。端から歩いて落ち、落ちながら Space を試す。R で足場 1 に戻る");
}

// 操作キーのあいだはページを動かさない。smooth 指定だと preventDefault のあとでも
// 矢印キーでスクロールするブラウザがあるので、位置も固定する。
const scrollBlockKeys = new Set();
let lockedScrollY = null;

function blocksPageScroll(event) {
  if (isFieldKeyTarget(event) || event.metaKey || event.ctrlKey || event.altKey) return false;
  if (event.code === "ArrowUp" || event.code === "ArrowDown") {
    return document.activeElement === canvas;
  }
  return ["ArrowLeft", "ArrowRight", "Space", "KeyA", "KeyD"].includes(event.code);
}

function lockPageScroll(code) {
  scrollBlockKeys.add(code);
  if (lockedScrollY == null) lockedScrollY = window.scrollY;
  document.documentElement.style.scrollBehavior = "auto";
  if (window.scrollY !== lockedScrollY) window.scrollTo(0, lockedScrollY);
}

function unlockPageScroll(code) {
  scrollBlockKeys.delete(code);
  if (scrollBlockKeys.size > 0) return;
  lockedScrollY = null;
  document.documentElement.style.scrollBehavior = "";
}

document.addEventListener("keydown", (e) => {
  if (blocksPageScroll(e)) {
    e.preventDefault();
    lockPageScroll(e.code);
  }
  if (isFieldKeyTarget(e)) return;
  if (!keys.has(e.code) && e.code === "Space") jumpEdge = true;
  if (!keys.has(e.code) && e.code === "KeyR") backToStart();
  keys.add(e.code);
}, true);
document.addEventListener("keyup", (e) => {
  keys.delete(e.code);
  unlockPageScroll(e.code);
}, true);
window.addEventListener("blur", () => {
  keys.clear();
  scrollBlockKeys.clear();
  lockedScrollY = null;
  document.documentElement.style.scrollBehavior = "";
});
window.addEventListener("scroll", () => {
  if (lockedScrollY == null || window.scrollY === lockedScrollY) return;
  window.scrollTo(0, lockedScrollY);
}, { passive: true });

btnPlay?.addEventListener("click", () => {
  if (running) {
    stop();
    return;
  }
  running = true;
  lastTs = 0;
  if (btnPlay) btnPlay.textContent = "一時停止";
  canvas?.focus();
  rafId = requestAnimationFrame(loop);
});
btnReset?.addEventListener("click", reset);
canvas.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  const pos = pointerPos(e);
  const index = hitBlock(pos.x, pos.y);
  if (index == null) return;
  e.preventDefault();
  const p = platforms[index];
  drag = {
    index,
    ox: p.x,
    oy: p.y,
    mx: pos.x,
    my: pos.y,
    carry: standingOn(index),
    playerOx: px,
    playerOy: py,
    pointerId: e.pointerId,
  };
  try {
    canvas.setPointerCapture(e.pointerId);
  } catch {
    // 信頼されていないイベントでは capture できない
  }
  canvas.focus({ preventScroll: true });
  canvas.style.cursor = "grabbing";
  draw();
});
canvas.addEventListener("pointermove", (e) => {
  const pos = pointerPos(e);
  if (!drag) {
    canvas.style.cursor = hitBlock(pos.x, pos.y) != null ? "grab" : "";
    return;
  }
  const p = platforms[drag.index];
  const nx = clampBlock(drag.ox + (pos.x - drag.mx), blockInput(blockXEls, drag.index));
  const ny = clampBlock(drag.oy + (pos.y - drag.my), blockInput(blockYEls, drag.index));
  p.x = nx;
  p.y = ny;
  if (drag.carry) {
    px = drag.playerOx + (nx - drag.ox);
    py = drag.playerOy + (ny - drag.oy);
  }
  writeBlockInputs();
  draw();
  renderStats();
});
canvas.addEventListener("pointerup", (e) => {
  finishDrag();
  const pos = pointerPos(e);
  canvas.style.cursor = hitBlock(pos.x, pos.y) != null ? "grab" : "";
});
canvas.addEventListener("pointercancel", () => {
  finishDrag();
  canvas.style.cursor = "";
});
canvas.addEventListener("lostpointercapture", () => {
  finishDrag();
});
coyoteMsEl?.addEventListener("input", () => readCoyoteSec());
coyoteOnEl?.addEventListener("change", () => {
  setStatus(coyoteOnEl.checked ? "コヨーテ ON" : "コヨーテ OFF（接地のみ）");
});

loadTextSample(
  "../samples/CoyoteTimeExample.cs",
  csharpSample,
  "// CoyoteTimeExample.cs"
);

bindSpeedScaleControl(speedEl, speedVal);
coyoteMsEl?.addEventListener("input", () => draw());
const urlSpec = {
  coyote: { el: coyoteOnEl, kind: "checkbox" },
  ms: { el: coyoteMsEl, kind: "range" },
  speed: { el: speedEl, kind: "range" },
  x1: { el: blockXEls[0], kind: "number" },
  y1: { el: blockYEls[0], kind: "number" },
  x2: { el: blockXEls[1], kind: "number" },
  y2: { el: blockYEls[1], kind: "number" },
  x3: { el: blockXEls[2], kind: "number" },
  y3: { el: blockYEls[2], kind: "number" },
};
writeBlockInputs();
// 足場の座標は既定と同じでも共有 URL に残す。配置が課題の答えになるため。
const shareDefaults = captureParamDefaults(urlSpec);
for (const key of ["x1", "y1", "x2", "y2", "x3", "y3"]) {
  delete shareDefaults[key];
}
mountShareLink({
  spec: urlSpec,
  button: document.getElementById("btn-copy-url"),
  statusEl: document.getElementById("status"),
  defaults: shareDefaults,
});
document.addEventListener(
  "click",
  (e) => {
    const t = /** @type {Element | null} */ (e.target instanceof Element ? e.target : null);
    if (!t?.closest("#btn-copy-url, .submission-take")) return;
    commitBlocks();
    draw();
    renderStats();
  },
  true,
);
const urlResult = applyParamsToControls(urlSpec);
readBlockInputs();
placeOnStart();
draw();
renderStats();
setStatus("足場 1・2・3 はドラッグで動かせます。端から歩いて落ち、落ちながら Space を試す。R で足場 1 に戻る");
if (urlResult.warning) setStatus(urlResult.warning);
