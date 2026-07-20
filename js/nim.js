/**
 * ニム（完全読み切り→理論解）デモ
 * 共通基盤: js/platform/*
 *
 * このファイルの前半（SOLVER CORE）は DOM に依存しない純関数群。
 * Node からも `import` して数値検証できるように、DOM 操作は
 * `IS_BROWSER` ガードの内側（ファイル後半）にのみ書く。
 *
 * @see docs/topics/nim/SPEC.md
 */

import {
  DEFAULT_SINGLE_PARAMS,
  SINGLE_N_MIN,
  SINGLE_N_MAX,
  SINGLE_K_MIN,
  SINGLE_K_MAX,
  DEFAULT_MULTI_PRESET_ID,
  getMultiPreset,
  multiPresetList,
} from "./maps/nim-config.js";
import { setPanel, renderSet } from "./ds-viz.js";
import {
  createStatus,
  createResultPanel,
  createPlayback,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

const IS_BROWSER = typeof document !== "undefined";

/* ============================================================
 * SOLVER CORE（DOM 非依存・純関数。数値検証スクリプトから import 可能）
 * ============================================================ */

/* ---- モード1: 1山（サブトラクションゲーム） ---- */

/**
 * 理論判定: n 個残った局面で手番側が負けるのは n ≡ 0 (mod k+1) のとき（SPEC §4）。
 * `solveSingle` の DP 結果と同じ 'WIN'|'LOSE' 表記で返す（比較しやすくするため）。
 * @param {number} n
 * @param {number} k
 * @returns {'WIN'|'LOSE'}
 */
export function singleTheory(n, k) {
  return n % (k + 1) === 0 ? "LOSE" : "WIN";
}

/**
 * n 個残った局面での合法手（1〜k 個、ただし n を超えない）
 * @param {number} n
 * @param {number} k
 * @returns {number[]}
 */
export function legalMovesSingle(n, k) {
  const max = Math.min(k, n);
  const out = [];
  for (let t = 1; t <= max; t++) out.push(t);
  return out;
}

/**
 * 逆向き着色を n=0..N の順に1ステップずつ進めるジェネレータ（SPEC §4・§5）。
 * value[0] = LOSE（取る石がない = 直前の相手が最後の石を取った = 手番側の負け）。
 * n=1..N: 相手を LOSE 局面（n-t）に送れる手 t が1つでもあれば WIN、なければ LOSE。
 * @param {number} N
 * @param {number} k
 * @returns {Generator<{ n: number, label: 'WIN'|'LOSE' }, ('WIN'|'LOSE')[], void>}
 */
export function* singleColoringSteps(N, k) {
  /** @type {('WIN'|'LOSE')[]} */
  const values = new Array(N + 1).fill(/** @type {any} */ (null));
  values[0] = "LOSE";
  yield { n: 0, label: "LOSE" };
  for (let n = 1; n <= N; n++) {
    let label = /** @type {'WIN'|'LOSE'} */ ("LOSE");
    for (let t = 1; t <= Math.min(k, n); t++) {
      if (values[n - t] === "LOSE") {
        label = "WIN";
        break;
      }
    }
    values[n] = label;
    yield { n, label };
  }
  return values;
}

/**
 * 逆向き着色を完了まで走らせ、n=0..N の着色列を返す（SPEC §7「着色列」）。
 * @param {number} N
 * @param {number} k
 * @returns {('WIN'|'LOSE')[]}
 */
export function solveSingle(N, k) {
  const gen = singleColoringSteps(N, k);
  let r = gen.next();
  while (!r.done) r = gen.next();
  return /** @type {('WIN'|'LOSE')[]} */ (r.value);
}

/**
 * CPU の着手（1山）: n%(k+1) が非0ならその個数を取り相手を LOSE 局面へ送る。
 * n%(k+1)===0（LOSE局面）は理論上どう取っても負けるので、上限内で任意（k個、n未満なら n）を取る。
 * @param {number} n
 * @param {number} k
 * @returns {number | null} 取る個数。n<=0 なら null
 */
export function cpuMoveSingle(n, k) {
  if (n <= 0) return null;
  const r = n % (k + 1);
  if (r !== 0) return r; // r は必ず 1..k の範囲（mod は k+1 なので）
  return Math.min(k, n);
}

/* ---- モード2: 複数山ニム ---- */

/**
 * nim-sum（全山の XOR）
 * @param {number[]} piles
 * @returns {number}
 */
export function nimSum(piles) {
  return piles.reduce((acc, p) => acc ^ p, 0);
}

/** @param {number[]} piles */
export function pilesKey(piles) {
  return piles.join(",");
}

/**
 * @typedef {{
 *   pileIndex: number,
 *   from: number,
 *   to: number,
 *   take: number,
 *   resultState: number[],
 * }} NimMove
 */

/**
 * 現局面の合法手一覧（1つの山から1個以上取る、あらゆる残数への遷移）
 * @param {number[]} piles
 * @returns {NimMove[]}
 */
export function legalMovesMulti(piles) {
  /** @type {NimMove[]} */
  const moves = [];
  for (let i = 0; i < piles.length; i++) {
    for (let to = piles[i] - 1; to >= 0; to--) {
      const resultState = piles.slice();
      resultState[i] = to;
      moves.push({ pileIndex: i, from: piles[i], to, take: piles[i] - to, resultState });
    }
  }
  return moves;
}

/**
 * メモ化探索（DAG: 山の合計は手ごとに厳密に減るので循環なし・必ず停止する）。
 * 全山0（合法手0件）= 手番側の負け。
 * @param {number[]} piles
 * @param {Map<string, 'WIN'|'LOSE'>} [memo]
 * @returns {'WIN'|'LOSE'}
 */
export function solveMulti(piles, memo = new Map()) {
  const key = pilesKey(piles);
  const cached = memo.get(key);
  if (cached !== undefined) return cached;

  const moves = legalMovesMulti(piles);
  /** @type {'WIN'|'LOSE'} */
  let label = "LOSE";
  if (moves.length > 0) {
    for (const m of moves) {
      const childLabel = solveMulti(m.resultState, memo);
      if (childLabel === "LOSE") {
        label = "WIN";
        break;
      }
    }
  }
  memo.set(key, label);
  return label;
}

/**
 * CPU の着手（複数山）: nim-sum が非0なら、ある山を
 * 「その山の値 XOR 現在の nim-sum」まで減らすと nim-sum が 0 になる
 * （XOR の構成的性質。存在すれば必ずその山の値は元の値より小さくなる — SPEC §5）。
 * nim-sum が0（負け局面）なら理論上どの手も相手が nim-sum を0に戻せるので、
 * 先頭の合法手を任意に選ぶ。
 * @param {number[]} piles
 * @returns {NimMove | null}
 */
export function cpuMoveMulti(piles) {
  const sum = nimSum(piles);
  if (sum !== 0) {
    for (let i = 0; i < piles.length; i++) {
      const target = piles[i] ^ sum;
      if (target < piles[i]) {
        return { pileIndex: i, from: piles[i], to: target, take: piles[i] - target, resultState: replaceAt(piles, i, target) };
      }
    }
    // 理論上 sum!==0 なら必ず上のループで見つかる（見つからなければ実装バグ）
    return null;
  }
  const moves = legalMovesMulti(piles);
  return moves[0] ?? null;
}

/**
 * @param {number[]} arr
 * @param {number} i
 * @param {number} v
 */
function replaceAt(arr, i, v) {
  const out = arr.slice();
  out[i] = v;
  return out;
}

/**
 * 各山 0..初期値 の直積（全局面）を列挙する（SPEC §5「一致確認」の対象範囲）。
 * @param {number[]} piles
 * @returns {number[][]}
 */
export function allStatesProduct(piles) {
  /** @type {number[][]} */
  const out = [];
  const cur = new Array(piles.length).fill(0);
  function rec(idx) {
    if (idx === piles.length) {
      out.push(cur.slice());
      return;
    }
    for (let v = 0; v <= piles[idx]; v++) {
      cur[idx] = v;
      rec(idx + 1);
    }
  }
  rec(0);
  return out;
}

/**
 * @typedef {{
 *   total: number,
 *   statesVisited: number,
 *   xorChecks: number,
 *   mismatches: string[],
 *   allMatch: boolean,
 * }} VerifyResult
 */

/**
 * 全局面（初期山構成の直積）で メモ化探索の W/L と (nim-sum≠0) を照合する（SPEC §5・§7）。
 * 直積の各局面は取り合う過程で必ず現れる到達可能局面の集合と一致するため
 * （どの山も 0..初期値 の外には出られない）、`memo.size` は探索が触った局面数と等しくなる。
 * @param {number[]} piles
 * @returns {VerifyResult}
 */
export function verifyAll(piles) {
  const states = allStatesProduct(piles);
  /** @type {Map<string, 'WIN'|'LOSE'>} */
  const memo = new Map();
  /** @type {string[]} */
  const mismatches = [];
  for (const s of states) {
    const searchLabel = solveMulti(s, memo);
    const theoryLabel = nimSum(s) !== 0 ? "WIN" : "LOSE";
    if (searchLabel !== theoryLabel) mismatches.push(pilesKey(s));
  }
  return {
    total: states.length,
    statesVisited: memo.size,
    xorChecks: states.length,
    mismatches,
    allMatch: mismatches.length === 0,
  };
}

/**
 * 2進パネル用データ: 各山を桁揃えした2進文字列と、列ごとの XOR（nim-sum）
 * @param {number[]} piles
 * @returns {{ bits: number, rows: { value: number, bits: string }[], sumValue: number, sumBits: string }}
 */
export function toBinaryRows(piles) {
  const maxVal = Math.max(1, ...piles, nimSum(piles));
  const bits = Math.max(1, Math.floor(Math.log2(maxVal)) + 1);
  const rows = piles.map((p) => ({ value: p, bits: p.toString(2).padStart(bits, "0") }));
  const sumValue = nimSum(piles);
  return { bits, rows, sumValue, sumBits: sumValue.toString(2).padStart(bits, "0") };
}

/* ============================================================
 * ブラウザ UI（DOM 依存。IS_BROWSER ガード内のみ）
 * ============================================================ */

if (IS_BROWSER) {
  runBrowserUi();
}

function runBrowserUi() {
  mountTopicShellFromDataset();

  const modeSelectEl = /** @type {HTMLSelectElement | null} */ (document.getElementById("mode-select"));
  const presetEl = /** @type {HTMLSelectElement | null} */ (document.getElementById("preset"));
  const kSliderEl = /** @type {HTMLInputElement | null} */ (document.getElementById("k-slider"));
  const kValueEl = document.getElementById("k-value");
  const nSliderEl = /** @type {HTMLInputElement | null} */ (document.getElementById("n-slider"));
  const nValueEl = document.getElementById("n-value");
  const btnReset = document.getElementById("btn-reset");
  const btnStep = document.getElementById("btn-step");
  const btnPlay = document.getElementById("btn-play");
  const speedEl = /** @type {HTMLInputElement | null} */ (document.getElementById("speed"));
  const btnVerify = document.getElementById("btn-verify");
  const csharpSample = document.getElementById("csharp-sample");

  const singlePlayEl = document.getElementById("nim-single-play");
  const multiPlayEl = document.getElementById("nim-multi-play");
  const bandEl = document.getElementById("nim-band");
  const modRowEl = document.getElementById("nim-mod-row");
  const bandNoteEl = document.getElementById("nim-band-note");
  const binaryEl = document.getElementById("nim-binary");
  const dsPanels = document.getElementById("ds-panels");

  const setStatus = createStatus(document.getElementById("status"));
  const resultPanel = createResultPanel(document.getElementById("result-compare"));

  /** @type {'single'|'multi'} */
  let mode = "single";

  /* ---- モード1（1山）の状態 ---- */
  let k = DEFAULT_SINGLE_PARAMS.k;
  let N = DEFAULT_SINGLE_PARAMS.N;
  let singleN = N; // 対局ビューの現在の残り石数
  let singleTurn = "human"; // 'human' | 'cpu'
  let singleOver = false;

  /** @type {Generator<{n:number,label:'WIN'|'LOSE'}, ('WIN'|'LOSE')[], void> | null} */
  let bandGen = null;
  /** @type {('WIN'|'LOSE'|null)[]} */
  let bandLabels = [];
  let bandDone = false;
  /** @type {{ n: number, label: string }[]} */
  const bandHistory = [];

  /* ---- モード2（複数山）の状態 ---- */
  let multiPiles = getMultiPreset(DEFAULT_MULTI_PRESET_ID).piles.slice();
  let multiTurn = "human";
  let multiOver = false;
  /** @type {{ verifiedAt: string, presetLabel: string, total: number, statesVisited: number, xorChecks: number, allMatch: boolean }[]} */
  const verifyRows = [];

  /* ---- モード切替 ---- */

  function applyModeVisibility() {
    document.querySelectorAll("[data-mode-only]").forEach((el) => {
      const want = el.getAttribute("data-mode-only");
      /** @type {HTMLElement} */ (el).hidden = want !== mode;
    });
  }

  function setMode(next) {
    mode = next === "multi" ? "multi" : "single";
    if (modeSelectEl) modeSelectEl.value = mode;
    applyModeVisibility();
    resultPanel.hide();
    if (mode === "single") {
      restartBand();
      renderSingle();
      setStatus(`モード1（1山）— N=${N}, k=${k}。「再生」または「1ステップ」で逆向き着色を進めてください。`);
    } else {
      renderMulti();
      setStatus(`モード2（複数山）— プリセット「${getMultiPreset(presetEl?.value).label}」。`);
    }
  }

  /* ---- モード1: 帯の逆向き着色 ---- */

  function restartBand() {
    bandGen = null;
    bandLabels = new Array(N + 1).fill(null);
    bandDone = false;
    bandHistory.length = 0;
    playback.stop();
    renderBand();
    renderDsPanel();
  }

  function stepBand() {
    if (!bandGen) bandGen = singleColoringSteps(N, k);
    const r = bandGen.next();
    if (r.done) {
      bandDone = true;
      setStatus(`逆向き着色 完了 — L（負け）は n mod ${k + 1} === 0 の位置に並ぶ（縞の間隔 = k+1 = ${k + 1}）。`);
      renderBand();
      renderDsPanel();
      return false;
    }
    bandLabels[r.value.n] = r.value.label;
    bandHistory.push({ n: r.value.n, label: r.value.label });
    setStatus(`n=${r.value.n} を ${r.value.label === "LOSE" ? "負け（赤）" : "勝ち（緑）"} に着色`);
    renderBand();
    renderDsPanel();
    return true;
  }

  const playback = createPlayback({
    btnPlay: /** @type {HTMLButtonElement | null} */ (btnPlay),
    speedEl,
    // stepBand() 自身が続行可否(true/false)を返す。createPlayback の schedule() は
    // onTick() の戻り値で次ティックを予約するかどうかを決めるため、ここは
    // stepBand() の戻り値をそのまま返す必要がある（ブロック本体の矢印関数で
    // 戻り値なし=undefinedにすると、最初の1ステップで自動停止してしまう）。
    onTick: () => stepBand(),
    defaultDelayMs: 120,
    delayFromSpeed: (v) => 450 - v,
    labelPlay: "再生",
    labelPause: "一時停止",
  });

  function renderBand() {
    if (!bandEl || !modRowEl) return;
    const bandCells = [];
    const modCells = [];
    for (let n = 0; n <= N; n++) {
      const label = bandLabels[n];
      let cls = "nim-band-cell";
      if (label === "WIN") cls += " is-win";
      else if (label === "LOSE") cls += " is-loss";
      else cls += " is-pending";
      if (n === singleN) cls += " is-current";
      bandCells.push(`<div class="${cls}" title="n=${n} ${label ?? "未着色"}">${n}</div>`);

      const rem = n % (k + 1);
      const modCls = rem === 0 ? "nim-mod-cell is-zero" : "nim-mod-cell";
      modCells.push(`<div class="${modCls}" title="n mod ${k + 1} = ${rem}">${rem}</div>`);
    }
    bandEl.innerHTML = bandCells.join("");
    bandEl.style.setProperty("--nim-band-cols", String(N + 1));
    modRowEl.innerHTML = modCells.join("");
    modRowEl.style.setProperty("--nim-band-cols", String(N + 1));

    if (bandNoteEl) {
      const colored = bandLabels.filter((v) => v !== null).length;
      bandNoteEl.textContent = bandDone
        ? `着色完了（${N + 1}/${N + 1}）— 赤（負け）の位置集合が n mod ${k + 1} = 0 の集合と一致しているか、下の剰余行と見比べてください。`
        : `着色 ${colored}/${N + 1}（「1ステップ」または「再生」で進める）`;
    }
  }

  /* ---- モード1: 対局ビュー ---- */

  function resetSingleGame() {
    singleN = N;
    singleTurn = "human";
    singleOver = false;
  }

  function applySingleMove(take) {
    singleN -= take;
    if (singleN <= 0) {
      singleOver = true;
      const winnerLabel = singleTurn === "human" ? "あなた" : "CPU";
      setStatus(`${winnerLabel} が最後の石を取りました。${winnerLabel} の勝ちです。`);
    }
  }

  function humanSingleMove(take) {
    if (singleOver || singleTurn !== "human" || mode !== "single") return;
    applySingleMove(take);
    renderSingle();
    renderBand();
    if (!singleOver) {
      singleTurn = "cpu";
      renderSingle();
      window.setTimeout(cpuSingleMove, 350);
    }
  }

  function cpuSingleMove() {
    if (singleOver) return;
    const take = cpuMoveSingle(singleN, k);
    if (take !== null) {
      const before = singleN;
      const beforeLabel = solveSingle(N, k)[before] ?? singleTheory(before, k);
      applySingleMove(take);
      if (!singleOver) {
        setStatus(`CPU: ${take}個取る（${before}→${singleN}）（着手前の評価=${beforeLabel === "LOSE" ? "負け" : "勝ち"}）`);
      }
    }
    singleTurn = "human";
    renderSingle();
    renderBand();
  }

  function renderSingle() {
    if (!singlePlayEl) return;
    const turnText = singleOver ? "終局" : singleTurn === "human" ? "あなたの番" : "CPU の番";
    const label = singleTheory(singleN, k);
    // 合法手は 1〜k 個（SPEC §3）。石クリックは「ここまで残して取る」操作なので、
    // クリック可能なのは末尾から k 個の石だけ（それより手前をクリックすると k 超の
    // 不正な取り数になってしまうため、非活性のプレーンな石として表示する）。
    const minLegalTo = Math.max(0, singleN - k);
    const stones = [];
    for (let i = 0; i < singleN; i++) {
      if (i >= minLegalTo) {
        stones.push(
          `<button type="button" class="nim-stone" data-to="${i}" title="ここまで残して${singleN - i}個取る">●</button>`
        );
      } else {
        stones.push(`<span class="nim-stone is-locked" title="一度に取れるのは最大${k}個まで">●</span>`);
      }
    }
    singlePlayEl.innerHTML = `
      <div class="nim-pile-row">
        <span class="nim-pile-label">残り: ${singleN} 個（N=${N}, k=${k}）</span>
        <div class="nim-pile-stones">${stones.join("") || "<span class=\"cs-empty\">（終局）</span>"}</div>
      </div>
      <p class="cs-turn-note">${turnText} / 現局面の理論評価: ${label === "LOSE" ? "負け（n mod " + (k + 1) + " = 0）" : "勝ち"}</p>
    `;
    singlePlayEl.querySelectorAll("[data-to]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const to = Number(btn.getAttribute("data-to"));
        humanSingleMove(singleN - to);
      });
    });
  }

  /* ---- モード2: 対局ビュー ---- */

  function loadMultiPreset(id) {
    const preset = getMultiPreset(id);
    multiPiles = preset.piles.slice();
    multiTurn = "human";
    multiOver = false;
    resultPanel.hide();
    setStatus(`プリセット「${preset.label}」を読み込み — ${preset.blurb}`);
    renderMulti();
  }

  function applyMultiMove(pileIndex, to) {
    multiPiles[pileIndex] = to;
    if (multiPiles.every((p) => p === 0)) {
      multiOver = true;
      const winnerLabel = multiTurn === "human" ? "あなた" : "CPU";
      setStatus(`${winnerLabel} が最後の石を取りました。${winnerLabel} の勝ちです。`);
    }
  }

  function humanMultiMove(pileIndex, to) {
    if (multiOver || multiTurn !== "human" || mode !== "multi") return;
    applyMultiMove(pileIndex, to);
    renderMulti();
    if (!multiOver) {
      multiTurn = "cpu";
      renderMulti();
      window.setTimeout(cpuMultiMove, 350);
    }
  }

  function cpuMultiMove() {
    if (multiOver) return;
    const move = cpuMoveMulti(multiPiles);
    if (move) {
      const sumBefore = nimSum(multiPiles);
      applyMultiMove(move.pileIndex, move.to);
      if (!multiOver) {
        setStatus(
          `CPU: 山${move.pileIndex + 1}を ${move.from}→${move.to}（${move.take}個取る）` +
            `（着手前 nim-sum=${sumBefore} → 着手後 nim-sum=${nimSum(multiPiles)}）`
        );
      }
    }
    multiTurn = "human";
    renderMulti();
  }

  function renderMulti() {
    if (!multiPlayEl || !binaryEl) return;
    const turnText = multiOver ? "終局" : multiTurn === "human" ? "あなたの番" : "CPU の番";
    const sum = nimSum(multiPiles);
    const rows = multiPiles
      .map((value, i) => {
        const stones = [];
        for (let s = 0; s < value; s++) {
          stones.push(
            `<button type="button" class="nim-stone" data-pile="${i}" data-to="${s}" title="ここまで残して${value - s}個取る">●</button>`
          );
        }
        return `<div class="nim-pile-row">
          <span class="nim-pile-label">山${i + 1}: ${value}</span>
          <div class="nim-pile-stones">${stones.join("") || '<span class="cs-empty">（空）</span>'}</div>
        </div>`;
      })
      .join("");
    multiPlayEl.innerHTML = `
      ${rows}
      <p class="cs-turn-note">${turnText} / 現局面の nim-sum = ${sum}（${sum !== 0 ? "手番側 勝ち" : "手番側 負け"}）</p>
    `;
    multiPlayEl.querySelectorAll("[data-pile]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pileIndex = Number(btn.getAttribute("data-pile"));
        const to = Number(btn.getAttribute("data-to"));
        humanMultiMove(pileIndex, to);
      });
    });

    renderBinaryPanel();
  }

  function renderBinaryPanel() {
    if (!binaryEl) return;
    const { bits, rows, sumValue, sumBits } = toBinaryRows(multiPiles);
    const digitCells = (bitsStr) =>
      bitsStr
        .split("")
        .map((d) => `<span class="nim-bit">${d}</span>`)
        .join("");
    const rowsHtml = rows
      .map(
        (r, i) => `<div class="nim-binary-row">
          <span class="nim-binary-label">山${i + 1} = ${r.value}</span>
          <span class="nim-binary-bits">${digitCells(r.bits)}</span>
        </div>`
      )
      .join("");
    const sumCls = sumValue === 0 ? "is-zero" : "is-nonzero";
    binaryEl.innerHTML = `
      <div class="nim-binary-header">
        <span class="nim-binary-label">桁</span>
        <span class="nim-binary-bits">${Array.from({ length: bits }, (_, i) => `<span class="nim-bit nim-bit-head">2^${bits - 1 - i}</span>`).join("")}</span>
      </div>
      ${rowsHtml}
      <div class="nim-binary-row nim-binary-sum ${sumCls}">
        <span class="nim-binary-label">XOR（nim-sum）</span>
        <span class="nim-binary-bits">${digitCells(sumBits)}</span>
      </div>
      <p class="cs-wave-note">nim-sum = ${sumValue}（${sumValue === 0 ? "0 → 手番側 負け" : "非0 → 手番側 勝ち"}）</p>
    `;
  }

  /* ---- 一致確認（モード2） ---- */

  function runVerify() {
    const preset = getMultiPreset(presetEl?.value || DEFAULT_MULTI_PRESET_ID);
    const result = verifyAll(preset.piles);
    verifyRows.push({
      verifiedAt: new Date().toLocaleTimeString("ja-JP"),
      presetLabel: preset.label,
      total: result.total,
      statesVisited: result.statesVisited,
      xorChecks: result.xorChecks,
      allMatch: result.allMatch,
    });
    renderVerifyTable();
    setStatus(
      result.allMatch
        ? `一致確認: 全 ${result.total} 局面で 探索(W/L) と XOR判定 が一致（探索が触った局面数 ${result.statesVisited} / XOR判定 ${result.xorChecks} 回）`
        : `一致確認: 不一致 ${result.mismatches.length} 件（全 ${result.total} 局面中）`
    );
  }

  function renderVerifyTable() {
    const rows = verifyRows
      .map(
        (r, i) => `<tr>
          <td>${i + 1}</td>
          <td>${r.verifiedAt}</td>
          <td>${r.presetLabel}</td>
          <td>${r.total}</td>
          <td>${r.statesVisited}</td>
          <td>${r.xorChecks}</td>
          <td>${r.allMatch ? "一致" : "不一致あり"}</td>
        </tr>`
      )
      .join("");
    resultPanel.show(`
      <h3>一致確認: 探索(W/L) vs XOR判定（全局面照合）</h3>
      <div class="ds-table-scroll">
        <table class="cs-compare-table">
          <thead>
            <tr><th>#</th><th>時刻</th><th>プリセット</th><th>全局面数</th><th>探索が触った局面数</th><th>XOR判定回数</th><th>結果</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="result-note">全局面 = 各山 0..初期値 の直積（例: (3,5,7) なら 4×6×8=192 局面）。
        メモ化探索が触る局面数と XOR判定の回数はどちらも全局面数と同じだが、
        「1局面ずつ探索する」代わりに「XORを1回計算する」だけで済むのが理論解の強み。
        設定は <code>js/maps/nim-config.js</code>。</p>
    `);
  }

  /* ---- DS パネル ---- */

  function renderDsPanel() {
    if (!dsPanels) return;
    if (mode === "single") {
      const recent = bandHistory.slice(-16).map((h) => `n=${h.n}: ${h.label === "LOSE" ? "負け" : "勝ち"}`);
      setPanel(
        dsPanels,
        renderSet({
          label: "帯の着色履歴（直近16件）",
          typeNote: "逆向き着色 1ステップ = n を1つ進める",
          items: recent.length ? recent : ["（「1ステップ」または「再生」で開始）"],
        })
      );
    } else {
      setPanel(
        dsPanels,
        renderSet({
          label: "複数山ニムの状態",
          typeNote: "山の配列（各要素 = 残り石数）",
          items: [`現在: [${multiPiles.join(", ")}]`, `nim-sum = ${nimSum(multiPiles)}`],
        })
      );
    }
  }

  /* ---- リセット ---- */

  function resetCurrent() {
    if (mode === "single") {
      resetSingleGame();
      restartBand();
      renderSingle();
      setStatus(`リセット — N=${N}, k=${k}`);
    } else {
      loadMultiPreset(presetEl?.value || DEFAULT_MULTI_PRESET_ID);
    }
  }

  /* ---- イベント ---- */

  modeSelectEl?.addEventListener("change", () => setMode(modeSelectEl.value));

  kSliderEl?.addEventListener("input", () => {
    k = Number(kSliderEl.value);
    if (kValueEl) kValueEl.textContent = String(k);
    resetSingleGame();
    restartBand();
    renderSingle();
    setStatus(`k=${k} に変更 — 縞の間隔が k+1=${k + 1} になります。着色をやり直してください。`);
  });

  nSliderEl?.addEventListener("input", () => {
    N = Number(nSliderEl.value);
    if (nValueEl) nValueEl.textContent = String(N);
    resetSingleGame();
    restartBand();
    renderSingle();
    setStatus(`N=${N} に変更`);
  });

  btnReset?.addEventListener("click", () => resetCurrent());

  btnStep?.addEventListener("click", () => {
    if (mode !== "single") return;
    playback.stop();
    stepBand();
    renderSingle();
  });

  btnPlay?.addEventListener("click", () => {
    if (mode !== "single") return;
    if (playback.running) {
      playback.stop();
      setStatus("着色の再生を一時停止");
      return;
    }
    if (bandDone) restartBand();
    playback.start();
  });

  btnVerify?.addEventListener("click", () => runVerify());

  presetEl?.addEventListener("change", () => loadMultiPreset(presetEl.value));

  /* ---- 初期化 ---- */

  if (presetEl) {
    presetEl.innerHTML = multiPresetList()
      .map((p) => `<option value="${p.id}">${p.label}</option>`)
      .join("");
    presetEl.value = DEFAULT_MULTI_PRESET_ID;
  }
  if (kSliderEl) {
    kSliderEl.min = String(SINGLE_K_MIN);
    kSliderEl.max = String(SINGLE_K_MAX);
    kSliderEl.value = String(k);
  }
  if (kValueEl) kValueEl.textContent = String(k);
  if (nSliderEl) {
    nSliderEl.min = String(SINGLE_N_MIN);
    nSliderEl.max = String(SINGLE_N_MAX);
    nSliderEl.value = String(N);
  }
  if (nValueEl) nValueEl.textContent = String(N);

  resetSingleGame();
  applyModeVisibility();
  restartBand();
  renderSingle();
  renderMulti();
  setMode("single");

  loadTextSample(
    "../samples/NimExample.cs",
    csharpSample,
    "// samples/NimExample.cs を読み込めませんでした。"
  );
}
