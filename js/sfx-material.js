/**
 * 材質別・衝突強度と SE
 */
import { SFX_MATERIAL_CONFIG as C } from "./maps/sfx-material-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const matAEl = /** @type {HTMLSelectElement} */ (
  document.getElementById("mat-a")
);
const matBEl = /** @type {HTMLSelectElement} */ (
  document.getElementById("mat-b")
);
const forceEl = /** @type {HTMLInputElement} */ (
  document.getElementById("force")
);
const forceVal = document.getElementById("force-val");
const logEl = document.getElementById("mat-log");
const previewEl = document.getElementById("mat-preview");
const muteEl = /** @type {HTMLInputElement} */ (
  document.getElementById("mute")
);
const btnHit = document.getElementById("btn-hit");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** @type {AudioContext | null} */
let ac = null;
/** @type {string[]} */
let logs = [];

/**
 * Combine two materials + impact force → tone params.
 * @param {string} a
 * @param {string} b
 * @param {number} force 0..1
 */
export function impactParams(a, b, force) {
  const ma = C.materials[a] || C.materials.wood;
  const mb = C.materials[b] || C.materials.stone;
  const f = Math.max(0.05, Math.min(1, force));
  // geometric mean of base freqs, brighter when different materials
  const base = Math.sqrt(ma.baseFreq * mb.baseFreq);
  const spread = Math.abs(ma.baseFreq - mb.baseFreq) / 1000;
  const freq = base * (0.85 + f * 0.5 + spread * 0.15);
  const vol = C.baseGain * (0.35 + f * 0.9);
  const dur = C.defaultDur * (0.7 + f * 0.8);
  return {
    freq,
    vol,
    dur,
    label: `${ma.label}×${mb.label}`,
    force: f,
  };
}

function fillSelects() {
  const opts = Object.entries(C.materials)
    .map(([id, m]) => `<option value="${id}">${m.label}</option>`)
    .join("");
  if (matAEl) matAEl.innerHTML = opts;
  if (matBEl) matBEl.innerHTML = opts;
  if (matAEl) matAEl.value = "wood";
  if (matBEl) matBEl.value = "metal";
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

function renderPreview(p) {
  if (!previewEl) return;
  const a = C.materials[matAEl?.value || "wood"];
  const b = C.materials[matBEl?.value || "metal"];
  previewEl.innerHTML = `
    <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.5rem">
      <span class="voice-chip" style="border-color:${a.color};background:${a.color}33">${a.label}</span>
      <span>×</span>
      <span class="voice-chip" style="border-color:${b.color};background:${b.color}33">${b.label}</span>
      <span class="footer-muted">強度 ${(p.force * 100).toFixed(0)}%</span>
    </div>
    <table class="coord-table">
      <tr><td>周波数</td><td>${p.freq.toFixed(0)} Hz</td></tr>
      <tr><td>音量</td><td>${p.vol.toFixed(3)}</td></tr>
      <tr><td>長さ</td><td>${p.dur.toFixed(2)} s</td></tr>
    </table>`;
}

function ensureAc() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ac = new AC();
  }
  if (ac?.state === "suspended") ac.resume();
  return ac;
}

function hit() {
  const force = Number(forceEl?.value) || 0.5;
  const p = impactParams(matAEl?.value || "wood", matBEl?.value || "metal", force);
  renderPreview(p);
  pushLog(`${p.label} f=${p.freq.toFixed(0)}Hz vol=${p.vol.toFixed(3)}`);
  setStatus(`${p.label} · ${p.freq.toFixed(0)}Hz`);

  if (muteEl?.checked) return;
  const ctx = ensureAc();
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "triangle";
  o.frequency.value = p.freq;
  g.gain.value = p.vol;
  o.connect(g);
  g.connect(ctx.destination);
  const t0 = ctx.currentTime;
  g.gain.setValueAtTime(Math.max(0.0001, p.vol), t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + p.dur);
  o.start(t0);
  o.stop(t0 + p.dur + 0.02);
}

function sync() {
  if (forceVal) forceVal.textContent = Number(forceEl?.value || 0).toFixed(2);
  const p = impactParams(
    matAEl?.value || "wood",
    matBEl?.value || "metal",
    Number(forceEl?.value) || 0.5
  );
  renderPreview(p);
}

btnHit?.addEventListener("click", hit);
for (const el of [matAEl, matBEl, forceEl]) {
  el?.addEventListener("input", sync);
}

loadTextSample(
  "../samples/SfxMaterialExample.cs",
  csharpSample,
  "// SfxMaterialExample.cs"
);
fillSelects();
sync();
setStatus("材質を選んで衝突");
