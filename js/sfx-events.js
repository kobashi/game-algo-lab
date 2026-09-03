/**
 * イベントと効果音
 */
import { SFX_EVENTS_CONFIG as C } from "./maps/sfx-events-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
  applyParamsToControls,
  mountShareLink,
} from "./platform/index.js";

mountTopicShellFromDataset();

const logEl = document.getElementById("sfx-log");
const muteEl = /** @type {HTMLInputElement} */ (
  document.getElementById("mute")
);
const evEl = /** @type {HTMLSelectElement} */ (
  document.getElementById("sfx-ev")
);
const freqEl = /** @type {HTMLInputElement} */ (
  document.getElementById("sfx-freq")
);
const durEl = /** @type {HTMLInputElement} */ (
  document.getElementById("sfx-dur")
);
const gainEl = /** @type {HTMLInputElement} */ (
  document.getElementById("sfx-gain")
);
const freqVal = document.getElementById("sfx-freq-val");
const durVal = document.getElementById("sfx-dur-val");
const gainVal = document.getElementById("sfx-gain-val");
const btnBox = document.getElementById("sfx-btns");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** @type {Record<string, { freq: number, dur: number, gain: number }>} */
const overrides = {};

function defaultParams(id) {
  const e = C.events.find((x) => x.id === id);
  return {
    freq: e?.freq ?? 440,
    dur: e?.dur ?? 0.08,
    gain: 0.08,
  };
}

function paramsFor(id) {
  return { ...defaultParams(id), ...(overrides[id] || {}) };
}

function selectedId() {
  return evEl?.value || C.events[0]?.id || "Jump";
}

function slidersFromSelected() {
  const p = paramsFor(selectedId());
  if (freqEl) freqEl.value = String(p.freq);
  if (durEl) durEl.value = String(p.dur);
  if (gainEl) gainEl.value = String(p.gain);
  syncSfxLabels();
}

function slidersToOverride() {
  const id = selectedId();
  overrides[id] = {
    freq: Number(freqEl?.value),
    dur: Number(durEl?.value),
    gain: Number(gainEl?.value),
  };
  syncSfxLabels();
}

function syncSfxLabels() {
  if (freqVal) freqVal.textContent = String(Math.round(Number(freqEl?.value) || 0));
  if (durVal) durVal.textContent = Number(durEl?.value || 0).toFixed(2);
  if (gainVal) gainVal.textContent = Number(gainEl?.value || 0).toFixed(2);
}

/** @type {AudioContext | null} */
let ctx = null;
/** @type {Map<string, Set<(p: object) => void>>} */
const bus = new Map();
/** @type {string[]} */
let logs = [];

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  return ctx;
}

function on(ev, fn) {
  if (!bus.has(ev)) bus.set(ev, new Set());
  bus.get(ev)?.add(fn);
}

function emit(ev, payload = {}) {
  pushLog(`Emit ${ev}`);
  const set = bus.get(ev);
  if (set) for (const fn of set) fn(payload);
  setStatus(`Emit ${ev}`);
}

function pushLog(msg) {
  logs.unshift(`${new Date().toLocaleTimeString()} ${msg}`);
  if (logs.length > 30) logs.pop();
  if (logEl) {
    logEl.innerHTML = logs
      .map((m) => `<div class="es-log es-log-sub">${m}</div>`)
      .join("");
  }
}

/**
 * @param {number} freq
 * @param {number} dur
 * @param {number} [gain]
 */
export function playTone(freq, dur, gain = 0.08) {
  if (muteEl?.checked) {
    pushLog(`SE (muted) ${freq}Hz ${dur}s`);
    return;
  }
  const ac = ensureCtx();
  if (!ac) {
    pushLog(`SE (no AudioContext) ${freq}Hz`);
    return;
  }
  if (gain <= 0) {
    pushLog(`SE (gain 0) ${freq}Hz ${dur}s`);
    return;
  }
  if (ac.state === "suspended") ac.resume();
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = "square";
  o.frequency.value = freq;
  o.connect(g);
  g.connect(ac.destination);
  const t0 = ac.currentTime;
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(Math.min(0.001, gain / 80), t0 + dur);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
  pushLog(`SE play ${freq}Hz ${dur}s g=${gain.toFixed(2)}`);
}

// wire SFX listeners once（再生時に現在の上書き値を使う。config は既定のまま）
for (const e of C.events) {
  on(e.id, () => {
    const p = paramsFor(e.id);
    playTone(p.freq, p.dur, p.gain);
  });
}

if (btnBox) {
  btnBox.innerHTML = C.events
    .map(
      (e) =>
        `<button type="button" class="btn btn-ghost sfx-btn" data-ev="${e.id}">${e.id}</button>`
    )
    .join(" ");
  btnBox.querySelectorAll(".sfx-btn").forEach((b) => {
    b.addEventListener("click", () => {
      emit(/** @type {HTMLElement} */ (b).dataset.ev || "UI");
    });
  });
}

// mini game events
document.getElementById("btn-jump")?.addEventListener("click", () => emit("Jump"));
document.getElementById("btn-land")?.addEventListener("click", () => emit("Land"));
document.getElementById("btn-hit")?.addEventListener("click", () => emit("Hit"));
document.getElementById("btn-pick")?.addEventListener("click", () => emit("Pickup"));

if (evEl) {
  evEl.innerHTML = C.events
    .map((e) => `<option value="${e.id}">${e.id}</option>`)
    .join("");
  evEl.value = C.events[0].id;
}
evEl?.addEventListener("change", () => {
  slidersFromSelected();
});
for (const el of [freqEl, durEl, gainEl]) {
  el?.addEventListener("input", () => {
    slidersToOverride();
  });
}

loadTextSample(
  "../samples/SfxEventsExample.cs",
  csharpSample,
  "// SfxEventsExample.cs"
);

slidersFromSelected();
const urlSpec = {
  ev: { el: evEl, kind: "select" },
  freq: { el: freqEl, kind: "range" },
  dur: { el: durEl, kind: "range" },
  gain: { el: gainEl, kind: "range" },
};
mountShareLink({
  spec: urlSpec,
  button: document.getElementById("btn-copy-url"),
  statusEl: document.getElementById("status"),
});
const urlResult = applyParamsToControls(urlSpec);
slidersToOverride();
if (urlResult.warning) {
  setStatus(urlResult.warning);
} else {
  setStatus("イベントボタンで Emit → SFX 購読者がトーン再生");
}
pushLog("SfxService が Jump/Land/Hit/… を On");
