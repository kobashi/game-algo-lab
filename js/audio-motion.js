/**
 * 速度と接地から、足音（離散）と持続音（連続）を比べる。
 */
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";
import { bindAudioLifecycle } from "./audio/audio-engine.js";
import { createGameSim } from "./audio/game-sim.js";
import {
  mapExponential,
  mapLinear,
  mapSmoothstep,
  mapThreshold,
  smoothToward,
} from "./audio/parameter-mapper.js";
import { mountTopicTask } from "./audio/topic-tasks.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("sim-canvas"));
const mapCanvas = /** @type {HTMLCanvasElement} */ (document.getElementById("map-canvas"));
const mapCtx = mapCanvas.getContext("2d");
const readout = document.getElementById("motion-readout");
const curveEl = /** @type {HTMLSelectElement} */ (document.getElementById("curve"));
const smoothEl = /** @type {HTMLInputElement} */ (document.getElementById("smooth"));
const setStatus = createStatus(document.getElementById("status"));

const sim = createGameSim(canvas, (name) => {
  if (name === "Land") landed = true;
}, {
  health: () => 100,
  timeScale: () => 1,
  focused: () => document.activeElement === canvas,
});

/** @type {AudioContext | null} */
let ac = null;
/** @type {OscillatorNode | null} */
let loopOsc = null;
/** @type {GainNode | null} */
let loopGain = null;
let smoothed = 0;
let distance = 0;
let footWait = 0;
let landed = false;

function ensureAc() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    bindAudioLifecycle(ac);
    loopOsc = ac.createOscillator();
    loopGain = ac.createGain();
    loopOsc.type = "triangle";
    loopOsc.frequency.value = 90;
    loopGain.gain.value = 0;
    loopOsc.connect(loopGain);
    loopGain.connect(ac.destination);
    loopOsc.start();
  }
  if (ac.state === "suspended") ac.resume();
  return ac;
}

/**
 * 観察用。採点は学生の関数。
 * @param {number} speed
 * @param {string} curve
 */
function demoGain(speed, curve) {
  const t = Math.min(1, Math.abs(speed) / 200);
  if (curve === "exponential") return mapExponential(t, 0.001, 0.2);
  if (curve === "smoothstep") return mapSmoothstep(t, 0, 0.2);
  if (curve === "threshold") return mapThreshold(Math.abs(speed), 60, 0, 0.12);
  return mapLinear(t, 0, 0.2);
}

/**
 * @param {number} speed
 * @param {boolean} grounded
 */
function demoInterval(speed, grounded) {
  if (!grounded || speed < 20) return 0;
  return Math.max(0.18, 0.7 - speed / 280);
}

function drawCurve(speed) {
  if (!mapCtx) return;
  const g = mapCtx;
  const w = mapCanvas.width;
  const h = mapCanvas.height;
  g.fillStyle = "#0a0e14";
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "#5b9fd4";
  g.beginPath();
  for (let x = 0; x <= w; x++) {
    const v = (x / w) * 200;
    const y = h - 8 - demoGain(v, curveEl.value) / 0.2 * (h - 20);
    if (x === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  const px = Math.min(w - 2, (Math.abs(speed) / 200) * w);
  g.fillStyle = "#f2cc8f";
  g.beginPath();
  g.arc(px, h - 8 - (smoothed / 0.2) * (h - 20), 4, 0, Math.PI * 2);
  g.fill();
}

function foot() {
  const ctx = ensureAc();
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "square";
  o.frequency.value = 140;
  o.connect(g);
  g.connect(ctx.destination);
  const t0 = ctx.currentTime;
  g.gain.setValueAtTime(0.05, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.05);
  o.start(t0);
  o.stop(t0 + 0.06);
  o.onended = () => {
    try {
      o.disconnect();
      g.disconnect();
    } catch {
      /* already */
    }
  };
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  sim.tick(dt);
  const state = sim.state();
  const speed = Math.hypot(state.vx, state.vy);
  const target = demoGain(speed, curveEl.value);
  const tc = Number(smoothEl.value) || 0.12;
  const label = document.getElementById("smooth-val");
  if (label) label.textContent = tc.toFixed(2);
  smoothed = smoothToward(smoothed, target, dt, tc);
  const interval = demoInterval(Math.abs(state.vx), state.onGround);
  if (interval === 0) distance = 0;
  else {
    distance += Math.abs(state.vx) * dt;
    const stepDistance = Math.max(8, interval * 80);
    if (distance >= stepDistance) {
      distance = 0;
      foot();
    }
  }
  if (landed) {
    landed = false;
    footWait = 0;
  }
  const ctx = loopGain ? ensureAc() : null;
  if (ctx && loopGain && loopOsc) {
    loopGain.gain.setTargetAtTime(smoothed, ctx.currentTime, Math.max(0.02, tc));
    loopOsc.frequency.setTargetAtTime(70 + Math.abs(state.vx) * 0.4, ctx.currentTime, 0.05);
  }
  if (readout) {
    readout.textContent = `水平 ${state.vx.toFixed(0)} / 垂直 ${state.vy.toFixed(0)} / 接地 ${state.onGround ? "あり" : "なし"} / 持続 ${smoothed.toFixed(3)} / 足音間隔 ${interval === 0 ? "なし" : interval.toFixed(2) + " s"}`;
  }
  drawCurve(speed);
  requestAnimationFrame(frame);
}

document.getElementById("btn-sim-jump")?.addEventListener("click", () => {
  ensureAc();
  sim.pressJump();
});
document.getElementById("btn-sim-reset")?.addEventListener("click", () => sim.reset());
canvas.addEventListener("pointerdown", () => {
  ensureAc();
  canvas.focus();
});

/**
 * @param {KeyboardEvent} ev
 * @param {boolean} down
 */
function key(ev, down) {
  if (ev.target instanceof HTMLElement && (ev.target.closest("textarea, input, select"))) return;
  if (ev.key === "ArrowLeft" || ev.key === "a" || ev.key === "A") {
    ev.preventDefault();
    sim.hold("left", down);
  }
  if (ev.key === "ArrowRight" || ev.key === "d" || ev.key === "D") {
    ev.preventDefault();
    sim.hold("right", down);
  }
  if (ev.key === " " || ev.key === "ArrowUp") {
    ev.preventDefault();
    sim.hold("jump", down);
  }
}
window.addEventListener("keydown", (ev) => key(ev, true));
window.addEventListener("keyup", (ev) => key(ev, false));

loadTextSample("../samples/SfxMotionExample.cs", document.getElementById("csharp-sample"));
mountTopicTask("audio-motion");
sim.draw();
requestAnimationFrame(frame);
setStatus("左右で移動し、接地中の足音と速度の持続音を聞き比べます");
