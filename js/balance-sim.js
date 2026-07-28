/**
 * ゲームバランス分析 — 自動対戦シミュレーション
 */
import { BALANCE_SIM_CONFIG as C } from "./maps/balance-sim-config.js";
import {
  createStatus,
  createResultPanel,
  loadTextSample,
  mulberry32,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const trialsEl = /** @type {HTMLInputElement} */ (
  document.getElementById("trials")
);
const atkAEl = /** @type {HTMLInputElement} */ (document.getElementById("atk-a"));
const atkBEl = /** @type {HTMLInputElement} */ (document.getElementById("atk-b"));
const hpEl = /** @type {HTMLInputElement} */ (document.getElementById("hp"));
const seedEl = /** @type {HTMLInputElement} */ (document.getElementById("seed"));
const trialsVal = document.getElementById("trials-val");
const atkAVal = document.getElementById("atk-a-val");
const atkBVal = document.getElementById("atk-b-val");
const hpVal = document.getElementById("hp-val");
const barsEl = document.getElementById("bal-bars");
const btnRun = document.getElementById("btn-run");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));
const resultPanel = createResultPanel(
  document.getElementById("result-compare")
);

function sync() {
  if (trialsVal) trialsVal.textContent = String(readTrials());
  if (atkAVal) atkAVal.textContent = String(readAtkA());
  if (atkBVal) atkBVal.textContent = String(readAtkB());
  if (hpVal) hpVal.textContent = String(readHp());
}
function readTrials() {
  return Math.min(
    C.maxTrials,
    Math.max(C.minTrials, Math.floor(Number(trialsEl?.value) || C.defaultTrials))
  );
}
function readAtkA() {
  return Math.floor(Number(atkAEl?.value) || C.defaultAtkA);
}
function readAtkB() {
  return Math.floor(Number(atkBEl?.value) || C.defaultAtkB);
}
function readHp() {
  return Math.floor(Number(hpEl?.value) || C.defaultHp);
}
function readSeed() {
  return (Math.floor(Number(seedEl?.value) || 42) >>> 0) || 1;
}

/**
 * Simple alternate-turn combat. Damage = atk * (0.8 + 0.4*rng)
 * @returns {0|1} winner 0=A 1=B
 */
export function fightOnce(atkA, atkB, hp, rng) {
  let ha = hp;
  let hb = hp;
  let turn = 0;
  let guard = 0;
  while (ha > 0 && hb > 0 && guard++ < 1000) {
    if (turn === 0) {
      hb -= atkA * (0.8 + rng() * 0.4);
    } else {
      ha -= atkB * (0.8 + rng() * 0.4);
    }
    turn = 1 - turn;
  }
  return ha > 0 ? 0 : 1;
}

/**
 * @returns {{ winsA: number, winsB: number, trials: number }}
 */
export function simulate(trials, atkA, atkB, hp, seed) {
  const rng = mulberry32(seed);
  let winsA = 0;
  for (let i = 0; i < trials; i++) {
    if (fightOnce(atkA, atkB, hp, rng) === 0) winsA += 1;
  }
  return { winsA, winsB: trials - winsA, trials };
}

function run() {
  sync();
  const trials = readTrials();
  const atkA = readAtkA();
  const atkB = readAtkB();
  const hp = readHp();
  const seed = readSeed();
  const r = simulate(trials, atkA, atkB, hp, seed);
  const pA = (r.winsA / trials) * 100;
  const pB = (r.winsB / trials) * 100;
  if (barsEl) {
    barsEl.innerHTML = `
      <div class="pf-row"><span>A 勝率</span>
        <div class="pf-bar"><i style="width:${pA}%;background:#5b9fd4"></i></div>
        <span class="pf-ms">${pA.toFixed(1)}%</span></div>
      <div class="pf-row"><span>B 勝率</span>
        <div class="pf-bar"><i style="width:${pB}%;background:#e07a5f"></i></div>
        <span class="pf-ms">${pB.toFixed(1)}%</span></div>
      <table class="coord-table">
        <tr><td>試行</td><td>${trials}</td></tr>
        <tr><td>A 勝利</td><td>${r.winsA}</td></tr>
        <tr><td>B 勝利</td><td>${r.winsB}</td></tr>
        <tr><td>atk A/B</td><td>${atkA} / ${atkB}</td></tr>
        <tr><td>HP</td><td>${hp}</td></tr>
      </table>`;
  }
  resultPanel.show(`
    <p class="result-verdict">A 勝率 ${pA.toFixed(1)}% · B ${pB.toFixed(1)}%</p>
    <p class="result-note">seed=${seed} · 攻撃力を動かして再シミュレーション</p>
  `);
  setStatus(`sim ${trials} · A ${pA.toFixed(1)}%`);
}

btnRun?.addEventListener("click", run);
for (const el of [trialsEl, atkAEl, atkBEl, hpEl, seedEl]) {
  el?.addEventListener("input", sync);
}

loadTextSample(
  "../samples/BalanceSimExample.cs",
  csharpSample,
  "// BalanceSimExample.cs"
);
if (trialsEl) trialsEl.value = String(C.defaultTrials);
if (atkAEl) atkAEl.value = String(C.defaultAtkA);
if (atkBEl) atkBEl.value = String(C.defaultAtkB);
if (hpEl) hpEl.value = String(C.defaultHp);
if (seedEl) seedEl.value = "42";
sync();
run();
