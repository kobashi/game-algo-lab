/**
 * 応用サウンドの総合演習。採点は学生が書いた関数だけを見る。
 */
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";
import { bindAudioLifecycle } from "./audio/audio-engine.js";
import { createGameSim } from "./audio/game-sim.js";
import { compileFns } from "./audio/student-task.js";
import { mountTopicTask } from "./audio/topic-tasks.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("sim-canvas"));
const readout = document.getElementById("lab-readout");
const logEl = document.getElementById("lab-log");
const stateEl = /** @type {HTMLSelectElement} */ (document.getElementById("music-state"));
const setStatus = createStatus(document.getElementById("status"));
/** @type {string[]} */
const logs = [];

const sim = createGameSim(canvas, (name) => pushLog(`Emit ${name}`), {
  health: () => 100,
  timeScale: () => 1,
  focused: () => document.activeElement === canvas,
});

/** @type {AudioContext | null} */
let ac = null;
/** @type {Record<string, { osc: OscillatorNode, gain: GainNode }> | null} */
let layers = null;
/** @type {Record<string, Function> | null} */
let fns = null;
let distance = 0;
let warnWait = 0;
let wasGrounded = true;
/** @type {{ id: number, started: number, level: number }[]} */
let voices = [];
let nextVoice = 1;

function pushLog(msg) {
  logs.unshift(msg);
  if (logs.length > 12) logs.pop();
  if (logEl) logEl.innerHTML = logs.map((line) => `<div class="es-log es-log-sub">${line}</div>`).join("");
}

function ensureAc() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    bindAudioLifecycle(ac);
    layers = {};
    for (const [name, freq] of [["base", 196], ["tension", 247], ["battle", 330]]) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      layers[name] = { osc, gain };
    }
  }
  if (ac.state === "suspended") ac.resume();
  return ac;
}

function blip(freq, gain, dur) {
  const ctx = ensureAc();
  if (!ctx || !(gain > 0)) return;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  osc.connect(amp);
  amp.connect(ctx.destination);
  const t0 = ctx.currentTime;
  amp.gain.setValueAtTime(Math.min(0.2, gain), t0);
  amp.gain.exponentialRampToValueAtTime(0.001, t0 + Math.max(0.03, dur));
  osc.start(t0);
  osc.stop(t0 + Math.max(0.04, dur) + 0.02);
  const voice = { id: nextVoice++, started: performance.now(), level: gain };
  voices.push(voice);
  if (fns && voices.length > 4) {
    const stop = fns.pickStop(voices, "oldest");
    if (stop && typeof stop === "object" && "id" in stop) {
      voices = voices.filter((item) => item.id !== /** @type {{id: number}} */ (stop).id);
      pushLog(`発音数: #${/** @type {{id: number}} */ (stop).id} を停止`);
    }
  }
  osc.onended = () => {
    voices = voices.filter((item) => item.id !== voice.id);
    try {
      osc.disconnect();
      amp.disconnect();
    } catch {
      /* already */
    }
  };
}

function nearestEnemy(state) {
  let best = 9999;
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    best = Math.min(best, Math.hypot(enemy.x - state.x, enemy.y - state.y));
  }
  return best;
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  sim.tick(dt);
  const state = sim.state();
  const speed = Math.hypot(state.vx, state.vy);
  const enemy = nearestEnemy(state);
  if (readout) {
    readout.textContent = `水平 ${state.vx.toFixed(0)} / 垂直 ${state.vy.toFixed(0)} / 接地 ${state.onGround ? "あり" : "なし"} / 敵距離 ${enemy.toFixed(0)} / 発音 ${voices.length}`;
  }
  if (fns && ac) {
    const interval = Number(fns.stepInterval(Math.abs(state.vx), state.onGround)) || 0;
    if (interval <= 0) distance = 0;
    else {
      distance += Math.abs(state.vx) * dt;
      if (distance >= Math.max(8, interval * 80)) {
        distance = 0;
        blip(160, 0.06, 0.05);
        pushLog("足音");
      }
    }
    if (wasGrounded === false && state.onGround) {
      const impact = fns.landImpact(Math.abs(state.vy));
      if (impact && typeof impact === "object") {
        blip(Number(impact.freq) || 200, Number(impact.gain) || 0, 0.12);
        pushLog("着地");
      }
    }
    wasGrounded = state.onGround;
    const warn = fns.warning(enemy);
    warnWait -= dt;
    if (warn && Number(warn.gain) > 0 && warnWait <= 0) {
      blip(720, Number(warn.gain), 0.06);
      warnWait = Math.max(0.05, Number(warn.interval) || 0.5);
      pushLog("警告");
    }
    const music = fns.layerGains(stateEl.value || "normal");
    if (layers && music && ac) {
      const nowT = ac.currentTime;
      for (const name of ["base", "tension", "battle"]) {
        const g = Math.max(0, Math.min(1, Number(music[name]) || 0)) * 0.04;
        layers[name].gain.gain.setTargetAtTime(g, nowT, 0.08);
      }
    }
  }
  requestAnimationFrame(frame);
}

document.getElementById("btn-hear")?.addEventListener("click", () => {
  const area = document.querySelector("#student-task textarea");
  if (!(area instanceof HTMLTextAreaElement)) return;
  try {
    fns = compileFns(area.value, ["stepInterval", "landImpact", "warning", "pickStop", "layerGains"]);
    ensureAc();
    setStatus("書いた関数で鳴らしています");
  } catch (err) {
    fns = null;
    setStatus(err instanceof Error ? err.message : "関数を読めませんでした");
  }
});
document.getElementById("btn-sim-reset")?.addEventListener("click", () => {
  sim.reset();
  distance = 0;
  wasGrounded = true;
});
canvas.addEventListener("pointerdown", () => canvas.focus());

/**
 * @param {KeyboardEvent} ev
 * @param {boolean} down
 */
function key(ev, down) {
  if (ev.target instanceof HTMLElement && ev.target.closest("textarea, input, select")) return;
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

loadTextSample("../samples/AudioAdaptiveExample.cs", document.getElementById("csharp-sample"));
mountTopicTask("audio-adaptive-lab");
sim.draw();
requestAnimationFrame(frame);
setStatus("関数を書いてから、この実装で聞くとゲームの状態が音になります");
