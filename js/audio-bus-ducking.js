/**
 * サウンドバス + ダッキング
 */
import { AUDIO_BUS_DUCKING_CONFIG as C } from "./maps/audio-bus-ducking-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";
import { bindAudioLifecycle } from "./audio/audio-engine.js";
import { levelsFromFloat } from "./audio/audio-math.js";

mountTopicShellFromDataset();

const metersEl = document.getElementById("bus-meters");
const logEl = document.getElementById("bus-log");
const muteEl = /** @type {HTMLInputElement} */ (
  document.getElementById("mute")
);
const bgmGainEl = /** @type {HTMLInputElement} */ (
  document.getElementById("bgm-gain")
);
const seGainEl = /** @type {HTMLInputElement} */ (
  document.getElementById("se-gain")
);
const masterEl = /** @type {HTMLInputElement} */ (
  document.getElementById("master-gain")
);
const bgmVal = document.getElementById("bgm-val");
const seVal = document.getElementById("se-val");
const masterVal = document.getElementById("master-val");
const btnBgm = document.getElementById("btn-bgm");
const btnSe = document.getElementById("btn-se");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** @type {AudioContext | null} */
let ac = null;
/** @type {GainNode | null} */
let masterGain = null;
/** @type {GainNode | null} */
let bgmBus = null;
/** @type {GainNode | null} */
let seBus = null;
/** @type {GainNode | null} */
let bgmDuck = null;
/** @type {GainNode | null} */
let seUser = null;
/** @type {GainNode | null} */
let dryGain = null;
/** @type {GainNode | null} */
let wetGain = null;
/** @type {DynamicsCompressorNode | null} */
let compNode = null;
/** @type {AnalyserNode | null} */
let analyser = null;
/** @type {Float32Array | null} */
let floatBuf = null;
/** @type {OscillatorNode | null} */
let bgmOsc = null;
/** @type {OscillatorNode | null} */
let sustainOsc = null;
/** @type {GainNode | null} */
let sustainGain = null;
let bgmOn = false;
/** live duck multiplier applied on top of user BGM gain */
let duckMul = 1;
/** @type {string[]} */
let logs = [];
/** visual levels 0..1 */
let visBgm = 0;
let visSe = 0;
/** @type {number | null} */
let rafId = null;

function pushLog(msg) {
  logs.unshift(msg);
  if (logs.length > 14) logs.pop();
  if (logEl) {
    logEl.innerHTML = logs
      .map((m) => `<div class="es-log es-log-sub">${m}</div>`)
      .join("");
  }
}

function syncLabels() {
  if (bgmVal) bgmVal.textContent = Number(bgmGainEl?.value || 0).toFixed(2);
  if (seVal) seVal.textContent = Number(seGainEl?.value || 0).toFixed(2);
  if (masterVal) masterVal.textContent = Number(masterEl?.value || 0).toFixed(2);
  for (const [id, digits] of [
    ["comp-thr", 0],
    ["comp-ratio", 1],
    ["comp-knee", 0],
    ["comp-atk", 3],
    ["comp-rel", 2],
  ]) {
    const node = document.getElementById(id);
    const label = document.getElementById(`${id}-val`);
    if (node instanceof HTMLInputElement && label) {
      label.textContent = Number(node.value).toFixed(digits);
    }
  }
}

function userBgm() {
  return Number(bgmGainEl?.value) || C.defaultBgmGain;
}
function userSe() {
  return Number(seGainEl?.value) || C.defaultSeGain;
}
function userMaster() {
  return Number(masterEl?.value) || C.defaultMaster;
}

function checked(id) {
  const node = document.getElementById(id);
  return node instanceof HTMLInputElement && node.checked;
}

function soloMode() {
  const node = document.getElementById("solo");
  return node instanceof HTMLSelectElement ? node.value : "none";
}

function ensureGraph() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    bindAudioLifecycle(ac);
    masterGain = ac.createGain();
    bgmBus = ac.createGain();
    bgmDuck = ac.createGain();
    seBus = ac.createGain();
    seUser = ac.createGain();
    dryGain = ac.createGain();
    wetGain = ac.createGain();
    compNode = ac.createDynamicsCompressor();
    analyser = ac.createAnalyser();
    analyser.fftSize = 1024;
    floatBuf = new Float32Array(analyser.fftSize);
    bgmBus.connect(bgmDuck);
    bgmDuck.connect(masterGain);
    seBus.connect(seUser);
    seUser.connect(dryGain);
    seUser.connect(compNode);
    compNode.connect(wetGain);
    dryGain.connect(masterGain);
    wetGain.connect(masterGain);
    masterGain.connect(analyser);
    analyser.connect(ac.destination);
    dryGain.gain.value = 1;
    wetGain.gain.value = 0;
  }
  if (ac.state === "suspended") ac.resume();
  applyGains();
  applyComp();
  return ac;
}

