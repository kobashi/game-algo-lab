/**
 * イベントと効果音。発行は emit だけ。音は購読側が決める。
 * @see docs/topics/sfx-events/SPEC.md
 */
import { SFX_EVENTS_CONFIG as C } from "./maps/sfx-events-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
  applyParamsToControls,
  mountShareLink,
  mountGlossary,
  formatTenths,
  isFieldKeyTarget,
} from "./platform/index.js";
import { bindAudioLifecycle, createAudioEngine, rampLinear, rampParam } from "./audio/audio-engine.js";
import { createBgmManager, LOOP_SECONDS } from "./audio/bgm-manager.js";
import { createSfxManager } from "./audio/sfx-manager.js";
import { createDirector } from "./audio/audio-director.js";
import { drawSchematic, drawScope, paintMeter, readLevel } from "./audio/audio-meter.js";
import { AUDIO_PRESETS, PRESET_LABELS } from "./audio/audio-presets.js";
import { createGameSim } from "./audio/game-sim.js";
import { mountTopicTask } from "./audio/topic-tasks.js";
import {
  clamp,
  gainToDb,
  healthLowpassHz,
  heartbeatInterval,
  SAFETY_VOICE_CAP,
} from "./audio/audio-math.js";

mountTopicShellFromDataset();
mountGlossary();

const logEl = document.getElementById("sfx-log");
const setStatus = createStatus(document.getElementById("status"));
const waveCanvas = /** @type {HTMLCanvasElement} */ (document.getElementById("sfx-wave"));
const scopeCanvas = /** @type {HTMLCanvasElement} */ (document.getElementById("sfx-scope"));
const waveCtx = waveCanvas?.getContext("2d");
const scopeCtx = scopeCanvas?.getContext("2d");

/** @type {HTMLInputElement | null} */
const byId = (id) => /** @type {HTMLInputElement | null} */ (document.getElementById(id));
/** @type {(id: string) => HTMLSelectElement | null} */
const bySel = (id) => /** @type {HTMLSelectElement | null} */ (document.getElementById(id));

const muteEl = byId("mute");
const evEl = bySel("sfx-ev");
const freqEl = byId("sfx-freq");
const durEl = byId("sfx-dur");
const gainEl = byId("sfx-gain");
const btnBox = document.getElementById("sfx-btns");
const csharpSample = document.getElementById("csharp-sample");

/** @type {Record<string, { freq: number, dur: number, gain: number }>} */
const overrides = {};
/** @type {{ freq: number, dur: number, gain: number, wave?: string, attack?: number, release?: number, rate?: number } | null} */
let lastTone = null;
/** @type {string[]} */
let logs = [];
/** @type {Map<string, Set<(p: object) => void>>} */
const bus = new Map();
let urlApplying = false;
/** @type {ReturnType<typeof setInterval> | null} */
let mashTimer = null;

/** @type {ReturnType<typeof createAudioEngine>} */
let engine = null;
/** @type {ReturnType<typeof createBgmManager> | null} */
let bgm = null;
/** @type {ReturnType<typeof createSfxManager> | null} */
let sfx = null;
/** @type {ReturnType<typeof createDirector> | null} */
let director = null;
/** @type {Uint8Array | null} */
let scopeBytes = null;
/** @type {Uint8Array | null} */
let bgmBytes = null;
/** @type {Uint8Array | null} */
let sfxPreBytes = null;
/** @type {Uint8Array | null} */
let sfxPostBytes = null;
/** @type {Uint8Array | null} */
let masterBytes = null;

const STATE_LABEL = {
  title: "タイトル",
  normal: "通常",
  battle: "戦闘",
  success: "成功",
  fail: "失敗",
};

function num(id, fallback) {
  const n = Number(byId(id)?.value);
  return Number.isFinite(n) ? n : fallback;
}

function onBox(id) {
  return !!byId(id)?.checked;
}

function selectedId() {
  return evEl?.value || C.events[0]?.id || "Jump";
}

function defaultParams(id) {
  const e = C.events.find((x) => x.id === id);
  return { freq: e?.freq ?? 440, dur: e?.dur ?? 0.08, gain: 0.08 };
}

function paramsFor(id) {
  return { ...defaultParams(id), ...(overrides[id] || {}) };
}

function formatControl(id, n) {
  if (id === "sfx-freq") return formatTenths(n);
  if (id === "sfx-dur" || id === "sfx-gain" || id === "sfx-atk" || id === "sfx-rel" || id === "comp-rel") {
    return n.toFixed(2);
  }
  if (id === "bgm-vol" || id === "sfx-vol" || id === "mast-vol") return n.toFixed(2);
  if (id === "comp-atk") return n.toFixed(3);
  if (id === "sfx-pit" || id === "sfx-rate" || id === "bgm-xf" || id === "dyn-scale" || id === "comp-ratio") {
    return n.toFixed(1);
  }
  const q = Math.round(n * 10) / 10;
  return Number.isInteger(q) ? String(q) : q.toFixed(1);
}

