/**
 * スプライトアニメ × FSM
 */
import { SPRITE_ANIM_FSM_CONFIG as C } from "./maps/sprite-anim-fsm-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("saf-canvas")
);
const ctx = canvas.getContext("2d");
const stateEl = document.getElementById("saf-state");
const logEl = document.getElementById("saf-log");
const btnIdle = document.getElementById("btn-idle");
const btnRun = document.getElementById("btn-run");
const btnJump = document.getElementById("btn-jump");
const btnPlay = document.getElementById("btn-play");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** @type {'idle'|'run'|'jump'} */
let state = "idle";
let frameIdx = 0;
let animT = 0;
let running = false;
/** @type {number | null} */
let rafId = null;
let lastTs = 0;
/** @type {string[]} */
let logs = [];

/**
 * Transition table.
 * @param {'idle'|'run'|'jump'} s
 * @param {'toIdle'|'toRun'|'toJump'|'animEnd'} ev
 * @returns {'idle'|'run'|'jump'}
 */
export function transition(s, ev) {
  if (ev === "toIdle") return "idle";
  if (ev === "toRun") return s === "jump" ? s : "run";
  if (ev === "toJump") return "jump";
  if (ev === "animEnd" && s === "jump") return "idle";
  return s;
}

function pushLog(msg) {
  logs.unshift(msg);
  if (logs.length > 12) logs.pop();
  if (logEl) {
    logEl.innerHTML = logs
      .map((m) => `<div class="es-log es-log-sub">${m}</div>`)
      .join("");
  }
}

function setState(next, reason) {
  if (next === state) return;
  pushLog(`${state} → ${next} (${reason})`);
  state = next;
  frameIdx = 0;
  animT = 0;
  if (stateEl) stateEl.textContent = state;
  setStatus(`state=${state}`);
  draw();
}

function currentFrame() {
  const clip = C.states[state];
  const frames = clip.frames;
  return frames[frameIdx % frames.length];
}

/**
 * Procedural "sprite" body pose by frame id.
 * @param {CanvasRenderingContext2D} c
 * @param {number} f
 */
function drawPose(c, f, x, y) {
  const leg = f % 2 === 0 ? 1 : -1;
  const jump = state === "jump";
  c.fillStyle = "rgba(0,0,0,0.25)";
  c.beginPath();
  c.ellipse(x, y + 28, 18, 6, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#5b9fd4";
  c.fillRect(x - 14, y - 20 + (jump ? -8 : 0), 28, 32);
  c.beginPath();
  c.arc(x, y - 28 + (jump ? -8 : 0), 10, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = "#5b9fd4";
  c.lineWidth = 3;
  c.beginPath();
  if (state === "run") {
    c.moveTo(x - 6, y + 12);
    c.lineTo(x - 6 + leg * 10, y + 28);
    c.moveTo(x + 6, y + 12);
    c.lineTo(x + 6 - leg * 10, y + 28);
  } else if (state === "jump") {
    c.moveTo(x - 6, y + 8);
    c.lineTo(x - 12, y + 22);
    c.moveTo(x + 6, y + 8);
    c.lineTo(x + 12, y + 22);
  } else {
    c.moveTo(x - 6, y + 12);
    c.lineTo(x - 6, y + 28);
    c.moveTo(x + 6, y + 12);
    c.lineTo(x + 6, y + 28);
  }
  c.stroke();
  c.lineWidth = 1;
  c.fillStyle = "#e8eef7";
  c.font = "12px sans-serif";
  c.fillText(`frame ${f}`, x - 22, y - 48);
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#3d4f66";
  ctx.beginPath();
  ctx.moveTo(40, H * 0.72);
  ctx.lineTo(W - 40, H * 0.72);
  ctx.stroke();

  // FSM diagram mini
  const nodes = [
    { id: "idle", x: 80, y: 50 },
    { id: "run", x: 200, y: 50 },
    { id: "jump", x: 140, y: 110 },
  ];
  ctx.strokeStyle = "#5a6a80";
  ctx.beginPath();
  ctx.moveTo(100, 50);
  ctx.lineTo(180, 50);
  ctx.moveTo(90, 65);
  ctx.lineTo(125, 95);
  ctx.moveTo(190, 65);
  ctx.lineTo(155, 95);
  ctx.stroke();
  for (const n of nodes) {
    ctx.fillStyle = n.id === state ? "rgba(107,203,143,0.35)" : "rgba(61,79,102,0.6)";
    ctx.strokeStyle = n.id === state ? "#6bcb8f" : "#5a6a80";
    ctx.fillRect(n.x - 28, n.y - 14, 56, 28);
    ctx.strokeRect(n.x - 28, n.y - 14, 56, 28);
    ctx.fillStyle = "#e8eef7";
    ctx.font = "12px sans-serif";
    ctx.fillText(n.id, n.x - 14, n.y + 4);
  }

  drawPose(ctx, currentFrame(), W * 0.62, H * 0.55);

  // strip of frames in current clip
  const clip = C.states[state];
  ctx.fillStyle = "#9aabbf";
  ctx.font = "11px sans-serif";
  ctx.fillText("clip:", W * 0.45, H - 36);
  clip.frames.forEach((f, i) => {
    const bx = W * 0.5 + i * 36;
    ctx.fillStyle =
      i === frameIdx % clip.frames.length
        ? "rgba(242,204,143,0.4)"
        : "rgba(61,79,102,0.5)";
    ctx.fillRect(bx, H - 48, 30, 30);
    ctx.fillStyle = "#e8eef7";
    ctx.fillText(String(f), bx + 10, H - 28);
  });
}

function step(dt) {
  animT += dt;
  const clip = C.states[state];
  if (animT >= C.frameSec) {
    animT = 0;
    frameIdx += 1;
    if (frameIdx >= clip.frames.length) {
      if (clip.loop) frameIdx = 0;
      else {
        frameIdx = clip.frames.length - 1;
        setState(transition(state, "animEnd"), "animEnd");
      }
    }
  }
  draw();
}

function loop(ts) {
  if (!running) return;
  if (!lastTs) lastTs = ts;
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (dt > 0.05) dt = 0.05;
  step(dt);
  rafId = requestAnimationFrame(loop);
}

btnIdle?.addEventListener("click", () => setState(transition(state, "toIdle"), "toIdle"));
btnRun?.addEventListener("click", () => setState(transition(state, "toRun"), "toRun"));
btnJump?.addEventListener("click", () => setState(transition(state, "toJump"), "toJump"));
btnPlay?.addEventListener("click", () => {
  if (running) {
    running = false;
    if (rafId != null) cancelAnimationFrame(rafId);
    if (btnPlay) btnPlay.textContent = "再生";
    return;
  }
  running = true;
  lastTs = 0;
  if (btnPlay) btnPlay.textContent = "一時停止";
  rafId = requestAnimationFrame(loop);
});

loadTextSample(
  "../samples/SpriteAnimFsmExample.cs",
  csharpSample,
  "// SpriteAnimFsmExample.cs"
);
if (stateEl) stateEl.textContent = state;
draw();
setStatus("状態ボタンで遷移 · 再生でフレーム進行");