function applyGains() {
  if (!ac || !masterGain || !bgmBus || !seUser) return;
  const now = ac.currentTime;
  const solo = soloMode();
  const bgmHear = bgmOn && !checked("mute-bgm") && solo !== "se";
  const seHear = !checked("mute-se") && solo !== "bgm";
  masterGain.gain.setValueAtTime(checked("mute") ? 0 : userMaster(), now);
  bgmBus.gain.setValueAtTime(bgmHear ? userBgm() : 0, now);
  seUser.gain.setValueAtTime(seHear ? userSe() : 0, now);
}

function applyComp() {
  if (!ac || !compNode || !dryGain || !wetGain) return;
  const now = ac.currentTime;
  const on = checked("comp-on");
  dryGain.gain.setValueAtTime(on ? 0 : 1, now);
  wetGain.gain.setValueAtTime(on ? 1 : 0, now);
  const num = (id, fallback) => {
    const node = document.getElementById(id);
    const n = node instanceof HTMLInputElement ? Number(node.value) : fallback;
    return Number.isFinite(n) ? n : fallback;
  };
  compNode.threshold.setValueAtTime(num("comp-thr", -24), now);
  compNode.knee.setValueAtTime(num("comp-knee", 12), now);
  compNode.ratio.setValueAtTime(num("comp-ratio", 4), now);
  compNode.attack.setValueAtTime(num("comp-atk", 0.005), now);
  compNode.release.setValueAtTime(num("comp-rel", 0.25), now);
}

function scheduleDuckAudio() {
  if (!ac || !bgmDuck) return;
  const now = ac.currentTime;
  const param = bgmDuck.gain;
  const floor = C.duckTo;
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(floor, now + C.duckAttack);
  param.setValueAtTime(floor, now + C.duckAttack + C.duckHold);
  param.linearRampToValueAtTime(1, now + C.duckAttack + C.duckHold + C.duckRelease);
}

/**
 * Schedule duck envelope on bgmBus relative gain via duckMul simulation
 * (visual + audio both follow duckMul).
 */
export function duckSchedule(now, attack, hold, release, duckTo) {
  // returns keyframes [{t, mul}]
  return [
    { t: now, mul: 1 },
    { t: now + attack, mul: duckTo },
    { t: now + attack + hold, mul: duckTo },
    { t: now + attack + hold + release, mul: 1 },
  ];
}

/** @type {{ t: number, mul: number }[]} */
let duckKeys = [];
let duckClock = 0;

function evalDuck(t) {
  if (!duckKeys.length) return 1;
  if (t <= duckKeys[0].t) return duckKeys[0].mul;
  for (let i = 1; i < duckKeys.length; i++) {
    const a = duckKeys[i - 1];
    const b = duckKeys[i];
    if (t <= b.t) {
      const u = (t - a.t) / Math.max(1e-6, b.t - a.t);
      return a.mul + (b.mul - a.mul) * u;
    }
  }
  return duckKeys[duckKeys.length - 1].mul;
}

function startBgm() {
  if (muteEl?.checked) {
    bgmOn = true;
    pushLog("BGM on (muted)");
    setStatus("BGM ON（ミュート）");
    return;
  }
  const ctx = ensureGraph();
  if (!ctx || !bgmBus) return;
  stopBgmOsc();
  bgmOsc = ctx.createOscillator();
  const g = ctx.createGain();
  bgmOsc.type = "triangle";
  bgmOsc.frequency.value = C.bgmFreq;
  g.gain.value = 0.06;
  bgmOsc.connect(g);
  g.connect(bgmBus);
  bgmOsc.start();
  bgmOn = true;
  applyGains();
  pushLog("BGM start");
  setStatus("BGM ON");
}

function stopBgmOsc() {
  if (bgmOsc) {
    try {
      bgmOsc.stop();
    } catch {
      /* already stopped */
    }
    bgmOsc.disconnect();
    bgmOsc = null;
  }
}

function stopBgm() {
  stopBgmOsc();
  bgmOn = false;
  applyGains();
  pushLog("BGM stop");
  setStatus("BGM OFF");
}

function fireSe() {
  const now = duckClock;
  duckKeys = duckSchedule(
    now,
    C.duckAttack,
    C.duckHold,
    C.duckRelease,
    C.duckTo
  );
  pushLog(`SE → duck BGM to ${C.duckTo}`);
  setStatus("SE + duck");
  visSe = 1;

  if (muteEl?.checked) return;
  const ctx = ensureGraph();
  if (!ctx || !seBus) return;
  scheduleDuckAudio();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "square";
  o.frequency.value = C.seFreq;
  g.gain.value = 0.1;
  o.connect(g);
  g.connect(seBus);
  const t0 = ctx.currentTime;
  g.gain.setValueAtTime(0.1, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + C.seDur);
  o.start(t0);
  o.stop(t0 + C.seDur + 0.02);
  o.onended = () => {
    try {
      o.disconnect();
      g.disconnect();
    } catch {
      /* already */
    }
  };
}