function syncOne(id) {
  const label = document.getElementById(`${id}-val`);
  const node = byId(id);
  if (!label || !node) return;
  label.textContent = formatControl(id, Number(node.value) || 0);
}

function syncState() {
  const state = bySel("dyn-state")?.value || "title";
  const el = document.getElementById("state-readout");
  const hold = director?.isManual() ? "（曲の選択を優先）" : "";
  if (el) el.textContent = `場面 ${STATE_LABEL[state] || state}${hold}`;
}

function slidersFromSelected() {
  const p = paramsFor(selectedId());
  if (freqEl) freqEl.value = String(p.freq);
  if (durEl) durEl.value = String(p.dur);
  if (gainEl) gainEl.value = String(p.gain);
  syncOne("sfx-freq");
  syncOne("sfx-dur");
  syncOne("sfx-gain");
}

function slidersToOverride() {
  overrides[selectedId()] = {
    freq: Number(freqEl?.value),
    dur: Number(durEl?.value),
    gain: Number(gainEl?.value),
  };
  syncOne("sfx-freq");
  syncOne("sfx-dur");
  syncOne("sfx-gain");
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
  if (logs.length > 40) logs.pop();
  if (logEl) {
    logEl.innerHTML = logs
      .map((m) => `<div class="es-log es-log-sub">${m}</div>`)
      .join("");
  }
}

function toneView() {
  return {
    freq: Number(freqEl?.value) || 440,
    dur: Number(durEl?.value) || 0.08,
    gain: Number(gainEl?.value) || 0,
    wave: bySel("sfx-type")?.value || "square",
    attack: num("sfx-atk", 0.01),
    release: num("sfx-rel", 0.05),
  };
}

function drawNow() {
  if (waveCtx && waveCanvas) drawSchematic(waveCtx, waveCanvas, toneView());
}

function drawIdleScope() {
  if (!scopeCtx || !scopeCanvas) return;
  scopeCtx.fillStyle = "#0a0e14";
  scopeCtx.fillRect(0, 0, scopeCanvas.width, scopeCanvas.height);
  scopeCtx.fillStyle = "#9aabbf";
  scopeCtx.font = "14px sans-serif";
  scopeCtx.fillText("実測（Master・Analyser）  操作すると動き出します", 8, 28);
}

function showTab(name) {
  const allowed = ["oneshot", "bgm", "mixer", "dynamic", "sim"];
  const tab = allowed.includes(name) ? name : "oneshot";
  const sel = bySel("sfx-tab");
  if (sel && sel.value !== tab) sel.value = tab;
  document.querySelectorAll(".sfx-tab").forEach((btn) => {
    btn.setAttribute("aria-selected", btn.getAttribute("data-tab") === tab ? "true" : "false");
  });
  document.querySelectorAll(".sfx-panel").forEach((panel) => {
    panel.hidden = panel.getAttribute("data-panel") !== tab;
  });
}

function syncLayerManual() {
  const manual = onBox("layer-manual");
  for (const id of ["layer-base", "layer-tension", "layer-battle"]) {
    const node = byId(id);
    if (node) node.disabled = !manual;
  }
}

function readDirector() {
  return {
    health: num("dyn-health", 100),
    tension: num("dyn-tension", 0),
    gameState: bySel("dyn-state")?.value || "title",
    timeScale: num("dyn-scale", 1),
    bgmFollow: onBox("bgm-follow"),
    crossfade: num("bgm-xf", 1),
    duckAmount: num("duck-amt", 12),
    duckAttack: num("duck-atk", 40) / 1000,
    duckHold: num("duck-hold", 120) / 1000,
    duckRelease: num("duck-rel", 400) / 1000,
    layerManual: onBox("layer-manual"),
    battleLayer: num("layer-battle", 0) / 100,
  };
}

function applyLive() {
  if (!engine) return;
  const ctx = engine.ctx;
  rampParam(ctx, engine.bgmUser.gain, num("bgm-vol", 0.4), 0.03);
  rampParam(ctx, engine.sfxUser.gain, num("sfx-vol", 0.55), 0.03);
  rampParam(ctx, engine.masterUser.gain, num("mast-vol", 0.45), 0.03);
  rampLinear(ctx, engine.masterGate.gain, onBox("mute") ? 0 : 1, 0.02);
  const anySolo = onBox("bgm-solo") || onBox("sfx-solo");
  const bgmHear = !onBox("bgm-mute") && (!anySolo || onBox("bgm-solo"));
  const sfxHear = !onBox("sfx-mute") && (!anySolo || onBox("sfx-solo"));
  rampLinear(ctx, engine.bgmSolo.gain, bgmHear ? 1 : 0, 0.02);
  rampLinear(ctx, engine.sfxSolo.gain, sfxHear ? 1 : 0, 0.02);
  engine.setBypass("sfx", onBox("sfx-comp"));
  engine.setBypass("master", onBox("mast-comp"));
  const comp = {
    threshold: num("comp-thr", -24),
    knee: num("comp-knee", 12),
    ratio: num("comp-ratio", 4),
    attack: num("comp-atk", 0.005),
    release: num("comp-rel", 0.15),
  };
  engine.setSfxCompressor(comp);
  engine.setMasterCompressor(comp);
  if (bgm) bgm.setLoop(onBox("bgm-loop"));
}

