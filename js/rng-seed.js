/**
 * 乱数とシード — mulberry32 の再現性デモ
 * @see docs/topics/rng-seed/SPEC.md
 */

import { RNG_SEED_CONFIG as C } from "./maps/rng-seed-config.js";
import {
  createStatus,
  createResultPanel,
  loadTextSample,
  mulberry32,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("rng-canvas")
);
const ctx = canvas.getContext("2d");
const listEl = document.getElementById("rng-list");
const seedEl = /** @type {HTMLInputElement} */ (document.getElementById("seed"));
const countEl = /** @type {HTMLInputElement} */ (document.getElementById("count"));
const countVal = document.getElementById("count-val");
const btnGen = document.getElementById("btn-gen");
const btnRegen = document.getElementById("btn-regen");
const btnSeedPlus = document.getElementById("btn-seed-plus");
const btnSeedRand = document.getElementById("btn-seed-rand");
const csharpSample = document.getElementById("csharp-sample");

const setStatus = createStatus(document.getElementById("status"));
const resultPanel = createResultPanel(
  document.getElementById("result-compare")
);

/** @type {number[]} */
let samples = [];
/** @type {number | null} */
let lastSeed = null;
/** @type {number[] | null} */
let previousSamples = null;

function readSeed() {
  let s = Math.floor(Number(seedEl?.value) || C.defaultSeed);
  if (s <= 0) s = 1;
  if (s > 0xffffffff) s = s >>> 0 || 1;
  return s >>> 0 || 1;
}

function readN() {
  return Math.min(
    C.maxN,
    Math.max(C.minN, Math.floor(Number(countEl?.value) || C.defaultN))
  );
}

function syncLabels() {
  if (countVal) countVal.textContent = String(readN());
}

/**
 * @param {number} seed
 * @param {number} n
 * @returns {number[]}
 */
function generate(seed, n) {
  const rng = mulberry32(seed);
  const xs = [];
  for (let i = 0; i < n; i++) xs.push(rng());
  return xs;
}

/**
 * @param {number[]} a
 * @param {number[]} b
 */
function arraysEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * @param {'fresh' | 'regen' | 'newseed'} reason
 */
function runGenerate(reason) {
  const seed = readSeed();
  const n = readN();
  previousSamples = samples.length ? samples.slice() : previousSamples;
  samples = generate(seed, n);

  let matchMsg = "";
  if (reason === "regen" && previousSamples) {
    const ok = arraysEqual(samples, previousSamples);
    matchMsg = ok
      ? "同じシード → 系列が完全一致（再現性 OK）"
      : "不一致（想定外）";
    resultPanel.show(`
      <p class="result-verdict">${ok ? "再現成功" : "再現失敗"}</p>
      <p class="result-note">
        シード ${seed} で ${n} 個を再生成。
        ${ok ? "前回とビット一致レベルで同じ列です。" : "内部状態の持ち越しがないか確認してください。"}
      </p>
    `);
  } else if (reason === "newseed" && previousSamples) {
    const same = arraysEqual(samples, previousSamples);
    resultPanel.show(`
      <p class="result-verdict">${same ? "系列が同じ（稀）" : "別系列"}</p>
      <p class="result-note">
        シードを変えると通常は別の乱数列になります。
        ${same ? "" : "これが「シードで世界が変わる」感覚です。"}
      </p>
    `);
  } else {
    resultPanel.hide();
  }

  lastSeed = seed;
  draw();
  renderList();
  setStatus(
    `seed=${seed} N=${n}` +
      (matchMsg ? ` — ${matchMsg}` : " — 生成完了")
  );
}

function draw() {
  if (!ctx || !canvas || !samples.length) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  // histogram [0,1) → bins
  const bins = C.histBins;
  const counts = Array(bins).fill(0);
  for (const x of samples) {
    let b = Math.floor(x * bins);
    if (b >= bins) b = bins - 1;
    if (b < 0) b = 0;
    counts[b] += 1;
  }
  const maxC = Math.max(1, ...counts);
  const padL = 36;
  const padB = 28;
  const padT = 16;
  const padR = 12;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const barW = plotW / bins;

  ctx.fillStyle = "#9aabbf";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`ヒストグラム（${bins} bins, N=${samples.length}） seed=${lastSeed}`, 8, 14);

  for (let i = 0; i < bins; i++) {
    const h = (counts[i] / maxC) * plotH;
    const x = padL + i * barW;
    const y = padT + plotH - h;
    ctx.fillStyle = "#5b9fd4";
    ctx.fillRect(x + 2, y, barW - 4, h);
    ctx.fillStyle = "#9aabbf";
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText(String(counts[i]), x + barW / 2, y - 3);
    ctx.fillText(
      (i / bins).toFixed(1),
      x + barW / 2,
      H - 8
    );
  }
}

function renderList() {
  if (!listEl || !samples.length) return;
  const dice = samples.map((x) => 1 + Math.floor(x * 6));
  const nums = samples
    .map((x, i) => `<span class="rng-chip" title="u=${x}">${x.toFixed(4)}</span>`)
    .join("");
  const diceHtml = dice
    .map((d) => `<span class="rng-die">${d}</span>`)
    .join("");
  listEl.innerHTML = `
    <div class="rng-block">
      <div class="rng-block-title">[0,1) 一様乱数</div>
      <div class="rng-chips">${nums}</div>
    </div>
    <div class="rng-block">
      <div class="rng-block-title">1〜6 ダイス（floor(u×6)+1）</div>
      <div class="rng-dice">${diceHtml}</div>
    </div>`;
}

btnGen?.addEventListener("click", () => runGenerate("fresh"));
btnRegen?.addEventListener("click", () => {
  // force same seed, capture previous after generate sets previous from current
  runGenerate("regen");
});
btnSeedPlus?.addEventListener("click", () => {
  const s = readSeed();
  seedEl.value = String((s + 1) >>> 0 || 1);
  runGenerate("newseed");
});
btnSeedRand?.addEventListener("click", () => {
  // use crypto or Date for UI seed pick only
  const s = (Math.floor(Math.random() * 0xfffffffe) + 1) >>> 0;
  seedEl.value = String(s);
  runGenerate("newseed");
});
countEl?.addEventListener("input", () => {
  syncLabels();
});
seedEl?.addEventListener("change", () => {
  // don't auto-gen on every keystroke
});

loadTextSample(
  "../samples/RngSeedExample.cs",
  csharpSample,
  "// samples/RngSeedExample.cs を読み込めませんでした。"
);

// init
if (seedEl) seedEl.value = String(C.defaultSeed);
if (countEl) countEl.value = String(C.defaultN);
syncLabels();
runGenerate("fresh");
setStatus(`seed=${readSeed()} — 「同じシードで再生成」で再現性を確認`);