function toggleSustain() {
  if (muteEl?.checked) {
    setStatus("ミュート中は持続音を鳴らしません");
    return;
  }
  const ctx = ensureGraph();
  if (!ctx || !seBus) return;
  if (sustainOsc) {
    try {
      sustainOsc.stop();
    } catch {
      /* already */
    }
    try {
      sustainOsc.disconnect();
      sustainGain?.disconnect();
    } catch {
      /* already */
    }
    sustainOsc = null;
    sustainGain = null;
    setStatus("持続音を止めました");
    return;
  }
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.value = 180;
  g.gain.value = 0.06;
  osc.connect(g);
  g.connect(seBus);
  osc.start();
  sustainOsc = osc;
  sustainGain = g;
  setStatus("持続音を鳴らし、圧縮の前後を見ます");
}

function renderMeters() {
  if (!metersEl) return;
  const b = Math.round(visBgm * 100);
  const s = Math.round(visSe * 100);
  const m = Math.round(userMaster() * 100);
  metersEl.innerHTML = `
    <div class="pf-row"><span>Master</span>
      <div class="pf-bar"><i style="width:${m}%;background:#9aabbf"></i></div>
      <span class="pf-ms">${userMaster().toFixed(2)}</span></div>
    <div class="pf-row"><span>BGM</span>
      <div class="pf-bar"><i style="width:${b}%;background:#5b9fd4"></i></div>
      <span class="pf-ms">${(userBgm() * duckMul * (bgmOn ? 1 : 0)).toFixed(2)}</span></div>
    <div class="pf-row"><span>SE</span>
      <div class="pf-bar"><i style="width:${s}%;background:#e07a5f"></i></div>
      <span class="pf-ms">${(userSe() * visSe).toFixed(2)}</span></div>
    <p class="footer-muted">duckMul=${duckMul.toFixed(2)}（画面の包絡。音のダックは時間指定）</p>`;
  const read = document.getElementById("meter-readout");
  if (read && analyser && floatBuf) {
    analyser.getFloatTimeDomainData(floatBuf);
    const level = levelsFromFloat(floatBuf);
    const gr = compNode ? Math.abs(compNode.reduction || 0) : 0;
    read.textContent = `Peak ${level.peakDb.toFixed(1)} dBFS / RMS ${level.rmsDb.toFixed(1)} dBFS / GR ${gr.toFixed(1)} dB`;
  }
}

let lastTs = 0;
function loop(ts) {
  if (!lastTs) lastTs = ts;
  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;
  duckClock += dt;
  duckMul = evalDuck(duckClock);
  const targetBgm = bgmOn ? userBgm() * duckMul : 0;
  visBgm += (targetBgm - visBgm) * Math.min(1, dt * 12);
  visSe *= Math.exp(-dt * 4);
  renderMeters();
  rafId = requestAnimationFrame(loop);
}

btnBgm?.addEventListener("click", () => {
  if (bgmOn) stopBgm();
  else startBgm();
  if (btnBgm) btnBgm.textContent = bgmOn ? "BGM 停止" : "BGM 再生";
});
btnSe?.addEventListener("click", fireSe);
document.getElementById("btn-sustain")?.addEventListener("click", toggleSustain);
for (const el of [bgmGainEl, seGainEl, masterEl]) {
  el?.addEventListener("input", () => {
    syncLabels();
    applyGains();
  });
}
for (const id of ["comp-thr", "comp-ratio", "comp-knee", "comp-atk", "comp-rel", "comp-on", "mute", "mute-bgm", "mute-se", "solo"]) {
  document.getElementById(id)?.addEventListener("input", () => {
    syncLabels();
    applyGains();
    applyComp();
  });
}

loadTextSample(
  "../samples/AudioBusDuckingExample.cs",
  csharpSample,
  "// AudioBusDuckingExample.cs"
);
if (bgmGainEl) bgmGainEl.value = String(C.defaultBgmGain);
if (seGainEl) seGainEl.value = String(C.defaultSeGain);
if (masterEl) masterEl.value = String(C.defaultMaster);
syncLabels();
renderMeters();
rafId = requestAnimationFrame(loop);
setStatus("BGM を再生してから SE を鳴らすとダック");

import { mountTopicTask } from "./audio/topic-tasks.js";
mountTopicTask("audio-bus-ducking");