function applyLayers() {
  if (!bgm || !onBox("layer-manual")) return;
  const base = num("layer-base", 100) / 100;
  const tension = num("layer-tension", 0) / 100;
  const battle = num("layer-battle", 0) / 100;
  for (const id of ["a", "b"]) {
    bgm.setLayerGain(id, "base", base);
    bgm.setLayerGain(id, "tension", tension);
    bgm.setLayerGain(id, "battle", battle);
  }
}

function beginAudio() {
  if (urlApplying) return false;
  try {
    if (!engine) {
      engine = createAudioEngine();
      if (!engine) return false;
      bgm = createBgmManager(engine);
      sfx = createSfxManager(engine, {
        log: pushLog,
        now: () => engine.ctx.currentTime,
      });
      director = createDirector({
        engine,
        bgm,
        sfx,
        get: readDirector,
      });
      bindAudioLifecycle(engine.ctx);
    }
    engine.resume();
    applyLive();
    return true;
  } catch {
    setStatus("音声を開始できません");
    return false;
  }
}

/**
 * @param {number} freq
 * @param {number} dur
 * @param {number} [gain]
 * @param {{ wave?: string, attack?: number, release?: number, rate?: number, eventId?: string, burst?: boolean, system?: boolean }} [opt]
 */
export function playTone(freq, dur, gain = 0.08, opt = {}) {
  const wave = opt.wave || bySel("sfx-type")?.value || "square";
  const attack = opt.attack ?? num("sfx-atk", 0.01);
  const release = opt.release ?? num("sfx-rel", 0.05);
  const sliderRate = opt.rate ?? num("sfx-rate", 1);
  lastTone = { freq, dur, gain, wave, attack, release, rate: sliderRate };
  if (waveCtx && waveCanvas) {
    drawSchematic(waveCtx, waveCanvas, { freq, dur, gain, wave, attack, release });
  }
  if (muteEl?.checked) {
    pushLog(`SE (muted) ${freq}Hz ${dur}s`);
    if (engine) rampLinear(engine.ctx, engine.masterGate.gain, 0, 0.02);
    return;
  }
  if (!(gain > 0)) {
    pushLog(`SE (gain 0) ${freq}Hz ${dur}s`);
    return;
  }
  if (!beginAudio() || !sfx || !engine) {
    pushLog(`SE (no AudioContext) ${freq}Hz`);
    return;
  }
  const pit = num("sfx-pit", 0);
  let rate = sliderRate * num("dyn-scale", 1);
  if (pit > 0) rate *= 1 + (Math.random() * 2 - 1) * pit;
  const voice = sfx.play({
    freq,
    dur,
    gain,
    wave,
    attack,
    release,
    rate,
    eventId: opt.eventId || selectedId(),
    burst: !!opt.burst,
    system: !!opt.system,
    cooldown: onBox("sfx-cool"),
    cap: Math.round(num("sfx-vmax", 16)),
    policy: /** @type {"unlimited"|"reject"|"oldest"|"quietest"} */ (bySel("sfx-steal")?.value || "unlimited"),
  });
  if (voice) pushLog(`SE play ${freq}Hz ${dur}s g=${gain.toFixed(2)}`);
}

function setHealth(v) {
  const node = byId("dyn-health");
  if (!node) return;
  node.value = String(clamp(v, 0, 100));
  syncOne("dyn-health");
}

function setEnemies(v) {
  const node = byId("dyn-enemies");
  if (!node) return;
  node.value = String(clamp(v, 0, 10));
  syncOne("dyn-enemies");
}

function requestState(state) {
  const node = bySel("dyn-state");
  if (!node) return;
  if (node.value !== state) node.value = state;
  syncState();
  if (!director) beginAudio();
  if (director) director.applyState(state, { fromUser: true });
}

for (const e of C.events) {
  on(e.id, (payload) => {
    const p = paramsFor(e.id);
    playTone(p.freq, p.dur, p.gain, { eventId: e.id });
    if (e.id === "Hit" && director && byId("duck-amt")) director.duck();
    if (e.id === "Hit") {
      const dmg = Number(payload && /** @type {{ damage?: number }} */ (payload).damage);
      if (Number.isFinite(dmg) && dmg > 0) setHealth(num("dyn-health", 100) - dmg);
    }
    if (e.id === "Pickup" && payload && /** @type {{ kind?: string }} */ (payload).kind === "rare") {
      if (director && byId("duck-amt")) director.duck();
      setHealth(num("dyn-health", 100) + 35);
      playTone(880, 0.18, 0.07, {
        wave: "sine",
        attack: 0.008,
        release: 0.14,
        rate: 1,
        eventId: "ImportantPickup",
      });
    }
  });
}

on("Explosion", () => {
  playTone(90, 0.4, 0.12, {
    wave: "noise",
    attack: 0.005,
    release: 0.28,
    rate: 1,
    eventId: "Explosion",
  });
  if (director && byId("duck-amt")) director.duck();
});

