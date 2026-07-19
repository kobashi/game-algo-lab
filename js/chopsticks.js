/**
 * 割り箸（循環ゲームグラフ・後退解析）デモ
 * 共通基盤: js/platform/*
 *
 * このファイルの前半（SOLVER CORE）は DOM に依存しない純関数群。
 * Node からも `import` して数値検証できるように、DOM 操作は
 * `IS_BROWSER` ガードの内側（ファイル後半）にのみ書く。
 *
 * @see docs/topics/chopsticks/SPEC.md
 */

import {
  DEFAULT_PRESET_ID,
  DEFAULT_VARIANT,
  getPreset,
  presetList,
} from "./maps/chopsticks-config.js";
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
 * ============================================================
 *
 * 状態表現（SPEC §11 実装判断）:
 *   state = { mover: [a,b], opp: [c,d] }  （a<=b, c<=d、各 0〜4 の指の本数）
 *   「mover」= 現在の手番側、「opp」= 相手側。先手/後手の固定ラベルは持たない
 *   （割り箸は左右対称のゲームなので、手番側/相手側で状態を正規化すれば
 *    先手・後手を分けて数える必要がない）。
 *   全状態数 = 15（手番側ペア）× 15（相手側ペア）= 225 ≤ 450（SPEC §2 の上界内）。
 *
 * 手の生死: 0 = 死（本数なし）。1〜4 = 生存。5 以上は決して保持しない
 *   （タップの結果は必ず 0〜4 に写像される。§3 参照）。
 */

/** 片手の最大本数（死なずに保持できる上限） */
export const HAND_MAX = 4;

/**
 * @param {number} x
 * @param {number} y
 * @returns {[number, number]}
 */
export function normalizePair(x, y) {
  return x <= y ? [x, y] : [y, x];
}

/** 0〜4 の全ソート済みペア（15通り） */
export function allHandPairs() {
  const out = [];
  for (let a = 0; a <= HAND_MAX; a++) {
    for (let b = a; b <= HAND_MAX; b++) out.push(/** @type {[number, number]} */ ([a, b]));
  }
  return out;
}

/**
 * @typedef {{ mover: [number, number], opp: [number, number] }} ChopsticksState
 * @typedef {{ split: boolean, deathRule: 'geq5'|'exact5', mod5: boolean }} Variant
 */

/** 全状態（15×15 = 225）を列挙 */
export function allStates() {
  const pairs = allHandPairs();
  /** @type {ChopsticksState[]} */
  const out = [];
  for (const mover of pairs) {
    for (const opp of pairs) {
      out.push({ mover, opp });
    }
  }
  return out;
}

/** @param {ChopsticksState} state */
export function stateKey(state) {
  const [a, b] = state.mover;
  const [c, d] = state.opp;
  return `${a},${b}|${c},${d}`;
}

/** @param {string} key */
export function parseStateKey(key) {
  const [moverPart, oppPart] = key.split("|");
  const mover = /** @type {[number, number]} */ (moverPart.split(",").map(Number));
  const opp = /** @type {[number, number]} */ (oppPart.split(",").map(Number));
  return /** @type {ChopsticksState} */ ({ mover, opp });
}

/** SPEC の表記 `(a,b|c,d)` に整形 */
export function formatStateKey(key) {
  const [moverPart, oppPart] = key.split("|");
  return `(${moverPart}|${oppPart})`;
}

/** @type {ChopsticksState} 標準の初期局面: 互いに (1,1) */
export const INITIAL_STATE = { mover: [1, 1], opp: [1, 1] };

/** @returns {Variant} */
export function defaultVariant() {
  return { split: false, deathRule: "geq5", mod5: false };
}

/**
 * @param {Partial<Variant>} [v]
 * @returns {Variant}
 */
export function normalizeVariant(v = {}) {
  return {
    split: !!v.split,
    deathRule: v.deathRule === "exact5" ? "exact5" : "geq5",
    mod5: !!v.mod5,
  };
}

/**
 * バリアントの短い日本語ラベル（result-compare 用）
 * @param {Variant} v
 */
