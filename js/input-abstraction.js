/**
 * 入力抽象化 — アクションマップ
 */
import { INPUT_ABSTRACTION_CONFIG as C } from "./maps/input-abstraction-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("ia-canvas")
);
const ctx = canvas.getContext("2d");
const presetEl = /** @type {HTMLSelectElement} */ (
  document.getElementById("preset")
);
const bindEl = document.getElementById("ia-binds");
const actionEl = document.getElementById("ia-actions");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** @type {Set<string>} */
const raw = new Set();
/** @type {Record<string, string[]>} */
let map = { ...C.presets.default };
let px = 300;

function applyPreset(name) {
  const p = C.presets[name] || C.presets.default;
  map = Object.fromEntries(
    Object.entries(p).map(([k, v]) => [k, [...v]])
  );
  renderBinds();
  setStatus(`プリセット: ${name}`);
}

export function isActionDown(action, keySet, actionMap) {
  const keys = actionMap[action] || [];
  return keys.some((k) => keySet.has(k));
}

function renderBinds() {
  if (!bindEl) return;
  bindEl.innerHTML = C.actions
    .map((a) => {
      const keys = (map[a] || []).join(", ");
      return `<tr><td><code>${a}</code></td><td>${keys}</td></tr>`;
    })
    .join("");
}

function renderActions() {
  if (!actionEl) return;
  actionEl.innerHTML = C.actions
    .map((a) => {
      const on = isActionDown(a, raw, map);
      return `<div class="es-log ${on ? "es-log-emit" : ""}">${a}: ${on ? "ON" : "off"}</div>`;
    })
    .join("");
}

function step() {
  let dx = 0;
  if (isActionDown("MoveLeft", raw, map)) dx -= 1;
  if (isActionDown("MoveRight", raw, map)) dx += 1;
  px += dx * 4;
  if (px < 40) px = 40;
  if (px > canvas.width - 40) px = canvas.width - 40;
  draw();
  renderActions();
  requestAnimationFrame(step);
}

function draw() {
  if (!ctx) return;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#3d4f66";
  ctx.fillRect(0, 160, canvas.width, 20);
  const fire = isActionDown("Fire", raw, map);
  const jump = isActionDown("Jump", raw, map);
  ctx.fillStyle = fire ? "#e07a5f" : "#5b9fd4";
  ctx.fillRect(px - 14, jump ? 100 : 130, 28, 28);
  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("論理アクションだけ見て動く — キー対応は表で差し替え", 12, 18);
}

window.addEventListener("keydown", (e) => {
  raw.add(e.code);
  e.preventDefault();
});
window.addEventListener("keyup", (e) => raw.delete(e.code));

presetEl?.addEventListener("change", () => applyPreset(presetEl.value));

loadTextSample(
  "../samples/InputAbstractionExample.cs",
  csharpSample,
  "// InputAbstractionExample.cs"
);

if (presetEl) {
  presetEl.innerHTML = Object.keys(C.presets)
    .map((k) => `<option value="${k}">${k}</option>`)
    .join("");
}
applyPreset("default");
step();