on("EnemySpawn", (payload) => {
  const n = clamp(Number(payload && /** @type {{ count?: number }} */ (payload).count) || 0, 0, 10);
  setEnemies(n);
  const state = bySel("dyn-state")?.value;
  if (n > 0 && (state === "title" || state === "normal")) requestState("battle");
  if (n === 0 && state === "battle") requestState("normal");
});

on("Enter", (payload) => {
  const state = payload && /** @type {{ state?: string }} */ (payload).state;
  if (state && state in STATE_LABEL) requestState(state);
});

on("Clear", () => requestState("success"));
on("Defeat", () => requestState("fail"));

if (btnBox) {
  btnBox.innerHTML = C.events
    .map((e) => `<button type="button" class="btn btn-ghost sfx-btn" data-ev="${e.id}">${e.id}</button>`)
    .join(" ");
  btnBox.querySelectorAll(".sfx-btn").forEach((b) => {
    b.addEventListener("click", () => emit(/** @type {HTMLElement} */ (b).dataset.ev || "UI"));
  });
}

document.getElementById("btn-jump")?.addEventListener("click", () => emit("Jump"));
document.getElementById("btn-land")?.addEventListener("click", () => emit("Land"));
document.getElementById("btn-hit")?.addEventListener("click", () => emit("Hit"));
document.getElementById("btn-pick")?.addEventListener("click", () => emit("Pickup"));
document.getElementById("btn-explosion")?.addEventListener("click", () => emit("Explosion"));
document.getElementById("btn-rare")?.addEventListener("click", () => emit("Pickup", { kind: "rare" }));
document.getElementById("btn-duck")?.addEventListener("click", () => {
  if (!beginAudio() || !director) return;
  director.duck();
  setStatus(bgm?.isRunning() ? "BGMを下げました" : "ダックの量は動きます。BGMの再生中に聞けます");
});

if (evEl) {
  evEl.innerHTML = C.events.map((e) => `<option value="${e.id}">${e.id}</option>`).join("");
  evEl.value = C.events[0].id;
}

function burst(count) {
  const p = paramsFor(selectedId());
  for (let i = 0; i < count; i++) {
    playTone(p.freq, p.dur, p.gain, { burst: true, eventId: "Test" });
  }
  setStatus(`${count} 音を同時に鳴らしました`);
}

function stopMash() {
  if (mashTimer != null) clearInterval(mashTimer);
  mashTimer = null;
}

document.getElementById("btn-test-1")?.addEventListener("click", () => burst(1));
document.getElementById("btn-test-4")?.addEventListener("click", () => burst(4));
document.getElementById("btn-test-8")?.addEventListener("click", () => burst(8));
document.getElementById("btn-test-16")?.addEventListener("click", () => burst(16));
document.getElementById("btn-cmp-1")?.addEventListener("click", () => burst(1));
document.getElementById("btn-cmp-4")?.addEventListener("click", () => burst(4));
document.getElementById("btn-cmp-16")?.addEventListener("click", () => burst(16));
document.getElementById("btn-mash")?.addEventListener("click", () => {
  stopMash();
  let left = 24;
  mashTimer = setInterval(() => {
    const p = paramsFor(selectedId());
    playTone(p.freq, p.dur, p.gain, { eventId: "Mash" });
    left -= 1;
    if (left <= 0) stopMash();
  }, 40);
  setStatus("連打しています");
});
document.getElementById("btn-stop-voices")?.addEventListener("click", () => {
  stopMash();
  sfx?.stopAll();
  setStatus("効果音を止めました");
});

document.getElementById("btn-replay")?.addEventListener("click", () => {
  if (!lastTone) {
    setStatus("まだ鳴らした音がありません");
    return;
  }
  playTone(lastTone.freq, lastTone.dur, lastTone.gain, {
    wave: lastTone.wave,
    attack: lastTone.attack,
    release: lastTone.release,
    rate: lastTone.rate,
    eventId: "Replay",
  });
  setStatus("直前の音を再生");
});

function switchSong(seconds) {
  if (!beginAudio() || !bgm || !director) return;
  director.holdManual();
  const current = bgm.currentId();
  const next = current === "a" ? "b" : current === "b" ? "a" : bySel("bgm-song")?.value === "b" ? "a" : "b";
  const sel = bySel("bgm-song");
  if (sel) sel.value = next;
  bgm.crossfadeTo(next, seconds);
  setStatus(seconds <= 0.03 ? "短い時間で切り替えました" : `${seconds.toFixed(1)} 秒で交差しています`);
}

