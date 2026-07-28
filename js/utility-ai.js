/**
 * 効用 AI — 行動スコア最大選択
 */
import { UTILITY_AI_CONFIG as C } from "./maps/utility-ai-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const hungerEl = /** @type {HTMLInputElement} */ (
  document.getElementById("hunger")
);
const threatEl = /** @type {HTMLInputElement} */ (
  document.getElementById("threat")
);
const energyEl = /** @type {HTMLInputElement} */ (
  document.getElementById("energy")
);
const hungerVal = document.getElementById("hunger-val");
const threatVal = document.getElementById("threat-val");
const energyVal = document.getElementById("energy-val");
const barsEl = document.getElementById("util-bars");
const choiceEl = document.getElementById("util-choice");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/**
 * @param {number} hunger 0..1
 * @param {number} threat 0..1
 * @param {number} energy 0..1
 * @returns {{ id: string, label: string, score: number }[]}
 */
export function scoreActions(hunger, threat, energy) {
  return C.actions.map((a) => ({
    id: a.id,
    label: a.label,
    score: Math.max(0, a.score(hunger, threat, energy)),
  }));
}

/**
 * @param {{ score: number, id: string }[]} scores
 */
export function pickBest(scores) {
  let best = scores[0];
  for (const s of scores) {
    if (s.score > best.score) best = s;
  }
  return best;
}

function readH() {
  return Number(hungerEl?.value) || 0;
}
function readT() {
  return Number(threatEl?.value) || 0;
}
function readE() {
  return Number(energyEl?.value) || 0;
}

function sync() {
  if (hungerVal) hungerVal.textContent = readH().toFixed(2);
  if (threatVal) threatVal.textContent = readT().toFixed(2);
  if (energyVal) energyVal.textContent = readE().toFixed(2);
  render();
}

function render() {
  const scores = scoreActions(readH(), readT(), readE());
  const best = pickBest(scores);
  const max = Math.max(...scores.map((s) => s.score), 0.001);
  if (barsEl) {
    barsEl.innerHTML = scores
      .map((s) => {
        const pct = (s.score / max) * 100;
        const col = s.id === best.id ? "#6bcb8f" : "#5b9fd4";
        return `<div class="pf-row"><span>${s.label}</span>
          <div class="pf-bar"><i style="width:${pct}%;background:${col}"></i></div>
          <span class="pf-ms">${s.score.toFixed(2)}</span></div>`;
      })
      .join("");
  }
  if (choiceEl) {
    choiceEl.innerHTML = `<p class="result-verdict">選択: <strong>${best.label}</strong>（${best.id}） score=${best.score.toFixed(2)}</p>
      <p class="result-note">緑バー = 最大効用。スライダーを動かすと選択が変わる。</p>`;
  }
  setStatus(`best=${best.id} · h=${readH().toFixed(2)} t=${readT().toFixed(2)} e=${readE().toFixed(2)}`);
}

for (const el of [hungerEl, threatEl, energyEl]) {
  el?.addEventListener("input", sync);
}

loadTextSample(
  "../samples/UtilityAiExample.cs",
  csharpSample,
  "// UtilityAiExample.cs"
);
if (hungerEl) hungerEl.value = "0.55";
if (threatEl) threatEl.value = "0.25";
if (energyEl) energyEl.value = "0.6";
sync();