export function variantLabel(v) {
  const parts = [];
  parts.push(v.split ? "分割:あり" : "分割:なし");
  if (v.mod5) {
    parts.push("mod5:ON（死=余り0）");
  } else {
    parts.push(v.deathRule === "exact5" ? "死:ちょうど5" : "死:5以上");
  }
  return parts.join(" / ");
}

/**
 * タップされた手の結果本数を計算する（SPEC §11 実装判断）。
 *
 * - 標準（geq5）: 5以上になったら死ぬ（0 本）
 * - ちょうど5（exact5）: 合計がちょうど5なら死ぬ。5を超える合計（6〜8）は
 *   「片手に5本を超えて指を掲げることはできない」という物理的制約により
 *   **不可能な手**として扱う（null を返し、legalMoves から除外する）。
 *   この解釈により exact5 バリアントでも本数は常に 0〜4 に収まり、
 *   状態空間は 15×15 のまま変わらない（もし単に「5を超えても死なず
 *   そのまま残る」と読むと、タップのたびに本数が際限なく増え続け
 *   状態空間が有限に収まらなくなるため採用しなかった）。
 * - mod5 ON: 5以上は 5 で割った余りに戻る（余り0 なら死）。
 *   deathRule の設定より優先される（SPEC §3 の表の通り）。
 *
 * @param {number} targetValue 叩かれる手の元の本数（1〜4）
 * @param {number} hitValue 叩く手の本数（1〜4）
 * @param {Variant} variant
 * @returns {number | null} 結果の本数（0〜4）。exact5 で不可能な手なら null
 */
export function applyHitValue(targetValue, hitValue, variant) {
  const raw = targetValue + hitValue;
  if (variant.mod5) {
    return raw % 5;
  }
  if (variant.deathRule === "exact5") {
    if (raw === 5) return 0;
    if (raw > 5) return null;
    return raw;
  }
  return raw >= 5 ? 0 : raw;
}

/**
 * 0〜4 の範囲で合計 sum になるソート済みペアの一覧（現状と同じものも含む）
 * @param {number} sum
 */
export function partitionsOfSum(sum) {
  /** @type {[number, number][]} */
  const out = [];
  for (let x = 0; x <= HAND_MAX; x++) {
    const y = sum - x;
    if (y < x || y > HAND_MAX) continue;
    out.push([x, y]);
  }
  return out;
}

/**
 * @typedef {{
 *   type: 'tap' | 'split',
 *   hitVal?: number,
 *   tgtVal?: number,
 *   from?: [number, number],
 *   to?: [number, number],
 *   resultState: ChopsticksState,
 *   label: string,
 * }} ChopsticksMove
 */

/**
 * 現局面の合法手一覧（タップ + 分割）。
 * 合法手が0件の局面は「手番側の負け」（SPEC §4 の終局条件を一般化した判定。
 * 通常は mover=[0,0] のときのみ0件になるが、実装は「合法手0件=負け」という
 * より一般的な基準で判定する。理由は SPEC §11 参照）。
 * @param {ChopsticksState} state
 * @param {Variant} variant
 * @returns {ChopsticksMove[]}
 */
export function legalMoves(state, variant) {
  const [a, b] = state.mover;
  const [c, d] = state.opp;
  /** @type {ChopsticksMove[]} */
  const moves = [];

  const hitVals = uniqNonzero(a, b);
  const tgtVals = uniqNonzero(c, d);
  for (const hitVal of hitVals) {
    for (const tgtVal of tgtVals) {
      const result = applyHitValue(tgtVal, hitVal, variant);
      if (result === null) continue; // exact5 で不可能な手
      const otherVal = tgtVal === c ? d : c;
      const newOpp = normalizePair(result, otherVal);
      moves.push({
        type: "tap",
        hitVal,
        tgtVal,
        resultState: { mover: newOpp, opp: state.mover },
        label: `自分の${hitVal}本で相手の${tgtVal}本を叩く → 相手 (${newOpp[0]},${newOpp[1]})`,
      });
    }
  }

  if (variant.split) {
    const sum = a + b;
    for (const [x, y] of partitionsOfSum(sum)) {
      if (x === a && y === b) continue; // 現状と同じ（左右入替のみ含む）分配は不可
      moves.push({
        type: "split",
        from: [a, b],
        to: [x, y],
        resultState: { mover: state.opp, opp: [x, y] },
        label: `分割: (${a},${b}) → (${x},${y})`,
      });
    }
  }

  return moves;
}