document.getElementById("btn-bgm-play")?.addEventListener("click", () => {
  if (!beginAudio() || !bgm || !director) return;
  director.holdManual();
  const song = bySel("bgm-song")?.value || "a";
  bgm.crossfadeTo(song, Math.max(0.05, num("bgm-xf", 1)));
  syncState();
  setStatus(`曲${song === "b" ? "B" : "A"}を再生`);
});
document.getElementById("btn-bgm-pause")?.addEventListener("click", () => {
  bgm?.pause();
  setStatus("一時停止");
});
document.getElementById("btn-bgm-resume")?.addEventListener("click", () => {
  if (!beginAudio()) return;
  bgm?.resume();
  setStatus("再開");
});
document.getElementById("btn-bgm-stop")?.addEventListener("click", () => {
  bgm?.stop();
  setStatus("停止");
});
document.getElementById("btn-xf-now")?.addEventListener("click", () => switchSong(0.02));
document.getElementById("btn-xf")?.addEventListener("click", () => switchSong(Math.max(0.02, num("bgm-xf", 1))));
document.getElementById("btn-fade-in")?.addEventListener("click", () => {
  if (!beginAudio() || !bgm || !director) return;
  director.holdManual();
  bgm.crossfadeTo(bySel("bgm-song")?.value || "a", Math.max(0.3, num("bgm-xf", 1)));
  setStatus("フェードイン");
});
document.getElementById("btn-fade-out")?.addEventListener("click", () => {
  bgm?.fadeOut(Math.max(0.3, num("bgm-xf", 1)));
  setStatus("フェードアウト");
});
document.getElementById("btn-bgm-scene")?.addEventListener("click", () => {
  if (!beginAudio() || !director) return;
  director.releaseManual();
  syncState();
  setStatus("場面の曲に戻しました");
});

const simCanvas = /** @type {HTMLCanvasElement} */ (document.getElementById("sim-canvas"));
const sim = createGameSim(simCanvas, emit, {
  health: () => num("dyn-health", 100),
  timeScale: () => num("dyn-scale", 1),
  focused: () => document.activeElement === simCanvas,
});

function bindHold(id, key) {
  const node = document.getElementById(id);
  if (!node) return;
  const down = (ev) => {
    ev.preventDefault();
    sim.hold(key, true);
  };
  const up = () => sim.hold(key, false);
  node.addEventListener("pointerdown", down);
  node.addEventListener("pointerup", up);
  node.addEventListener("pointerleave", up);
  node.addEventListener("pointercancel", up);
}
bindHold("btn-left", "left");
bindHold("btn-right", "right");
document.getElementById("btn-sim-jump")?.addEventListener("click", () => sim.pressJump());
document.getElementById("btn-scenario")?.addEventListener("click", () => {
  if (!beginAudio()) return;
  setHealth(100);
  setEnemies(0);
  sim.scenario();
  setStatus("自動の流れを開始");
});
document.getElementById("btn-sim-reset")?.addEventListener("click", () => {
  sim.reset();
  setStatus("位置を戻しました。体力と場面はそのままです");
});

simCanvas?.addEventListener("keydown", (ev) => {
  if (isFieldKeyTarget(ev) && ev.target !== simCanvas) return;
  if (ev.key === "ArrowLeft") {
    ev.preventDefault();
    sim.hold("left", true);
  } else if (ev.key === "ArrowRight") {
    ev.preventDefault();
    sim.hold("right", true);
  } else if (ev.key === "ArrowUp" || ev.key === " ") {
    ev.preventDefault();
    sim.hold("jump", true);
  }
});
simCanvas?.addEventListener("keyup", (ev) => {
  if (ev.key === "ArrowLeft") sim.hold("left", false);
  if (ev.key === "ArrowRight") sim.hold("right", false);
  if (ev.key === "ArrowUp" || ev.key === " ") {
    ev.preventDefault();
    sim.hold("jump", false);
  }
});

document.querySelectorAll(".sfx-tab").forEach((btn) => {
  btn.addEventListener("click", () => showTab(btn.getAttribute("data-tab") || "oneshot"));
});

function paintPath() {
  const el = document.getElementById("sfx-path");
  if (!el) return;
  const sfxOn = onBox("sfx-comp");
  const masterOn = onBox("mast-comp");
  el.dataset.comp = sfxOn ? "on" : "off";
  el.dataset.master = masterOn ? "on" : "off";
  el.textContent = `SFX は${sfxOn ? "コンプレッサー" : "バイパス"}、Master は${masterOn ? "コンプレッサー" : "バイパス"}。そのあと保護リミッタ。発音数の上限とは別です。`;
}

function paintVoices() {
  const countEl = document.getElementById("voice-count");
  const listEl = document.getElementById("voice-list");
  const policy = bySel("sfx-steal")?.value || "unlimited";
  const cap = policy === "unlimited" ? SAFETY_VOICE_CAP : Math.round(num("sfx-vmax", 16));
  const n = sfx ? sfx.studentCount() : 0;
  if (countEl) countEl.textContent = `発音 ${n} / ${cap}`;
  if (!listEl) return;
  const list = sfx ? sfx.list() : [];
  if (!list.length) {
    listEl.textContent = "発音中の音はありません";
    return;
  }
  listEl.innerHTML = list
    .map((v) => {
      const name = `${v.system ? "演出 " : ""}${v.eventId} ${v.wave} ${Math.round(v.freq)}Hz`;
      return `<span class="sfx-voice${v.system ? " is-system" : ""}">${name}</span>`;
    })
    .join("");
}

