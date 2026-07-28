/**
 * リプレイと決定性
 * @see docs/topics/replay-determinism/SPEC.md
 */
import { REPLAY_DETERMINISM_CONFIG as C } from "./maps/replay-determinism-config.js";
import {
  createStatus,
  loadTextSample,
  mulberry32,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("rp-canvas")
);
const ctx = canvas.getContext("2d");
const seedEl = /** @type {HTMLInputElement} */ (document.getElementById("seed"));
const fixedSeedEl = /** @type {HTMLInputElement} */ (
  document.getElementById("fixed-seed")
);
const modeEl = document.getElementById("rp-mode");
const statsEl = document.getElementById("rp-stats");
const logEl = document.getElementById("rp-log");
const btnRec = document.getElementById("btn-rec");
const btnStop = document.getElementById("btn-stop");
const btnPlay = document.getElementById("btn-play");
const btnReset = document.getElementById("btn-reset");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** @type {Set<string>} */
const keys = new Set();
/**
 * @typedef {{ left: boolean, right: boolean, jump: boolean }} FrameInput
 * @typedef {{ x: number, y: number, vx: number, vy: number, grounded: boolean }} Body
 */

/** @type {'idle'|'record'|'replay'} */
let mode = "idle";
/** @type {FrameInput[]} */
let frames = [];
let frameIndex = 0;
let seed = C.defaultSeed;
/** @type {() => number} */
let rng = mulberry32(seed);
let body = { x: 80, y: 200, vx: 0, vy: 0, grounded: true };
/** @type {{x:number,y:number}[]} */
let trail = [];
/** @type {{x:number,y:number}[]} */
let recordTrail = [];
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
let jumpQueued = false;

const FLOOR = 240;

function readSeed() {
  return (Math.floor(Number(seedEl?.value) || C.defaultSeed) >>> 0) || 1;
}

function resetBody() {
  body = { x: 80, y: FLOOR - 28, vx: 0, vy: 0, grounded: true };
  trail = [];
  jumpQueued = false;
}

function makeRng() {
  seed = readSeed();
  if (fixedSeedEl?.checked) {
    rng = mulberry32(seed);
  } else {
    // non-deterministic-ish for demo: time-based
    rng = mulberry32((Date.now() ^ (Math.random() * 1e9)) >>> 0 || 1);
  }
}

/**
 * @param {Body} b
 * @param {FrameInput} input
 * @param {number} dt
 * @param {() => number} r
 */
export function simStep(b, input, dt, r) {
  let ax = 0;
  if (input.left) ax -= C.moveSpeed;
  if (input.right) ax += C.moveSpeed;
  b.vx = ax;
  if (input.jump && b.grounded) {
    // deterministic jump variance from rng
    const boost = 0.85 + r() * 0.3;
    b.vy = -C.jumpSpeed * boost;
    b.grounded = false;
  }
  b.vy += C.gravity * dt;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  if (b.y + 28 >= FLOOR) {
    b.y = FLOOR - 28;
    b.vy = 0;
    b.grounded = true;
  }
  if (b.x < 10) b.x = 10;
  if (b.x > 600) b.x = 600;
  return b;
}

function currentInput() {
  return {
    left: keys.has("ArrowLeft") || keys.has("KeyA"),
    right: keys.has("ArrowRight") || keys.has("KeyD"),
    jump: jumpQueued,
  };
}

function step(dt) {
  /** @type {FrameInput} */
  let input;
  if (mode === "replay") {
    if (frameIndex >= frames.length) {
      stop();
      setStatus("再生完了");
      if (modeEl) modeEl.textContent = "再生完了";
      return;
    }
    input = frames[frameIndex++];
  } else {
    input = currentInput();
    jumpQueued = false;
    if (mode === "record") {
      frames.push({ ...input });
    }
  }
  simStep(body, input, dt, rng);
  trail.push({ x: body.x + 14, y: body.y + 14 });
  if (trail.length > 120) trail.shift();
  if (mode === "record") {
    recordTrail = trail.slice();
  }
  draw();
  renderStats();
}

