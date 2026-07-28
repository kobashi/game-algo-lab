/**
 * 重み付き抽選・Fisher–Yates
 * @see docs/topics/weighted-random/SPEC.md
 */
import { WEIGHTED_RANDOM_CONFIG as C } from "./maps/weighted-random-config.js";
import {
  createStatus,
  createResultPanel,
  loadTextSample,
  mulberry32,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("wr-canvas")
);
const ctx = canvas.getContext("2d");
const seedEl = /** @type {HTMLInputElement} */ (document.getElementById("seed"));
const drawsEl = /** @type {HTMLInputElement} */ (document.getElementById("draws"));
const drawsVal = document.getElementById("draws-val");
const weightsEl = document.getElementById("weight-inputs");
const tableEl = document.getElementById("wr-table");
const btnRun = document.getElementById("btn-run");
const btnShuffle = document.getElementById("btn-shuffle");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));
const resultPanel = createResultPanel(document.getElementById("result-compare"));

/** @type {{ id: string, label: string, weight: number, color: string }[]} */
let items = C.defaultItems.map((x) => ({ ...x }));
/** @type {number[]} */
let counts = items.map(() => 0);
let lastMode = "weighted";

function readSeed() {
  let s = Math.floor(Number(seedEl?.value) || C.defaultSeed);
  return (s >>> 0) || 1;
}
function readDraws() {
  return Math.min(
    C.maxDraws,
    Math.max(C.minDraws, Math.floor(Number(drawsEl?.value) || C.defaultDraws))
  );
}

/**
 * @param {number[]} weights
 * @param {() => number} rng
 */
export function pickWeightedIndex(weights, rng) {
  let sum = 0;
  for (const w of weights) sum += Math.max(0, w);
  if (sum <= 0) return 0;
  let r = rng() * sum;
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += Math.max(0, weights[i]);
    if (r < acc) return i;
  }
  return weights.length - 1;
}

/**
 * @template T
 * @param {T[]} arr
 * @param {() => number} rng
 */
export function fisherYates(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderWeightInputs() {
  if (!weightsEl) return;
  weightsEl.innerHTML = items
    .map(
      (it, i) => `
    <label class="wr-weight-row">
      <span class="wr-swatch" style="background:${it.color}"></span>
      <span class="wr-label">${it.label}</span>
      <input type="number" class="mc-num wr-w" data-i="${i}" min="0" max="999" step="1" value="${it.weight}" />
    </label>`
    )
    .join("");
  weightsEl.querySelectorAll(".wr-w").forEach((inp) => {
    inp.addEventListener("change", () => {
      const i = Number(/** @type {HTMLElement} */ (inp).dataset.i);
      items[i].weight = Math.max(0, Number(/** @type {HTMLInputElement} */ (inp).value) || 0);
    });
  });
}

function syncLabels() {
  if (drawsVal) drawsVal.textContent = String(readDraws());
}

function runWeighted() {
  const n = readDraws();
  const rng = mulberry32(readSeed());
  const w = items.map((it) => it.weight);
  counts = items.map(() => 0);
  for (let k = 0; k < n; k++) {
    const i = pickWeightedIndex(w, rng);
    counts[i] += 1;
  }
  lastMode = "weighted";
  const sumW = w.reduce((a, b) => a + Math.max(0, b), 0) || 1;
  draw();
  renderTable(sumW, n);
  setStatus(`重み付き抽選 ×${n} · seed=${readSeed()}`);
  resultPanel.show(`
    <p class="result-verdict">累積重み法で ${n} 回抽選</p>
    <p class="result-note">理論確率 = 重み / 合計。回数を増やすと棒が理論比に近づきます。</p>
  `);
}

function runShuffleDemo() {
  const rng = mulberry32(readSeed());
  const deck = items.map((it) => it.label);
  const shuffled = fisherYates(deck, rng);
  lastMode = "shuffle";
  counts = items.map(() => 0);
  draw();
  if (tableEl) {
    tableEl.innerHTML = `<p class="coord-side-note">Fisher–Yates 結果（各要素ちょうど1回）:</p>
      <p class="wr-shuffle-out">${shuffled.map((s) => `<span class="rng-chip">${s}</span>`).join("")}</p>
      <p class="coord-side-note">重み付き抽選は「置換あり・偏りあり」。シャッフルは「各要素1回の順列」。</p>`;
  }
  setStatus(`Fisher–Yates · seed=${readSeed()}`);
  resultPanel.show(`
    <p class="result-verdict">シャッフル完了</p>
    <p class="result-note">同じシードなら同じ順列。ドロップ抽選には通常「重み付き」を使います。</p>
  `);
}

function renderTable(sumW, n) {
  if (!tableEl) return;
  const rows = items
    .map((it, i) => {
      const theo = (Math.max(0, it.weight) / sumW) * 100;
      const emp = n ? (counts[i] / n) * 100 : 0;
      return `<tr>
        <td><span class="wr-swatch" style="background:${it.color}"></span> ${it.label}</td>
        <td>${it.weight}</td>
        <td>${theo.toFixed(1)}%</td>
        <td>${counts[i]}</td>
        <td>${emp.toFixed(1)}%</td>
        <td>${(emp - theo).toFixed(1)}</td>
      </tr>`;
    })
    .join("");
  tableEl.innerHTML = `<table class="coord-table">
    <thead><tr><th>項目</th><th>重み</th><th>理論%</th><th>回数</th><th>実測%</th><th>差</th></tr></thead>
    <tbody>${rows}</tbody></table>`;
}

function draw() {
  if (!ctx || !canvas) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);
  if (lastMode === "shuffle") {
    ctx.fillStyle = "#9aabbf";
    ctx.font = "14px sans-serif";
    ctx.fillText("Fisher–Yates — 表側の順序を参照", 16, 28);
    return;
  }
  const n = counts.reduce((a, b) => a + b, 0) || 1;
  const sumW = items.reduce((a, it) => a + Math.max(0, it.weight), 0) || 1;
  const barMaxH = H - 50;
  const slot = W / items.length;
  items.forEach((it, i) => {
    const emp = counts[i] / n;
    const theo = Math.max(0, it.weight) / sumW;
    const x = i * slot + slot * 0.15;
    const bw = slot * 0.3;
    const hEmp = emp * barMaxH;
    const hTheo = theo * barMaxH;
    ctx.fillStyle = it.color;
    ctx.fillRect(x, H - 30 - hEmp, bw, hEmp);
    ctx.strokeStyle = "#e8eef6";
    ctx.strokeRect(x + bw + 4, H - 30 - hTheo, bw, hTheo);
    ctx.fillStyle = "#9aabbf";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(it.label, i * slot + slot / 2, H - 12);
  });
  ctx.fillStyle = "#9aabbf";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("塗り=実測 / 枠=理論", 12, 18);
}

btnRun?.addEventListener("click", runWeighted);
btnShuffle?.addEventListener("click", runShuffleDemo);
drawsEl?.addEventListener("input", syncLabels);

loadTextSample(
  "../samples/WeightedRandomExample.cs",
  csharpSample,
  "// samples/WeightedRandomExample.cs を読み込めませんでした。"
);
if (seedEl) seedEl.value = String(C.defaultSeed);
if (drawsEl) drawsEl.value = String(C.defaultDraws);
syncLabels();
renderWeightInputs();
runWeighted();