function paintBgm(info) {
  const posEl = document.getElementById("bgm-pos");
  const mixEl = document.getElementById("mix-readout");
  if (!bgm) {
    if (posEl) posEl.textContent = "停止";
    return;
  }
  const snap = bgm.snapshot();
  const head = document.querySelector("#bgm-head > span");
  if (head instanceof HTMLElement) {
    head.style.width = `${(snap.pos / LOOP_SECONDS) * 100}%`;
  }
  if (posEl) {
    const state = snap.running ? (snap.paused ? "一時停止" : "再生") : "停止";
    const edge = snap.pos < 0.05 || snap.pos > LOOP_SECONDS - 0.05 ? "  境界付近" : "";
    posEl.textContent = `${state}  位置 ${snap.pos.toFixed(2)} / ${LOOP_SECONDS.toFixed(2)} 秒${edge}`;
  }
  if (mixEl) {
    const g = snap.songGains;
    const pct = (v) => `${Math.round((v || 0) * 100)}%`;
    const layers = snap.layers || {};
    const layerText = Object.entries(layers)
      .map(([k, v]) => `${k} ${Math.round(Number(v) * 100)}%`)
      .join("  ");
    const hold = info?.manualHold ? "  場面の曲はいったん止めています。" : "";
    mixEl.textContent = `曲の交差  A ${pct(g.a)}  B ${pct(g.b)}  タイトル ${pct(g.title)}。同じ曲の層  ${layerText || "—"}${hold}`;
  }
}

function paintDynamic(info) {
  const hp = num("dyn-health", 100);
  const hz = Math.round(info?.lowpass ?? healthLowpassHz(hp));
  const beat = info?.heartbeat ?? heartbeatInterval(hp);
  const healthEl = document.getElementById("health-readout");
  if (healthEl) {
    const beatText = beat > 0 ? `心拍 ${beat.toFixed(2)} 秒ごと` : "心拍なし";
    healthEl.textContent = `体力 ${Math.round(hp)}。フィルタ ${hz} Hz。${beatText}。`;
  }
  const tensionEl = document.getElementById("tension-readout");
  if (tensionEl) {
    const shown = info ? info.smoothTension : num("dyn-tension", 0);
    tensionEl.textContent = onBox("layer-manual")
      ? "レイヤーは手で混ぜています。緊張スライダーは音量に使いません。"
      : `緊張 ${Math.round(shown)}%。レイヤーは滑らかに追います。`;
  }
  const duckEl = document.getElementById("duck-readout");
  if (duckEl) {
    const db = info ? Math.max(0, -info.duckDb) : 0;
    duckEl.textContent = `ダック ${db.toFixed(1)} dB`;
  }
  syncState();
}

function paintMeters() {
  if (!engine) return;
  if (!bgmBytes || bgmBytes.length !== engine.bgmAnalyser.fftSize) bgmBytes = new Uint8Array(engine.bgmAnalyser.fftSize);
  if (!sfxPreBytes || sfxPreBytes.length !== engine.sfxPre.fftSize) sfxPreBytes = new Uint8Array(engine.sfxPre.fftSize);
  if (!sfxPostBytes || sfxPostBytes.length !== engine.sfxPost.fftSize) sfxPostBytes = new Uint8Array(engine.sfxPost.fftSize);
  if (!masterBytes || masterBytes.length !== engine.masterAnalyser.fftSize) {
    masterBytes = new Uint8Array(engine.masterAnalyser.fftSize);
  }
  if (!scopeBytes || scopeBytes.length !== engine.masterAnalyser.fftSize) {
    scopeBytes = new Uint8Array(engine.masterAnalyser.fftSize);
  }
  const bgmLevel = readLevel(engine.bgmAnalyser, bgmBytes);
  const pre = readLevel(engine.sfxPre, sfxPreBytes);
  const post = readLevel(engine.sfxPost, sfxPostBytes);
  const master = readLevel(engine.masterAnalyser, masterBytes);
  paintMeter(document.getElementById("meter-bgm"), document.getElementById("meter-bgm-db"), bgmLevel);
  paintMeter(document.getElementById("meter-sfx"), document.getElementById("meter-sfx-db"), post);
  paintMeter(document.getElementById("meter-master"), document.getElementById("meter-master-db"), master);
  const levels = document.getElementById("mix-levels");
  if (levels) {
    levels.textContent = `SFX 処理前 ${pre.rmsDb.toFixed(1)} dBFS / 処理後 ${post.rmsDb.toFixed(1)} dBFS`;
  }
  const sfxGr = document.getElementById("gr-sfx");
  const masterGr = document.getElementById("gr-master");
  if (sfxGr) {
    sfxGr.textContent = onBox("sfx-comp")
      ? `SFX 圧縮 ${Math.abs(engine.sfxComp.reduction || 0).toFixed(1)} dB`
      : "SFX 圧縮: バイパス";
  }
  if (masterGr) {
    masterGr.textContent = onBox("mast-comp")
      ? `Master 圧縮 ${Math.abs(engine.masterComp.reduction || 0).toFixed(1)} dB`
      : "Master 圧縮: バイパス";
  }
  engine.masterAnalyser.getByteTimeDomainData(scopeBytes);
  if (scopeCtx && scopeCanvas) drawScope(scopeCtx, scopeCanvas, scopeBytes);
}

