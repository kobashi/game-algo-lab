/**
 * 同時発音・重複制御
 */
import { SFX_VOICE_LIMIT_CONFIG as C } from "./maps/sfx-voice-limit-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const maxEl = /** @type {HTMLInputElement} */ (
  document.getElementById("max-voices")
);
const maxVal = document.getElementById("max-val");
const policyEl = /** @type {HTMLSelectElement} */ (
  document.getElementById("policy")
);
const activeEl = document.getElementById("voice-active");
const logEl = document.getElementById("voice-log");
const btnFire = document.getElementById("btn-fire");
const btnBurst = document.getElementById("btn-burst");
const btnClear = document.getElementById("btn-clear");
const muteEl = /** @type {HTMLInputElement} */ (
  document.getElementById("mute")
);
const statsEl = document.getElementById("voice-stats");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** @type {AudioContext | null} */
let ac = null;
/**
 * @typedef {{ id: number, osc: OscillatorNode, gain: GainNode, started: number }} Voice
 * @type {Voice[]}
 */
let voices = [];
let nextId = 1;
let played = 0;
let dropped = 0;
let stolen = 0;
/** @type {string[]} */
let logs = [];

function readMax() {
  const n = Math.floor(Number(maxEl?.value) || C.defaultMaxVoices);
  if (maxVal) maxVal.textContent = String(n);
  return Math.min(C.maxVoices, Math.max(C.minVoices, n));
}

function ensureAc() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ac = new AC();
  }
  if (ac?.state === "suspended") ac.resume();
  return ac;
}

function pushLog(msg) {
  logs.unshift(msg);
  if (logs.length > 20) logs.pop();
  if (logEl) {
    logEl.innerHTML = logs
      .map((m) => `<div class="es-log es-log-sub">${m}</div>`)
      .join("");
  }
}

function stopVoice(v) {
  try {
    v.osc.stop();
  } catch {
    /* already */
  }
  voices = voices.filter((x) => x.id !== v.id);
}

function pruneEnded() {
  // oscillators that should have ended
  const now = performance.now();
  for (const v of [...voices]) {
    if (now - v.started > C.toneDur * 1000 + 50) stopVoice(v);
  }
}

/**
 * @param {'steal' | 'drop'} policy
 */
export function tryPlay(policy, maxVoices) {
  pruneEnded();
  if (voices.length >= maxVoices) {
    if (policy === "steal") {
      // stop oldest
      const oldest = voices.reduce((a, b) =>
        a.started < b.started ? a : b
      );
      stopVoice(oldest);
      stolen += 1;
      pushLog(`steal: 最古 #${oldest.id} を停止`);
    } else {
      dropped += 1;
      pushLog("drop: 新規を破棄");
      render();
      return false;
    }
  }
  if (muteEl?.checked) {
    // still track virtual voice for demo counts without audio
    const id = nextId++;
    played += 1;
    const fake = {
      id,
      osc: /** @type {OscillatorNode} */ ({}),
      gain: /** @type {GainNode} */ ({}),
      started: performance.now(),
    };
    voices.push(fake);
    setTimeout(() => {
      voices = voices.filter((x) => x.id !== id);
      render();
    }, C.toneDur * 1000);
    pushLog(`play #${id} (muted)`);
    render();
    return true;
  }
  const ctx = ensureAc();
  if (!ctx) {
    pushLog("AudioContext 不可");
    return false;
  }
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = C.toneFreq + voices.length * 20;
  gain.gain.value = 0.06;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const t0 = ctx.currentTime;
  gain.gain.setValueAtTime(0.06, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + C.toneDur);
  osc.start(t0);
  osc.stop(t0 + C.toneDur + 0.02);
  const id = nextId++;
  const voice = { id, osc, gain, started: performance.now() };
  voices.push(voice);
  played += 1;
  osc.onended = () => {
    voices = voices.filter((x) => x.id !== id);
    render();
  };
  pushLog(`play #${id} active=${voices.length}/${maxVoices}`);
  render();
  return true;
}

function render() {
  pruneEnded();
  const max = readMax();
  if (activeEl) {
    activeEl.innerHTML =
      voices
        .map(
          (v) =>
            `<span class="voice-chip">#${v.id}</span>`
        )
        .join(" ") || '<span class="footer-muted">（なし）</span>';
  }
  if (statsEl) {
    statsEl.innerHTML = `
      <table class="coord-table">
        <tr><td>上限</td><td>${max}</td></tr>
        <tr><td>アクティブ</td><td>${voices.length}</td></tr>
        <tr><td>再生</td><td>${played}</td></tr>
        <tr><td>steal</td><td>${stolen}</td></tr>
        <tr><td>drop</td><td>${dropped}</td></tr>
        <tr><td>方策</td><td>${policyEl?.value || "steal"}</td></tr>
      </table>`;
  }
  setStatus(`voices ${voices.length}/${max}`);
}

function fire() {
  tryPlay(/** @type {'steal'|'drop'} */ (policyEl?.value || "steal"), readMax());
}

btnFire?.addEventListener("click", fire);
btnBurst?.addEventListener("click", () => {
  for (let i = 0; i < 8; i++) setTimeout(fire, i * 40);
});
btnClear?.addEventListener("click", () => {
  for (const v of [...voices]) stopVoice(v);
  voices = [];
  render();
  pushLog("全停止");
});
maxEl?.addEventListener("input", () => {
  readMax();
  render();
});
policyEl?.addEventListener("change", () => render());

loadTextSample(
  "../samples/SfxVoiceLimitExample.cs",
  csharpSample,
  "// SfxVoiceLimitExample.cs"
);
if (maxEl) maxEl.value = String(C.defaultMaxVoices);
readMax();
render();
setStatus("連打 / バーストで上限超過を観察");