/**
 * @param {number} x
 * @param {number} y
 */
function uniqNonzero(x, y) {
  const s = new Set();
  if (x > 0) s.add(x);
  if (y > 0) s.add(y);
  return [...s];
}

/**
 * @typedef {{
 *   wave: number | 'draw',
 *   resolved: string[],
 * }} RetrogradeWaveEvent
 */

/**
 * 後退解析を波単位で進めるジェネレータ（SPEC §4）。
 * 波0 = 合法手0件（負け）。以降、ある手で相手LOSEに行ければWIN、
 * すべての手が相手WINに行けばLOSE。どちらでもない局面が残り続けたら
 * 最後にまとめてDRAWとして確定させる。
 * @param {Variant} variant
 * @returns {Generator<RetrogradeWaveEvent, { labels: Map<string, 'WIN'|'LOSE'|'DRAW'>, waves: Map<string, number|null> }, void>}
 */
export function* retrogradeAnalysisSteps(variant) {
  const states = allStates();
  /** @type {Map<string, 'WIN'|'LOSE'|'DRAW'>} */
  const labels = new Map();
  /** @type {Map<string, number|null>} */
  const waves = new Map();

  // 波0: 合法手が0件 = 負け
  const wave0 = [];
  for (const s of states) {
    const key = stateKey(s);
    if (legalMoves(s, variant).length === 0) {
      labels.set(key, "LOSE");
      waves.set(key, 0);
      wave0.push(key);
    }
  }
  yield { wave: 0, resolved: wave0 };

  let wave = 0;
  for (;;) {
    wave += 1;
    const resolvedThisWave = [];
    for (const s of states) {
      const key = stateKey(s);
      if (labels.has(key)) continue;
      const moves = legalMoves(s, variant);
      let anyLose = false;
      let allWin = moves.length > 0;
      for (const m of moves) {
        const childLabel = labels.get(stateKey(m.resultState));
        if (childLabel === "LOSE") {
          anyLose = true;
          break;
        }
        if (childLabel !== "WIN") allWin = false;
      }
      if (anyLose) {
        labels.set(key, "WIN");
        waves.set(key, wave);
        resolvedThisWave.push(key);
      } else if (allWin) {
        labels.set(key, "LOSE");
        waves.set(key, wave);
        resolvedThisWave.push(key);
      }
    }
    if (resolvedThisWave.length === 0) break;
    yield { wave, resolved: resolvedThisWave };
  }

  const drawKeys = [];
  for (const s of states) {
    const key = stateKey(s);
    if (!labels.has(key)) {
      labels.set(key, "DRAW");
      waves.set(key, null);
      drawKeys.push(key);
    }
  }
  if (drawKeys.length > 0) {
    yield { wave: "draw", resolved: drawKeys };
  }

  return { labels, waves };
}

/**
 * 後退解析を完了まで走らせる（波の途中経過は捨てる）
 * @param {Variant} variant
 */
export function runRetrogradeAnalysis(variant) {
  const gen = retrogradeAnalysisSteps(variant);
  let r = gen.next();
  while (!r.done) r = gen.next();
  return r.value;
}

/**
 * 初期局面から到達可能な局面（現在の合法手グラフを前向きに辿る）
 * @param {ChopsticksState} initState
 * @param {Variant} variant
 * @returns {Set<string>}
 */
export function reachableStatesFrom(initState, variant) {
  const seen = new Set([stateKey(initState)]);
  const stack = [initState];
  while (stack.length) {
    const s = /** @type {ChopsticksState} */ (stack.pop());
    for (const m of legalMoves(s, variant)) {
      const k = stateKey(m.resultState);
      if (!seen.has(k)) {
        seen.add(k);
        stack.push(m.resultState);
      }
    }
  }
  return seen;
}

/** @param {Map<string, 'WIN'|'LOSE'|'DRAW'>} labels */
export function countLabels(labels) {
  let win = 0,
    lose = 0,
    draw = 0;
  for (const v of labels.values()) {
    if (v === "WIN") win++;
    else if (v === "LOSE") lose++;
    else draw++;
  }
  return { win, lose, draw, total: labels.size };
}