let lastFrame = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  let info = null;
  if (engine && bgm && director) {
    bgm.tick();
    info = director.update();
    paintMeters();
  }
  paintBgm(info);
  paintDynamic(info);
  paintVoices();
  paintPath();
  sim.tick(dt);
  requestAnimationFrame(frame);
}

const urlSpec = Object.fromEntries(
  Object.entries({
  ev: { el: evEl, kind: "select" },
  freq: { el: freqEl, kind: "range" },
  dur: { el: durEl, kind: "range" },
  gain: { el: gainEl, kind: "range" },
  tab: { el: bySel("sfx-tab"), kind: "select" },
  wave: { el: bySel("sfx-type"), kind: "select" },
  atk: { el: byId("sfx-atk"), kind: "range" },
  rel: { el: byId("sfx-rel"), kind: "range" },
  pit: { el: byId("sfx-pit"), kind: "range" },
  rate: { el: byId("sfx-rate"), kind: "range" },
  vmax: { el: byId("sfx-vmax"), kind: "range" },
  steal: { el: bySel("sfx-steal"), kind: "select" },
  cool: { el: byId("sfx-cool"), kind: "checkbox" },
  bgmvol: { el: byId("bgm-vol"), kind: "range" },
  sfxvol: { el: byId("sfx-vol"), kind: "range" },
  mastvol: { el: byId("mast-vol"), kind: "range" },
  loop: { el: byId("bgm-loop"), kind: "checkbox" },
  xf: { el: byId("bgm-xf"), kind: "range" },
  song: { el: bySel("bgm-song"), kind: "select" },
  comp: { el: byId("sfx-comp"), kind: "checkbox" },
  mcomp: { el: byId("mast-comp"), kind: "checkbox" },
  thr: { el: byId("comp-thr"), kind: "range" },
  ratio: { el: byId("comp-ratio"), kind: "range" },
  knee: { el: byId("comp-knee"), kind: "range" },
  catk: { el: byId("comp-atk"), kind: "range" },
  crel: { el: byId("comp-rel"), kind: "range" },
  health: { el: byId("dyn-health"), kind: "range" },
  tension: { el: byId("dyn-tension"), kind: "range" },
  enemies: { el: byId("dyn-enemies"), kind: "range" },
  gstate: { el: bySel("dyn-state"), kind: "select" },
  tscale: { el: byId("dyn-scale"), kind: "range" },
  bgmfollow: { el: byId("bgm-follow"), kind: "checkbox" },
  layers: { el: byId("layer-manual"), kind: "checkbox" },
  duck: { el: byId("duck-amt"), kind: "range" },
  ducka: { el: byId("duck-atk"), kind: "range" },
  duckh: { el: byId("duck-hold"), kind: "range" },
  duckr: { el: byId("duck-rel"), kind: "range" },
  }).filter(([, entry]) => entry.el)
);

/** @type {Map<string, { check?: boolean, value?: string }>} */
const factory = new Map();
for (const entry of Object.values(urlSpec)) {
  const node = entry.el;
  if (!node?.id || factory.has(node.id)) continue;
  if (entry.kind === "checkbox") factory.set(node.id, { check: /** @type {HTMLInputElement} */ (node).checked });
  else factory.set(node.id, { value: /** @type {HTMLInputElement} */ (node).value });
}

/**
 * @param {{ el: HTMLElement | null, kind: string }} entry
 * @param {string | number | boolean} value
 */
function writeControl(entry, value) {
  const node = entry.el;
  if (!node) return;
  if (entry.kind === "checkbox") {
    /** @type {HTMLInputElement} */ (node).checked = value === true || value === "1" || value === 1;
  } else {
    /** @type {HTMLInputElement} */ (node).value = String(value);
  }
  node.dispatchEvent(new Event("input", { bubbles: true }));
  node.dispatchEvent(new Event("change", { bubbles: true }));
}

function collectControls() {
  /** @type {Record<string, string | boolean>} */
  const controls = {};
  for (const [key, entry] of Object.entries(urlSpec)) {
    if (!entry.el) continue;
    if (entry.kind === "checkbox") controls[key] = /** @type {HTMLInputElement} */ (entry.el).checked;
    else controls[key] = /** @type {HTMLInputElement} */ (entry.el).value;
  }
  return controls;
}

function exportJson() {
  const text = JSON.stringify({ v: 1, topic: "sfx-events", controls: collectControls(), overrides }, null, 2);
  const area = /** @type {HTMLTextAreaElement | null} */ (document.getElementById("json-text"));
  if (area) area.value = text;
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sfx-events.json";
  a.click();
  URL.revokeObjectURL(url);
  setStatus("JSONを書き出しました");
}

