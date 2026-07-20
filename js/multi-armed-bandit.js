/**
 * 多腕バンディットデモ
 * 共通基盤: js/platform/*
 */

import {
  BANDIT_CONFIG,
  getPresetArms,
  bestMean,
  bestArmIndex,
} from "./maps/bandit-config.js";
import { setPanel, renderSet } from "./ds-viz.js";
import {
  createStatus,
  createResultPanel,
  loadTextSample,
  mulberry32,
  randomIndex,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const boardEl = document.getElementById("bandit-board");
const dsPanels = document.getElementById("ds-panels");
const btnPlay = document.getElementById("btn-play");
const btnStep = document.getElementById("btn-step");
const btnReset = document.getElementById("btn-reset");
const speedEl = document.getElementById("speed");
const seedEl = document.getElementById("seed");
const targetEl = document.getElementById("target-n");
const epsilonEl = document.getElementById("epsilon");
const policyEl = document.getElementById("policy");
const presetEl = document.getElementById("preset");
const showTrueEl = document.getElementById("show-true");
const csharpSample = document.getElementById("csharp-sample");

const setStatus = createStatus(document.getElementById("status"));
const resultPanel = createResultPanel(document.getElementById("result-compare"));

/** @type {{ id: string, label: string, mean: number }[]} */
let arms = [];
/** @type {number[]} */
let pulls = [];
/** @type {number[]} 報酬合計 */
let rewardSum = [];
/** @type {number[]} 経験平均 */
let meanEst = [];

let totalPulls = 0;
let cumulativeRegret = 0;
/** @type {number[]} 直近の報酬 */
let recent = [];
let lastArm = -1;
let lastReward = null;
let lastMode = ""; // explore | exploit | ucb | init

let running = false;
let finished = false;
let timerId = null;
/** @type {() => number} */
let rng = Math.random;

const RECENT_MAX = 16;



function targetN() {
  return Math.max(1, Number(targetEl?.value) || BANDIT_CONFIG.defaultSteps);
}

function epsilon() {
  const e = Number(epsilonEl?.value);
  if (Number.isNaN(e)) return BANDIT_CONFIG.defaultEpsilon;
  return Math.min(1, Math.max(0, e));
}

function policy() {
  return policyEl?.value === "ucb1" ? "ucb1" : "eps";
}

function presetId() {
  return presetEl?.value === "hard" ? "hard" : "easy";
}

function showTrue() {
  return !!showTrueEl?.checked;
}

function muStar() {
  return bestMean(arms);
}

function optIndex() {
  return bestArmIndex(arms);
}

function resetState() {
  stopAuto();
  finished = false;
  arms = getPresetArms(presetId()).map((a) => ({ ...a }));
  const k = arms.length;
  pulls = Array(k).fill(0);
  rewardSum = Array(k).fill(0);
  meanEst = Array(k).fill(0);
  totalPulls = 0;
  cumulativeRegret = 0;
  recent = [];
  lastArm = -1;
  lastReward = null;
  lastMode = "";

  const seed = Number(seedEl?.value) || BANDIT_CONFIG.defaultSeed;
  rng = mulberry32(seed);

  if (epsilonEl && !epsilonEl.dataset.touched) {
    epsilonEl.value = String(BANDIT_CONFIG.defaultEpsilon);
  }
  if (targetEl && !targetEl.dataset.touched) {
    targetEl.value = String(BANDIT_CONFIG.defaultSteps);
  }

  resultPanel.hide();
  setStatus(
    `準備完了 — 難易度 ${presetId() === "hard" ? "難しい" : "易しい"}、${k} 本の腕、方策 ${policy() === "ucb1" ? "UCB1" : "ε-greedy"}、目標 ${targetN()} 回`
  );
  draw();
  updateDs();
}

function sampleBernoulli(p) {
  return rng() < p ? 1 : 0;
}

function selectArm() {
  const k = arms.length;
  if (policy() === "ucb1") {
    for (let i = 0; i < k; i++) {
      if (pulls[i] === 0) {
        lastMode = "init";
        return i;
      }
    }
    const t = Math.max(1, totalPulls);
    let best = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < k; i++) {
      const bonus = Math.sqrt((2 * Math.log(t)) / pulls[i]);
      const score = meanEst[i] + bonus;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    lastMode = "ucb";
    return best;
  }

  // ε-greedy
  if (rng() < epsilon()) {
    lastMode = "explore";
    return randomIndex(rng, k);
  }
  lastMode = "exploit";
  // 未引き優先
  for (let i = 0; i < k; i++) {
    if (pulls[i] === 0) return i;
  }
  let best = 0;
  for (let i = 1; i < k; i++) {
    if (meanEst[i] > meanEst[best]) best = i;
  }
  return best;
}

function ucbValue(i) {
  if (pulls[i] === 0) return Infinity;
  const t = Math.max(1, totalPulls);
  return meanEst[i] + Math.sqrt((2 * Math.log(t)) / pulls[i]);
}

function modeLabel() {
  if (lastMode === "explore") return "探索 (ε)";
  if (lastMode === "exploit") return "活用";
  if (lastMode === "ucb") return "UCB 最大";
  if (lastMode === "init") return "未引腕を優先";
  return "—";
}

function stepOnce() {
  if (finished) return false;

  const i = selectArm();
  const r = sampleBernoulli(arms[i].mean);
  pulls[i] += 1;
  rewardSum[i] += r;
  meanEst[i] = rewardSum[i] / pulls[i];
  totalPulls += 1;
  cumulativeRegret += muStar() - arms[i].mean;
  lastArm = i;
  lastReward = r;
  recent.push(r);
  if (recent.length > RECENT_MAX) recent.shift();

  setStatus(
    `#${totalPulls}: ${arms[i].label} を引く → 報酬 ${r}（${modeLabel()}）` +
      ` / 推定 ${meanEst[i].toFixed(2)} / 累積リグレット ${cumulativeRegret.toFixed(2)}`
  );

  draw();
  updateDs();

  if (totalPulls >= targetN()) {
    finishRun();
    return false;
  }
  return true;
}

function finishRun() {
  finished = true;
  stopAuto();
  const bi = optIndex();
  const bestPulls = pulls[bi];
  const totalReward = rewardSum.reduce((a, b) => a + b, 0);
  resultPanel.show(`
    <h3>結果（多腕バンディット）</h3>
    <ul>
      <li><strong>試行</strong>: ${totalPulls}</li>
      <li><strong>方策</strong>: ${policy() === "ucb1" ? "UCB1" : `ε-greedy (ε=${epsilon()})`}</li>
      <li><strong>累積リグレット</strong>: ${cumulativeRegret.toFixed(2)}（期待: 毎回 μ*−μ_a を加算）</li>
      <li><strong>総報酬</strong>: ${totalReward}</li>
      <li><strong>最適腕 ${arms[bi].label}</strong> (μ=${arms[bi].mean}): ${bestPulls} 回 (${((100 * bestPulls) / totalPulls).toFixed(0)}%)</li>
    </ul>
    <p class="result-verdict">
      活用ばかりだと悪い腕に固定されやすく、探索ばかりだと最適腕を引き損ねます。
      UCB は「自信がない腕」にボーナスを付けてバランスを取ります。
    </p>
    <p class="result-note">
      ゲーム木の MCTS では、各子節点が「腕」に対応し、プレイアウト報酬で同じ選択問題が現れます。
      設定: <code>js/maps/bandit-config.js</code>
    </p>
  `);
  setStatus(
    `完了 — リグレット ${cumulativeRegret.toFixed(2)}、最適腕シェア ${((100 * bestPulls) / totalPulls).toFixed(0)}%`
  );
}

function draw() {
  if (!boardEl) return;
  const reveal = showTrue();
  const maxPull = Math.max(1, ...pulls);
  const rows = arms
    .map((arm, i) => {
      const emp = pulls[i] ? meanEst[i] : 0;
      const empPct = Math.round(emp * 100);
      const truePct = Math.round(arm.mean * 100);
      const pullPct = Math.round((pulls[i] / maxPull) * 100);
      const isLast = i === lastArm;
      const isOpt = i === optIndex();
      const ucb =
        policy() === "ucb1"
          ? pulls[i] === 0
            ? "∞"
            : ucbValue(i).toFixed(2)
          : "—";

      return `
      <div class="bandit-arm${isLast ? " is-last" : ""}${isOpt && reveal ? " is-optimal" : ""}" data-arm="${i}">
        <div class="bandit-arm-head">
          <span class="bandit-arm-name">${arm.label}${isOpt && reveal ? " ★" : ""}</span>
          <span class="bandit-arm-meta">n=${pulls[i]} · μ̂=${pulls[i] ? meanEst[i].toFixed(2) : "—"} · UCB ${ucb}</span>
        </div>
        <div class="bandit-bars">
          <div class="bandit-bar-track" title="経験平均">
            <div class="bandit-bar bandit-bar-est" style="width:${empPct}%"></div>
            <span class="bandit-bar-label">推定 ${empPct}%</span>
          </div>
          ${
            reveal
              ? `<div class="bandit-bar-track bandit-bar-track-true" title="真の平均">
            <div class="bandit-bar bandit-bar-true" style="width:${truePct}%"></div>
            <span class="bandit-bar-label">真 μ ${truePct}%</span>
          </div>`
              : ""
          }
          <div class="bandit-bar-track bandit-bar-track-n" title="相対引数">
            <div class="bandit-bar bandit-bar-n" style="width:${pullPct}%"></div>
            <span class="bandit-bar-label">回数シェア</span>
          </div>
        </div>
        ${
          isLast && lastReward !== null
            ? `<div class="bandit-last-reward">直前の報酬: <strong>${lastReward}</strong>（${modeLabel()}）</div>`
            : ""
        }
      </div>`;
    })
    .join("");

  boardEl.innerHTML = `
    <div class="bandit-legend-row">
      <span><i class="swatch swatch-or"></i>経験平均 μ̂</span>
      ${reveal ? `<span><i class="swatch swatch-path"></i>真の μ</span>` : ""}
      <span><i class="swatch swatch-and"></i>相対引数</span>
    </div>
    <div class="bandit-arms">${rows}</div>
  `;
}

function updateDs() {
  if (!dsPanels) return;
  const bi = optIndex();
  const stats = [
    `試行 t: ${totalPulls} / ${targetN()}`,
    `方策: ${policy() === "ucb1" ? "UCB1" : `ε-greedy ε=${epsilon()}`}`,
    `累積リグレット: ${cumulativeRegret.toFixed(3)}`,
    `最適腕: ${arms[bi]?.label ?? "—"} (μ=${arms[bi]?.mean ?? "—"})`,
    `総報酬: ${rewardSum.reduce((a, b) => a + b, 0)}`,
  ];
  const armStats = arms.map(
    (a, i) =>
      `${a.label}: n=${pulls[i]} μ̂=${pulls[i] ? meanEst[i].toFixed(2) : "—"}` +
      (showTrue() ? ` μ=${a.mean}` : "")
  );
  const hist = recent.map((r, i) => `${r}`).join("")
    ? recent.map((r, idx) => `#${totalPulls - recent.length + idx + 1}: ${r}`)
    : [];

  setPanel(
    dsPanels,
    renderSet({
      label: "統計",
      typeNote: "リグレット = Σ(μ*−μ_a)",
      items: stats,
    }) +
      renderSet({
        label: "各腕",
        typeNote: "回数と推定",
        items: armStats,
      }) +
      renderSet({
        label: "直近の報酬",
        typeNote: "0/1",
        items: hist,
        emptyText: "（まだなし）",
      })
  );
}

function stopAuto() {
  running = false;
  if (btnPlay) btnPlay.textContent = "再生";
  if (timerId !== null) {
    clearTimeout(timerId);
    timerId = null;
  }
}

function scheduleNext() {
  if (!running) return;
  const delay = Number(speedEl?.value) || 80;
  timerId = setTimeout(() => {
    if (!running) return;
    if (stepOnce()) scheduleNext();
    else stopAuto();
  }, delay);
}

function togglePlay() {
  if (finished) resetState();
  if (running) {
    stopAuto();
    return;
  }
  running = true;
  if (btnPlay) btnPlay.textContent = "一時停止";
  if (stepOnce()) scheduleNext();
  else stopAuto();
}



btnPlay?.addEventListener("click", togglePlay);
btnStep?.addEventListener("click", () => {
  if (running) stopAuto();
  if (finished) resetState();
  stepOnce();
});
btnReset?.addEventListener("click", () => resetState());
seedEl?.addEventListener("change", () => resetState());
presetEl?.addEventListener("change", () => resetState());
policyEl?.addEventListener("change", () => {
  if (totalPulls === 0) {
    setStatus(`方策を ${policy() === "ucb1" ? "UCB1" : "ε-greedy"} に変更（リセット済み状態）`);
    updateDs();
    draw();
  } else {
    setStatus("方策変更は途中から反映（統計は継続）。公平な比較にはリセット推奨");
    updateDs();
  }
});
epsilonEl?.addEventListener("change", () => {
  epsilonEl.dataset.touched = "1";
  updateDs();
});
targetEl?.addEventListener("change", () => {
  targetEl.dataset.touched = "1";
  if (!finished && totalPulls >= targetN()) finishRun();
  else updateDs();
});
showTrueEl?.addEventListener("change", () => {
  draw();
  updateDs();
});

if (seedEl) seedEl.value = String(BANDIT_CONFIG.defaultSeed);
if (targetEl) targetEl.value = String(BANDIT_CONFIG.defaultSteps);
if (epsilonEl) epsilonEl.value = String(BANDIT_CONFIG.defaultEpsilon);
if (presetEl) presetEl.value = BANDIT_CONFIG.defaultPreset;

resetState();
loadTextSample(
  "../samples/MultiArmedBanditExample.cs",
  csharpSample,
  "// samples/MultiArmedBanditExample.cs を読み込めませんでした。"
);
