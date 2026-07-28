/**
 * イベントと効果音
 */
import { SFX_EVENTS_CONFIG as C } from "./maps/sfx-events-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const logEl = document.getElementById("sfx-log");
const muteEl = /** @type {HTMLInputElement} */ (
  document.getElementById("mute")
);
const btnBox = document.getElementById("sfx-btns");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

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
 */
export function playTone(freq, dur) {
  if (muteEl?.checked) {
    pushLog(`SE (muted) ${freq}Hz ${dur}s`);
    return;
  }
  const ac = ensureCtx();
  if (!ac) {
    pushLog(`SE (no AudioContext) ${freq}Hz`);
    return;
  }
  if (ac.state === "suspended") ac.resume();
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = "square";
  o.frequency.value = freq;
  g.gain.value = 0.08;
  o.connect(g);
  g.connect(ac.destination);
  const t0 = ac.currentTime;
  g.gain.setValueAtTime(0.08, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
  pushLog(`SE play ${freq}Hz ${dur}s`);
}

// wire SFX listeners once
for (const e of C.events) {
  on(e.id, () => playTone(e.freq, e.dur));
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

loadTextSample(
  "../samples/SfxEventsExample.cs",
  csharpSample,
  "// SfxEventsExample.cs"
);
setStatus("イベントボタンで Emit → SFX 購読者がトーン再生");
pushLog("SfxService が Jump/Land/Hit/… を On");