function importJson(text) {
  const data = JSON.parse(text);
  if (!data || data.v !== 1 || data.topic !== "sfx-events") {
    setStatus("このページの JSON（v 1）ではありません");
    return;
  }
  if (data.overrides && typeof data.overrides === "object") {
    for (const key of Object.keys(overrides)) delete overrides[key];
    Object.assign(overrides, data.overrides);
  }
  urlApplying = true;
  for (const [key, value] of Object.entries(data.controls || {})) {
    const entry = urlSpec[key];
    if (entry) writeControl(entry, /** @type {string | number | boolean} */ (value));
  }
  urlApplying = false;
  slidersFromSelected();
  syncLayerManual();
  showTab(bySel("sfx-tab")?.value || "oneshot");
  if (director) director.applyState(bySel("dyn-state")?.value || "title", { fromUser: true });
  applyLive();
  drawNow();
  setStatus("JSONを読み込みました");
}

document.getElementById("btn-export")?.addEventListener("click", exportJson);
document.getElementById("btn-import")?.addEventListener("click", () => {
  const area = /** @type {HTMLTextAreaElement | null} */ (document.getElementById("json-text"));
  try {
    importJson(area?.value || "");
  } catch {
    setStatus("JSONを読めませんでした");
  }
});

document.getElementById("btn-reset")?.addEventListener("click", () => {
  stopMash();
  sfx?.stopAll();
  bgm?.stop();
  sim.reset();
  for (const key of Object.keys(overrides)) delete overrides[key];
  urlApplying = true;
  for (const [id, snap] of factory) {
    const node = document.getElementById(id);
    if (!node) continue;
    if ("check" in snap && snap.check != null) /** @type {HTMLInputElement} */ (node).checked = snap.check;
    else if (snap.value != null) /** @type {HTMLInputElement} */ (node).value = snap.value;
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
  }
  urlApplying = false;
  slidersFromSelected();
  director?.clearHold();
  syncLayerManual();
  showTab("oneshot");
  drawNow();
  setStatus("初期値に戻しました");
});

const presetEl = bySel("preset-pick");
if (presetEl) {
  presetEl.innerHTML = PRESET_LABELS.map(([id, label]) => `<option value="${id}">${label}</option>`).join("");
}
document.getElementById("btn-preset")?.addEventListener("click", () => {
  const name = presetEl?.value || "";
  const preset = AUDIO_PRESETS[name];
  if (!preset) return;
  beginAudio();
  for (const [key, value] of Object.entries(preset)) {
    const entry = urlSpec[key];
    if (entry) writeControl(entry, value);
  }
  showTab(bySel("sfx-tab")?.value || "oneshot");
  syncLayerManual();
  if (director && typeof preset.gstate === "string") {
    director.applyState(preset.gstate, { fromUser: true });
  }
  applyLive();
  drawNow();
  setStatus("比較の値を入れました");
});

document.body.addEventListener("input", onControl);
document.body.addEventListener("change", onControl);

/**
 * @param {Event} ev
 */
function onControl(ev) {
  const t = /** @type {HTMLElement} */ (ev.target);
  if (!t?.id) return;
  syncOne(t.id);
  if (t.id === "sfx-ev" && ev.type === "change") {
    slidersFromSelected();
    drawNow();
  }
  if ((t.id === "sfx-freq" || t.id === "sfx-dur" || t.id === "sfx-gain") && !urlApplying) {
    slidersToOverride();
    drawNow();
  }
  if (t.id === "sfx-type" || t.id === "sfx-atk" || t.id === "sfx-rel") drawNow();
  if (t.id === "sfx-tab" && ev.type === "change") showTab(/** @type {HTMLSelectElement} */ (t).value);
  if (t.id === "layer-manual") syncLayerManual();
  if (t.id === "dyn-state" && ev.type === "change") {
    syncState();
    if (!urlApplying) {
      beginAudio();
      director?.applyState(/** @type {HTMLSelectElement} */ (t).value, { fromUser: true });
    }
  }
  if (t.id.startsWith("layer-") && t.id !== "layer-manual") applyLayers();
  paintPath();
  if (!urlApplying && engine) applyLive();
}

loadTextSample("../samples/SfxEventsExample.cs", csharpSample, "// SfxEventsExample.cs");

slidersFromSelected();
drawNow();
drawIdleScope();
syncLayerManual();
paintPath();
sim.draw();

const factoryBeforeUrl = new Map(factory);
mountShareLink({
  spec: urlSpec,
  button: document.getElementById("btn-copy-url"),
  statusEl: document.getElementById("status"),
});
urlApplying = true;
const urlResult = applyParamsToControls(urlSpec);
urlApplying = false;
slidersToOverride();
for (const [id, snap] of factoryBeforeUrl) factory.set(id, snap);
showTab(bySel("sfx-tab")?.value || "oneshot");
syncLayerManual();
drawNow();
for (const entry of Object.values(urlSpec)) {
  if (entry.el?.id) syncOne(entry.el.id);
}
if (urlResult.warning) setStatus(urlResult.warning);
else setStatus("イベントボタンで Emit → SFX 購読者がトーン再生");
pushLog("SfxService が Jump/Land/Hit/… を On");
mountTopicTask("sfx-events");
requestAnimationFrame(frame);