function draw() {
  if (!ctx) return;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#3d4f66";
  ctx.fillRect(0, FLOOR, canvas.width, canvas.height - FLOOR);

  // recorded path ghost when replaying
  if (mode === "replay" && recordTrail.length > 1) {
    ctx.strokeStyle = "rgba(242, 204, 143, 0.35)";
    ctx.beginPath();
    ctx.moveTo(recordTrail[0].x, recordTrail[0].y);
    for (const p of recordTrail) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  if (trail.length > 1) {
    ctx.strokeStyle =
      mode === "replay" ? "rgba(107, 203, 143, 0.8)" : "rgba(91, 159, 212, 0.6)";
    ctx.beginPath();
    ctx.moveTo(trail[0].x, trail[0].y);
    for (const p of trail) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  ctx.fillStyle = mode === "replay" ? "#6bcb8f" : "#5b9fd4";
  ctx.fillRect(body.x, body.y, 28, 28);

  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText(
    "黄=記録軌跡 · 緑=再生軌跡 · 同じ seed+入力なら重なる",
    12,
    18
  );
}

function renderStats() {
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>モード</td><td>${mode}</td></tr>
        <tr><td>フレーム</td><td>${
          mode === "replay" ? `${frameIndex}/${frames.length}` : frames.length
        }</td></tr>
        <tr><td>シード固定</td><td>${fixedSeedEl?.checked ? "yes" : "no"}</td></tr>
        <tr><td>seed</td><td>${seed}</td></tr>
      </table>`;
  }
  if (modeEl) {
    modeEl.textContent =
      mode === "record"
        ? "記録中"
        : mode === "replay"
          ? "再生中"
          : "待機";
  }
}

function loop(ts) {
  if (!running) return;
  if (!lastTs) lastTs = ts;
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (dt > 0.05) dt = 0.05;
  // fixed-ish step for determinism
  step(1 / 60);
  rafId = requestAnimationFrame(loop);
}

function stop() {
  running = false;
  if (rafId != null) cancelAnimationFrame(rafId);
  rafId = null;
  if (mode === "record") mode = "idle";
}

function startRecord() {
  stop();
  mode = "record";
  frames = [];
  recordTrail = [];
  resetBody();
  makeRng();
  running = true;
  lastTs = 0;
  setStatus("記録中 — ←→ 移動 · Space ジャンプ");
  if (logEl) logEl.textContent = `記録開始 seed=${seed}`;
  rafId = requestAnimationFrame(loop);
}

function startReplay() {
  if (!frames.length) {
    setStatus("先に記録してください");
    return;
  }
  stop();
  mode = "replay";
  frameIndex = 0;
  resetBody();
  // MUST use same seed as record for match
  seed = readSeed();
  rng = mulberry32(seed);
  if (!fixedSeedEl?.checked) {
    setStatus("警告: シード固定 OFF だと再生が一致しません（デモでは記録 seed を使用）");
  }
  running = true;
  lastTs = 0;
  trail = [];
  setStatus(`再生 · ${frames.length} フレーム · seed=${seed}`);
  if (logEl) logEl.textContent = `再生 seed=${seed} frames=${frames.length}`;
  rafId = requestAnimationFrame(loop);
}

function resetAll() {
  stop();
  mode = "idle";
  frames = [];
  frameIndex = 0;
  recordTrail = [];
  if (seedEl) seedEl.value = String(C.defaultSeed);
  if (fixedSeedEl) fixedSeedEl.checked = true;
  resetBody();
  makeRng();
  draw();
  renderStats();
  setStatus("リセット");
  if (logEl) logEl.textContent = "";
}

window.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space"].includes(e.code)) {
    e.preventDefault();
  }
  if (e.code === "Space" && !keys.has("Space")) jumpQueued = true;
  keys.add(e.code);
});
window.addEventListener("keyup", (e) => keys.delete(e.code));

btnRec?.addEventListener("click", startRecord);
btnStop?.addEventListener("click", () => {
  stop();
  mode = "idle";
  setStatus(`記録停止 · ${frames.length} フレーム`);
  renderStats();
});
btnPlay?.addEventListener("click", startReplay);
btnReset?.addEventListener("click", resetAll);

loadTextSample(
  "../samples/ReplayDeterminismExample.cs",
  csharpSample,
  "// ReplayDeterminismExample.cs"
);
resetAll();