/**
 * 深さ制限 Min-Max（negamax）。手番視点で +1=勝ち, -1=負け, 0=打ち切り（未確定）。
 * サイクルのある状態グラフでも depth ごとにメモ化して現実的な時間で終わる
 * （メモ化なしだと分岐 5〜8 の深さ20は指数爆発する）。
 * @param {ChopsticksState} state
 * @param {number} depth
 * @param {Variant} variant
 * @param {Map<string, number>} [memo]
 * @returns {number}
 */
export function depthLimitedValue(state, depth, variant, memo = new Map()) {
  const key = `${stateKey(state)}|${depth}`;
  const cached = memo.get(key);
  if (cached !== undefined) return cached;

  const moves = legalMoves(state, variant);
  let value;
  if (moves.length === 0) {
    value = -1;
  } else if (depth <= 0) {
    value = 0;
  } else {
    let best = -Infinity;
    for (const m of moves) {
      const v = neg(depthLimitedValue(m.resultState, depth - 1, variant, memo));
      if (v > best) best = v;
    }
    value = best;
  }
  memo.set(key, value);
  return value;
}

/**
 * 手番反転時の符号反転。`-0` を `0` に正規化する（`-(0)` は IEEE754 で -0 になり、
 * `-0 === 0` は true だが表示・JSON化で「-0」と出て紛らわしいため揃える。
 * 三目並べ実装（js/tic-tac-toe.js）と同じ対策）。
 * @param {number} v
 */
function neg(v) {
  return v === 0 ? 0 : -v;
}

/**
 * 複数の深さで同じ根局面を評価する（対比パネル用）。メモを使い回して高速化。
 * @param {ChopsticksState} state
 * @param {number[]} depths
 * @param {Variant} variant
 */
export function evalAtDepths(state, depths, variant) {
  const memo = new Map();
  return depths.map((depth) => ({ depth, value: depthLimitedValue(state, depth, variant, memo) }));
}

/** 数値→ラベル文字列 */
export function valueLabel(v) {
  if (v > 0) return "勝ち";
  if (v < 0) return "負け";
  return "引き分け/未確定";
}

/** WIN/LOSE/DRAW → 日本語 */
export function labelText(l) {
  if (l === "WIN") return "勝ち";
  if (l === "LOSE") return "負け";
  return "引き分け（ループ）";
}

/* ============================================================
 * ブラウザ UI（DOM 依存。IS_BROWSER ガード内のみ）
 * ============================================================ */

if (IS_BROWSER) {
  runBrowserUi();
}

