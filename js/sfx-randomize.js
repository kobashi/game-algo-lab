/**
 * SE のランダム化 — ピッチ/音量揺らぎ + シャッフルバッグ
 */
import { SFX_RANDOMIZE_CONFIG as C } from "./maps/sfx-randomize-config.js";
import {
  createStatus,
  loadTextSample,
  mulberry32,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const pitchEl = /** @type {HTMLInputElement} */ (
  document.getElementById("pitch-range")
);
const volEl = /** @type {HTMLInputElement} */ (
  document.getElementById("vol-range")
);
const bagEl = /** @type {HTMLInputElement} */ (
  document.getElementById("use-bag")
);
const seedEl = /** @type {HTMLInputElement} */ (document.getElementById("seed"));
const pitchVal = document.getElementById("pitch-val");
const volVal = document.getElementById("vol-val");
const bagView = document.getElementById("bag-view");
const logEl = document.getElementById("sr-log");
const btnPlay = document.getElementById("btn-play");
const btnBurst = document.getElementById("btn-burst");
const muteEl = /** @type {HTMLInputElement} */ (
  document.getElementById("mute")
);
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** @type {AudioContext | null} */
let ac = null;
/** @type {number[]} */
let bag = [];
/** @type {() => number} */
let rng = mulberry32(1);
/** @type {string[]} */
let logs = [];
/** @type {number[]} */
let lastPitches = [];

const VARIANTS = [0, 1, 2, 3, 4]; // bag indices → slight base offset

function sync() {
  if (pitchVal) pitchVal.textContent = Number(pitchEl?.value || 0).toFixed(2);
  if (volVal) volVal.textContent = Number(volEl?.value || 0).toFixed(2);
}

function readSeed() {
  return (Math.floor(Number(seedEl?.value) || 7) >>> 0) || 1;
}

function refillBag() {
  bag = [...VARIANTS];
  // Fisher–Yates
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  // avoid same first as last played variant if possible
  if (lastPitches.length && bag.length > 1 && bag[bag.length - 1] === lastPitches[lastPitches.length - 1]) {
    const t = bag[bag.length - 1];
    bag[bag.length - 1] = bag[0];
    bag[0] = t;
  }
  renderBag();
}

function renderBag() {
  if (bagView) {
    bagView.innerHTML = bag.length
      ? bag.map((v) => `<span class="voice-chip">v${v}</span>`).join("")
      : '<span class="footer-muted">（空→補充）</span>';
  }
}

function pushLog(msg) {
  logs.unshift(msg);
  if (logs.length > 16) logs.pop();
  if (logEl) {
    logEl.innerHTML = logs
      .map((m) => `<div class="es-log es-log-sub">${m}</div>`)
      .join("");
  }
}

function ensureAc() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ac = new AC();
  }
  if (ac?.state === "suspended") ac.resume();
  return ac;
}

/**
 * @returns {{ pitch: number, vol: number, variant: number }}
 */
export function nextParams(useBag, pitchRange, volRange, r) {
  let variant = 0;
  if (useBag) {
    if (!bag.length) refillBag();
    variant = /** @type {number} */ (bag.pop());
    renderBag();
  } else {
    variant = Math.floor(r() * VARIANTS.length);
  }
  const pitch = 1 + (r() - 0.5) * pitchRange + variant * 0.03;
  const vol = Math.max(0.02, 0.08 * (1 + (r() - 0.5) * volRange));
  return { pitch, vol, variant };
}

function playOnce() {
  sync();
  const pitchRange = Number(pitchEl?.value) || 0;
  const volRange = Number(volEl?.value) || 0;
  const p = nextParams(!!bagEl?.checked, pitchRange, volRange, rng);
  lastPitches.push(p.variant);
  if (lastPitches.length > 20) lastPitches.shift();
  const freq = C.baseFreq * p.pitch;
  pushLog(
    `v${p.variant} pitch×${p.pitch.toFixed(2)} vol=${p.vol.toFixed(3)} f=${freq.toFixed(0)}`
  );
  setStatus(`play f≈${freq.toFixed(0)}Hz`);

  if (muteEl?.checked) return;
  const ctx = ensureAc();
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "triangle";
  o.frequency.value = freq;
  g.gain.value = p.vol;
  o.connect(g);
  g.connect(ctx.destination);
  const t0 = ctx.currentTime;
  g.gain.setValueAtTime(p.vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + C.baseDur);
  o.start(t0);
  o.stop(t0 + C.baseDur + 0.02);
}

btnPlay?.addEventListener("click", playOnce);
btnBurst?.addEventListener("click", () => {
  for (let i = 0; i < 6; i++) setTimeout(playOnce, i * 90);
});
seedEl?.addEventListener("change", () => {
  rng = mulberry32(readSeed());
  bag = [];
  renderBag();
  setStatus(`seed=${readSeed()}`);
});
for (const el of [pitchEl, volEl, bagEl]) {
  el?.addEventListener("input", sync);
}

loadTextSample(
  "../samples/SfxRandomizeExample.cs",
  csharpSample,
  "// SfxRandomizeExample.cs"
);
if (seedEl) seedEl.value = "7";
rng = mulberry32(readSeed());
sync();
renderBag();
setStatus("再生でピッチ/バッグを観察");