function runBrowserUi() {
  mountTopicShellFromDataset();

  const matrixEl = document.getElementById("cs-matrix");
  const handsEl = document.getElementById("cs-hands");
  const moveListEl = document.getElementById("cs-move-list");
  const waveNoteEl = document.getElementById("cs-wave-note");
  const dsPanels = document.getElementById("ds-panels");
  const presetEl = /** @type {HTMLSelectElement | null} */ (document.getElementById("preset"));
  const toggleSplitEl = /** @type {HTMLInputElement | null} */ (document.getElementById("toggle-split"));
  const deathRuleEls = /** @type {NodeListOf<HTMLInputElement>} */ (
    document.querySelectorAll('input[name="death-rule"]')
  );
  const toggleMod5El = /** @type {HTMLInputElement | null} */ (document.getElementById("toggle-mod5"));
  const btnReset = document.getElementById("btn-reset");
  const btnStep = document.getElementById("btn-step");
  const btnPlay = document.getElementById("btn-play");
  const speedEl = /** @type {HTMLInputElement | null} */ (document.getElementById("speed"));
  const btnCompare = document.getElementById("btn-compare");
  const depthSelectEl = /** @type {HTMLSelectElement | null} */ (document.getElementById("depth-select"));
  const btnDepthEval = document.getElementById("btn-depth-eval");
  const csharpSample = document.getElementById("csharp-sample");

  const setStatus = createStatus(document.getElementById("status"));
  const resultPanel = createResultPanel(document.getElementById("result-compare"));

  /** @type {ChopsticksState} 対局ビューの現在局面 */
  let playState = INITIAL_STATE;
  let turnOwner = "human"; // 'human' | 'cpu'
  let gameOver = false;

  /** @type {ReturnType<typeof runRetrogradeAnalysis>} 現バリアントの完全解析（即時計算・常に最新） */
  let fullAnalysis = runRetrogradeAnalysis(defaultVariant());
  /** @type {Set<string>} */
  let reachable = reachableStatesFrom(INITIAL_STATE, defaultVariant());

  // ---- 波アニメーション用の状態（マトリクス可視化専用。fullAnalysis とは独立） ----
  /** @type {Generator<RetrogradeWaveEvent, any, void> | null} */
  let waveGen = null;
  /** @type {Map<string, 'WIN'|'LOSE'|'DRAW'>} */
  let waveLabels = new Map();
  /** @type {Map<string, number|null>} */
  let waveWaves = new Map();
  let lastWaveEvent = /** @type {RetrogradeWaveEvent | null} */ (null);
  let waveDone = false;

  /** @type {{ variant: string, initLabel: string, win: number, lose: number, draw: number, reachable: number, waveCount: number }[]} */
  const compareRows = [];

  function currentVariant() {
    const deathRule = [...deathRuleEls].find((el) => el.checked)?.value === "exact5" ? "exact5" : "geq5";
    return normalizeVariant({
      split: !!toggleSplitEl?.checked,
      deathRule,
      mod5: !!toggleMod5El?.checked,
    });
  }

  function recomputeAnalysis() {
    const v = currentVariant();
    fullAnalysis = runRetrogradeAnalysis(v);
    reachable = reachableStatesFrom(INITIAL_STATE, v);
    restartWaveAnimation();
  }

  function restartWaveAnimation() {
    waveGen = null;
    waveLabels = new Map();
    waveWaves = new Map();
    lastWaveEvent = null;
    waveDone = false;
    playback.stop();
  }

  function loadPreset(id) {
    const preset = getPreset(id);
    // プリセットの手ペアは正規化（ソート）して読み込む（本トピックの核である
    // 「左右は区別しない・ソート済み表現に正規化」を config 側の入力ミスにも
    // 頑健にするため防御的に normalizePair を通す）
    playState = { mover: normalizePair(...preset.mover), opp: normalizePair(...preset.opp) };
    turnOwner = "human";
    gameOver = false;
    recomputeAnalysis();
    resultPanel.hide();
    setStatus(`プリセット「${preset.label}」を読み込み — ${preset.blurb}`);
    renderAll();
  }

  function resetToPreset() {
    loadPreset(presetEl?.value || DEFAULT_PRESET_ID);
  }

  /* ---- 対局ビュー ---- */

  function applyPlayMove(move) {
    playState = move.resultState;
    const moves = legalMoves(playState, currentVariant());
    if (moves.length === 0) {
      gameOver = true;
      const loserLabel = turnOwner === "human" ? "CPU" : "あなた";
      setStatus(`終局 — 手番側（${loserLabel}）の両手が動かせません。${loserLabel} の負けです。`);
    }
  }

  function humanMove(move) {
    if (gameOver || turnOwner !== "human") return;
    applyPlayMove(move);
    renderAll();
    if (!gameOver) {
      turnOwner = "cpu";
      renderAll();
      window.setTimeout(cpuMove, 350);
    }
  }

  function cpuMove() {
    if (gameOver) return;
    const v = currentVariant();
    const moves = legalMoves(playState, v);
    const myLabel = fullAnalysis.labels.get(stateKey(playState));
    let chosen = null;
    if (myLabel === "WIN") {
      chosen = moves.find((m) => fullAnalysis.labels.get(stateKey(m.resultState)) === "LOSE") || null;
    } else if (myLabel === "DRAW") {
      chosen = moves.find((m) => fullAnalysis.labels.get(stateKey(m.resultState)) === "DRAW") || null;
    }
    // LOSE のときは全ての手が相手WINになる（最長粘りは v1 では未実装。SPEC §11 参照）
    if (!chosen) chosen = moves[0];
    if (chosen) {
      const before = myLabel;
      applyPlayMove(chosen);
      setStatus(
        `CPU: ${chosen.label}（自局面の評価=${labelText(before || "DRAW")}）`
      );
    }
    turnOwner = "human";
    renderAll();
  }

  function renderHands() {
    if (!handsEl) return;
    const label = fullAnalysis.labels.get(stateKey(playState));
    const turnText = gameOver ? "終局" : turnOwner === "human" ? "あなたの番" : "CPU の番";
    const handChip = (v) => `<span class="cs-hand-chip${v === 0 ? " is-dead" : ""}">${v}</span>`;
    handsEl.innerHTML = `
      <div class="cs-side">
        <div class="cs-side-label">手番側 ${turnText === "終局" ? "" : `（${turnOwner === "human" ? "あなた" : "CPU"}）`}</div>
        <div class="cs-hand-row">${handChip(playState.mover[0])}${handChip(playState.mover[1])}</div>
      </div>
      <div class="cs-vs">対</div>
      <div class="cs-side">
        <div class="cs-side-label">相手側</div>
        <div class="cs-hand-row">${handChip(playState.opp[0])}${handChip(playState.opp[1])}</div>
      </div>
      <div class="cs-turn-note">${turnText}${label ? ` / 現局面の評価: ${labelText(label)}` : ""}</div>
    `;
  }

  function renderMoveList() {
    if (!moveListEl) return;
    if (gameOver) {
      moveListEl.innerHTML = `<p class="cs-empty">終局しました。リセットまたはプリセット再読み込みで再開できます。</p>`;
      return;
    }
    if (turnOwner !== "human") {
      moveListEl.innerHTML = `<p class="cs-empty">CPU 思考中…</p>`;
      return;
    }
    const v = currentVariant();
    const moves = legalMoves(playState, v);
    if (moves.length === 0) {
      moveListEl.innerHTML = `<p class="cs-empty">合法手がありません（終局）。</p>`;
      return;
    }
    const rows = moves
      .map((m, i) => {
        const childLabel = fullAnalysis.labels.get(stateKey(m.resultState));
        // 子局面の評価は「次に手番になる側」から見た値。今の手番側から見ると逆になる。
        const forMe = childLabel === "LOSE" ? "WIN" : childLabel === "WIN" ? "LOSE" : "DRAW";
        const cls = forMe === "WIN" ? "is-win" : forMe === "LOSE" ? "is-loss" : "is-draw";
        return `<button type="button" class="cs-move-btn ${cls}" data-move-index="${i}">
          <span class="cs-move-label">${m.label}</span>
          <span class="cs-move-tag">${labelText(forMe)}</span>
        </button>`;
      })
      .join("");
    moveListEl.innerHTML = rows;
    moveListEl.querySelectorAll("[data-move-index]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-move-index"));
        humanMove(moves[idx]);
      });
    });
  }

  /* ---- マトリクス ---- */

  function stepWave() {
    if (!waveGen) {
      waveGen = retrogradeAnalysisSteps(currentVariant());
    }
    const r = waveGen.next();
    if (r.done) {
      waveDone = true;
      lastWaveEvent = null;
      setStatus(`後退解析 完了 — 波数 ${maxWaveNumber()} / 引き分け局面 ${countLabels(waveLabels).draw}`);
      renderMatrix();
      renderWavePanel();
      return false;
    }
    for (const key of r.value.resolved) {
      // labels/waves は generator 内部で再構築されるため、ここでは
      // event の resolved リストと現時点の fullAnalysis(同一variant)から補完する
      waveLabels.set(key, fullAnalysis.labels.get(key));
      waveWaves.set(key, r.value.wave === "draw" ? null : r.value.wave);
    }
    lastWaveEvent = r.value;
    const waveLabel = r.value.wave === "draw" ? "引き分け確定" : `波 ${r.value.wave}`;
    setStatus(`${waveLabel}: ${r.value.resolved.length} 局面が確定（累計 ${waveLabels.size}/225）`);
    renderMatrix();
    renderWavePanel();
    return true;
  }

  function maxWaveNumber() {
    let max = 0;
    for (const w of waveWaves.values()) {
      if (typeof w === "number" && w > max) max = w;
    }
    return max;
  }

  const playback = createPlayback({
    btnPlay: /** @type {HTMLButtonElement | null} */ (btnPlay),
    speedEl,
    onTick: () => {
      const cont = stepWave();
      if (!cont) playback.stop();
    },
    defaultDelayMs: 400,
    delayFromSpeed: (v) => 450 - v,
    labelPlay: "波を再生",
    labelPause: "一時停止",
  });

  function renderMatrix() {
    if (!matrixEl) return;
    const pairs = allHandPairs();
    const highlightKey = stateKey(playState);
    const cells = [];
    cells.push(`<div class="cs-matrix-corner"></div>`);
    for (const [c, d] of pairs) {
      cells.push(`<div class="cs-matrix-axis cs-matrix-axis-col">${c},${d}</div>`);
    }
    for (const [a, b] of pairs) {
      cells.push(`<div class="cs-matrix-axis cs-matrix-axis-row">${a},${b}</div>`);
      for (const [c, d] of pairs) {
        const key = `${a},${b}|${c},${d}`;
        const label = waveLabels.get(key);
        const isReach = reachable.has(key);
        let cls = "cs-cell";
        if (!label) cls += " is-pending";
        else if (label === "WIN") cls += " is-win";
        else if (label === "LOSE") cls += " is-loss";
        else cls += " is-draw";
        if (!isReach) cls += " is-unreachable";
        if (key === highlightKey) cls += " is-current";
        cells.push(`<div class="${cls}" title="(${a},${b}|${c},${d}) ${label ? labelText(label) : "未確定"}"></div>`);
      }
    }
    matrixEl.innerHTML = cells.join("");
    matrixEl.style.setProperty("--cs-matrix-cols", String(pairs.length + 1));
    if (waveNoteEl) {
      const counts = countLabels(waveLabels);
      const total = 225;
      waveNoteEl.textContent = waveDone
        ? `解析完了 — 波数 ${maxWaveNumber()} / 勝ち${counts.win} 負け${counts.lose} 引き分け${counts.draw}（到達可能 ${reachable.size}/${total}）`
        : `確定 ${waveLabels.size}/${total} 局面（波を進めてください）`;
    }
  }

  function renderWavePanel() {
    if (!dsPanels) return;
    const resolvedNow = lastWaveEvent
      ? lastWaveEvent.resolved.map((k) => `${formatStateKey(k)}: ${labelText(waveLabels.get(k))}`)
      : [];
    const waveLabelText = lastWaveEvent
      ? lastWaveEvent.wave === "draw"
        ? "引き分け確定（残り全部）"
        : `波 ${lastWaveEvent.wave}`
      : "（未実行）";
    const depthPanel = lastDepthResult ? renderDepthPanel() : "";
    setPanel(
      dsPanels,
      renderSet({
        label: `今回確定した局面（${waveLabelText}）`,
        typeNote: "後退解析の1波",
        items: resolvedNow.length ? resolvedNow : ["（「1ステップ」または「波を再生」で開始）"],
      }) + depthPanel
    );
  }

  /* ---- 深さ制限 Min-Max 対比 ---- */

  let lastDepthResult = null;

  function runDepthCompare() {
    const v = currentVariant();
    const depths = [5, 10, 20];
    const results = evalAtDepths(playState, depths, v);
    const trueLabel = fullAnalysis.labels.get(stateKey(playState));
    lastDepthResult = { results, trueLabel };
    const stable = new Set(results.map((r) => r.value)).size === 1;
    setStatus(
      `深さ比較: ${results.map((r) => `d${r.depth}=${valueLabel(r.value)}`).join(" / ")}` +
        ` / 真の値=${labelText(trueLabel || "DRAW")}` +
        (trueLabel === "DRAW"
          ? stable
            ? "（ループ局面だが今回はたまたま安定 — 深さをさらに増やすと崩れうる）"
            : "（ループ局面のため深さを増やしても値が振動・未確定のまま）"
          : stable
            ? "（true値に収束・安定）"
            : "")
    );
    renderWavePanel();
  }

  function renderDepthPanel() {
    if (!lastDepthResult) return "";
    const rows = lastDepthResult.results
      .map((r) => `深さ${r.depth}: ${valueLabel(r.value)} (${r.value})`)
      .join(" / ");
    const trueLabel = lastDepthResult.trueLabel;
    return renderSet({
      label: "深さ制限 Min-Max 対比（現在の対局局面）",
      typeNote: "negamax・メモ化あり",
      items: [
        rows,
        `後退解析の真の値: ${labelText(trueLabel || "DRAW")}`,
        trueLabel === "DRAW"
          ? "引き分け（ループ）局面は深さを増やしても真の値には確定しない"
          : "勝敗が決まる局面は、深さが十分あれば真の値と一致する",
      ],
    });
  }

  /* ---- バリアント比較 ---- */

  function compareVariants() {
    const v = currentVariant();
    const analysis = runRetrogradeAnalysis(v);
    const counts = countLabels(analysis.labels);
    const reach = reachableStatesFrom(INITIAL_STATE, v);
    const initLabel = analysis.labels.get(stateKey(INITIAL_STATE));
    let waveCount = 0;
    for (const w of analysis.waves.values()) {
      if (typeof w === "number" && w > waveCount) waveCount = w;
    }
    compareRows.push({
      variant: variantLabel(v),
      initLabel: labelText(initLabel || "DRAW"),
      win: counts.win,
      lose: counts.lose,
      draw: counts.draw,
      reachable: reach.size,
      waveCount,
    });
    renderCompareTable();
  }

  function renderCompareTable() {
    const rows = compareRows
      .map(
        (r, i) => `<tr>
          <td>${i + 1}</td>
          <td>${r.variant}</td>
          <td>${r.initLabel}</td>
          <td>${r.win}</td>
          <td>${r.lose}</td>
          <td>${r.draw}</td>
          <td>${r.reachable}</td>
          <td>${r.waveCount}</td>
        </tr>`
      )
      .join("");
    resultPanel.show(`
      <h3>バリアント比較（初期局面 (1,1)-(1,1) の結論）</h3>
      <div class="ds-table-scroll">
        <table class="cs-compare-table">
          <thead>
            <tr><th>#</th><th>バリアント</th><th>初期局面</th><th>勝ち</th><th>負け</th><th>引分</th><th>到達可能</th><th>波数</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="result-note">「バリアントを比較に追加」を押すたびに現在のトグル構成が1行追加されます。設定: <code>js/maps/chopsticks-config.js</code></p>
    `);
  }

  /* ---- 描画まとめ ---- */

  function renderAll() {
    renderHands();
    renderMoveList();
    renderMatrix();
    renderWavePanel();
  }

  /* ---- イベント ---- */

  presetEl?.addEventListener("change", () => loadPreset(presetEl.value));
  btnReset?.addEventListener("click", () => resetToPreset());
  btnStep?.addEventListener("click", () => {
    playback.stop();
    stepWave();
  });
  btnPlay?.addEventListener("click", () => {
    if (playback.running) {
      playback.stop();
      setStatus("波の再生を一時停止");
      return;
    }
    if (waveDone) restartWaveAnimation();
    playback.start();
  });
  btnCompare?.addEventListener("click", () => compareVariants());
  btnDepthEval?.addEventListener("click", () => runDepthCompare());
  [toggleSplitEl, toggleMod5El].forEach((el) => {
    el?.addEventListener("change", () => {
      recomputeAnalysis();
      lastDepthResult = null;
      renderAll();
    });
  });
  deathRuleEls.forEach((el) => {
    el.addEventListener("change", () => {
      recomputeAnalysis();
      lastDepthResult = null;
      renderAll();
    });
  });

  if (presetEl) {
    presetEl.innerHTML = presetList()
      .map((p) => `<option value="${p.id}">${p.label}</option>`)
      .join("");
    presetEl.value = DEFAULT_PRESET_ID;
  }

  // 起動時のトグル状態を config の既定バリアント（DEFAULT_VARIANT）に合わせる
  if (toggleSplitEl) toggleSplitEl.checked = DEFAULT_VARIANT.split;
  if (toggleMod5El) toggleMod5El.checked = DEFAULT_VARIANT.mod5;
  deathRuleEls.forEach((el) => {
    el.checked = el.value === DEFAULT_VARIANT.deathRule;
  });

  // 変数として使われている depthSelectEl は将来の深さ手動選択用（現状は 5/10/20 固定表示）
  void depthSelectEl;

  resetToPreset();
  loadTextSample(
    "../samples/ChopsticksExample.cs",
    csharpSample,
    "// samples/ChopsticksExample.cs を読み込めませんでした。"
  );
}
