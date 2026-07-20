/**
 * 三目並べデモ（全解析・対称性除去・モンテカルロ比較）
 * 共通基盤: js/platform/*
 *
 * このファイルの前半（SOLVER CORE）は DOM に依存しない純関数群。
 * Node からも `import` して数値検証できるように、DOM 操作は
 * `IS_BROWSER` ガードの内側（ファイル後半）にのみ書く。
 *
 * @see docs/topics/tic-tac-toe/SPEC.md
 */

import {
  DEFAULT_PRESET_ID,
  TICTACTOE_CONFIG,
  getPreset,
  presetList,
} from "./maps/tic-tac-toe-config.js";
import { setPanel, renderCallStack, renderSet } from "./ds-viz.js";
import {
  createStatus,
  createResultPanel,
  createPlayback,
  loadTextSample,
  mulberry32,
  randomIndex,
  mountTopicShellFromDataset,
} from "./platform/index.js";

const IS_BROWSER = typeof document !== "undefined";

/* ============================================================
 * SOLVER CORE（DOM 非依存・純関数。数値検証スクリプトから import 可能）
 * ============================================================ */

/** 空盤（'.' = 空き, 'X' / 'O' = 着手済み） */
export const EMPTY_BOARD = ".........";

/** 3×3 の8本の勝利ライン */
export const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/**
 * @param {string} board
 * @returns {number}
 */
function countPiece(board, piece) {
  let n = 0;
  for (let i = 0; i < board.length; i++) if (board[i] === piece) n++;
  return n;
}

/**
 * 手番を返す（X が先手。個数差から一意に決まる）
 * @param {string} board
 * @returns {'X'|'O'}
 */
export function currentPlayer(board) {
  const x = countPiece(board, "X");
  const o = countPiece(board, "O");
  return x === o ? "X" : "O";
}

/**
 * @param {string} board
 * @returns {number[]} 空きマスの index 一覧
 */
export function legalMoves(board) {
  const out = [];
  for (let i = 0; i < board.length; i++) if (board[i] === ".") out.push(i);
  return out;
}

/**
 * @param {string} board
 * @param {number} index
 * @param {'X'|'O'} piece
 * @returns {string}
 */
export function applyMove(board, index, piece) {
  return board.slice(0, index) + piece + board.slice(index + 1);
}

/**
 * @param {string} board
 * @returns {'X'|'O'|null}
 */
export function winner(board) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] !== "." && board[a] === board[b] && board[b] === board[c]) {
      return /** @type {'X'|'O'} */ (board[a]);
    }
  }
  return null;
}

/**
 * @param {string} board
 * @returns {[number, number, number] | null} 揃ったライン（表示用）
 */
export function winningLine(board) {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] !== "." && board[a] === board[b] && board[b] === board[c]) {
      return line;
    }
  }
  return null;
}

/** @param {string} board */
export function isFull(board) {
  return !board.includes(".");
}

/** @param {string} board */
export function isTerminal(board) {
  return winner(board) !== null || isFull(board);
}

/**
 * 終局時の値。手番（currentPlayer）視点。
 * 終局はすなわち「直前の手番（相手）が勝った」か「引き分け」のどちらか
 * （このデモでは終局後にさらに着手はしない前提）。
 * @param {string} board
 * @returns {number} 1=勝ち, 0=引き分け, -1=負け
 */
export function terminalValue(board) {
  return winner(board) !== null ? -1 : 0;
}

/**
 * 局面の合法性チェック（編集モード用）
 * X と O の個数差は 0（Xの手番）か 1（Oの手番）以外は非法。
 * 両者同時に3並びが揃っている場合も非法。
 * @param {string} board
 * @returns {{ legal: boolean, reason: string }}
 */
export function validateBoard(board) {
  const x = countPiece(board, "X");
  const o = countPiece(board, "O");
  const diff = x - o;
  if (diff !== 0 && diff !== 1) {
    return {
      legal: false,
      reason: `X(${x}) と O(${o}) の個数差は 0 か 1 のみ有効です（現在 ${diff}）`,
    };
  }
  const xWinLines = WIN_LINES.filter(
    ([a, b, c]) => board[a] === "X" && board[b] === "X" && board[c] === "X"
  );
  const oWinLines = WIN_LINES.filter(
    ([a, b, c]) => board[a] === "O" && board[b] === "O" && board[c] === "O"
  );
  if (xWinLines.length > 0 && oWinLines.length > 0) {
    return { legal: false, reason: "X と O が同時に3並びしています（非法）" };
  }
  return { legal: true, reason: "" };
}

/**
 * 手番反転時の符号反転。`-0` を `0` に正規化する（`-(0)` は IEEE754 で -0 になり、
 * `Object.is(-0, 0)` が false のため一部の等値比較・表示で混乱するのを避ける）。
 * @param {number} v
 * @returns {number}
 */
function neg(v) {
  return v === 0 ? 0 : -v;
}

/* ---- 対称性（8変換の最小符号化） ---- */

/**
 * 座標変換: k=0..3 は 90°刻みの回転、k=4..7 は左右反転してから回転。
 * これで二面体群 D4（8元）を網羅する。
 * @param {number} i セル index (0..8)
 * @param {number} k 変換 id (0..7)
 * @returns {number} 変換後の index
 */
export function transformIndex(i, k) {
  let r = Math.floor(i / 3);
  let c = i % 3;
  let steps = k;
  if (steps >= 4) {
    c = 2 - c; // 左右反転
    steps -= 4;
  }
  for (let t = 0; t < steps; t++) {
    const nr = c;
    const nc = 2 - r;
    r = nr;
    c = nc;
  }
  return r * 3 + c;
}

/**
 * @param {string} board
 * @param {number} k
 * @returns {string}
 */
export function transformBoard(board, k) {
  const out = new Array(9);
  for (let i = 0; i < 9; i++) {
    out[transformIndex(i, k)] = board[i];
  }
  return out.join("");
}

/**
 * 8変換のうち辞書順で最小の符号化（対称性除去の代表値）
 * @param {string} board
 * @returns {string}
 */
export function canonicalKey(board) {
  let best = null;
  for (let k = 0; k < 8; k++) {
    const t = transformBoard(board, k);
    if (best === null || t < best) best = t;
  }
  return /** @type {string} */ (best);
}

/**
 * 現局面の8変換一覧（対称パネル表示用）
 * @param {string} board
 * @returns {{ k: number, board: string, isCanonical: boolean }[]}
 */
export function allTransforms(board) {
  const canon = canonicalKey(board);
  const out = [];
  for (let k = 0; k < 8; k++) {
    const t = transformBoard(board, k);
    out.push({ k, board: t, isCanonical: t === canon });
  }
  return out;
}

/* ---- negamax（α-β / メモ化 / 対称性除去はトグルで独立にON/OFF） ---- */

/**
 * @typedef {{ alphaBeta?: boolean, memo?: boolean, symmetry?: boolean }} SolveToggles
 * @typedef {{ visited: number, memoHits: number, cuts: number }} SolveStats
 */

/** @returns {SolveStats} */
export function createStats() {
  return { visited: 0, memoHits: 0, cuts: 0 };
}

/**
 * negamax 本体（SPEC §3 の Solve に対応）
 *
 * メモ表には値だけでなく **境界の種類**（exact / lower / upper）も保存する。
 * α-β を併用すると、打ち切られた探索の返り値は「真の値の下限（または上限）」
 * でしかなく厳密値ではない。これをフラグなしでそのままキャッシュして
 * 別の窓（alpha/beta）から読み出すと値が壊れる（実装時に検出したバグ）。
 * 標準的な置換表と同じ exact/lower/upper 方式で解決する。
 * @param {string} board
 * @param {number} alpha
 * @param {number} beta
 * @param {Required<SolveToggles>} toggles
 * @param {SolveStats} stats
 * @param {Map<string, { value: number, flag: 'exact'|'lower'|'upper' }> | null} memoMap
 * @returns {number} 手番視点の値
 */
export function solveNode(board, alpha, beta, toggles, stats, memoMap) {
  stats.visited++;

  if (isTerminal(board)) {
    return terminalValue(board);
  }

  const alphaOrig = alpha;
  let key = null;
  if (toggles.memo && memoMap) {
    key = toggles.symmetry ? canonicalKey(board) : board;
    const entry = memoMap.get(key);
    if (entry) {
      if (entry.flag === "exact") {
        stats.memoHits++;
        return entry.value;
      }
      if (entry.flag === "lower" && entry.value >= beta) {
        stats.memoHits++;
        return entry.value;
      }
      if (entry.flag === "upper" && entry.value <= alpha) {
        stats.memoHits++;
        return entry.value;
      }
      // 打ち切りには使えないが、探索窓は絞れる
      if (toggles.alphaBeta) {
        if (entry.flag === "lower" && entry.value > alpha) alpha = entry.value;
        if (entry.flag === "upper" && entry.value < beta) beta = entry.value;
      }
    }
  }

  const mover = currentPlayer(board);
  let best = -Infinity;
  for (const m of legalMoves(board)) {
    const child = applyMove(board, m, mover);
    const v = neg(solveNode(child, -beta, -alpha, toggles, stats, memoMap));
    if (v > best) best = v;
    if (toggles.alphaBeta) {
      if (best > alpha) alpha = best;
      if (alpha >= beta) {
        stats.cuts++;
        break;
      }
    }
  }

  if (toggles.memo && memoMap && key !== null) {
    let flag;
    if (best <= alphaOrig) flag = "upper";
    else if (best >= beta) flag = "lower";
    else flag = "exact";
    memoMap.set(key, { value: best, flag });
  }
  return best;
}

/**
 * @param {SolveToggles} [toggles]
 * @returns {Required<SolveToggles>}
 */
function normalizeToggles(toggles = {}) {
  return {
    alphaBeta: !!toggles.alphaBeta,
    memo: !!toggles.memo,
    symmetry: !!toggles.symmetry,
  };
}

/**
 * 現局面の全合法手を完全解析する（ルートは常に全探索 = オーバレイ用に全手の値を確定）。
 * トグルは各手の部分木の探索方法（α-β・メモ化・対称性除去）にのみ影響する。
 * メモ表は全ルート手で共有（転置表として機能）。
 * @param {string} board
 * @param {SolveToggles} [toggles]
 * @returns {{
 *   mover: 'X'|'O',
 *   rootValue: number,
 *   moves: { index: number, value: number }[],
 *   stats: SolveStats,
 *   toggles: Required<SolveToggles>,
 * }}
 */
export function analyzeMoves(board, toggles = {}) {
  const t = normalizeToggles(toggles);
  const stats = createStats();
  const memoMap = t.memo ? new Map() : null;
  const mover = currentPlayer(board);

  if (isTerminal(board)) {
    return { mover, rootValue: terminalValue(board), moves: [], stats, toggles: t };
  }

  const moves = legalMoves(board).map((m) => {
    const child = applyMove(board, m, mover);
    const value = neg(solveNode(child, -Infinity, Infinity, t, stats, memoMap));
    return { index: m, value };
  });
  const rootValue = Math.max(...moves.map((mv) => mv.value));
  return { mover, rootValue, moves, stats, toggles: t };
}

/** 8トグル構成（2^3）を総当たりし、visited/memoHits/cuts を比較する */
export function compareToggleConfigs(board) {
  /** @type {{ toggles: Required<SolveToggles>, label: string, rootValue: number, stats: SolveStats }[]} */
  const rows = [];
  for (let mask = 0; mask < 8; mask++) {
    const toggles = {
      alphaBeta: !!(mask & 1),
      memo: !!(mask & 2),
      symmetry: !!(mask & 4),
    };
    const result = analyzeMoves(board, toggles);
    rows.push({
      toggles,
      label: toggleLabel(toggles),
      rootValue: result.rootValue,
      stats: result.stats,
    });
  }
  return rows;
}

/** @param {Required<SolveToggles>} t */
export function toggleLabel(t) {
  const parts = [];
  parts.push(t.alphaBeta ? "α-β:ON" : "α-β:OFF");
  parts.push(t.memo ? "メモ:ON" : "メモ:OFF");
  parts.push(t.symmetry ? "対称:ON" : "対称:OFF");
  return parts.join(" / ");
}

/**
 * 到達可能な合法局面数（グラフ探索・重複除去）と、対称性除去後の代表局面数。
 * 教材上の定数（5478 / 765）を実装の canonical 関数で再現するための検証用。
 * @returns {{ total: number, canonical: number }}
 */
export function countReachableStates() {
  /** @type {Set<string>} */
  const seen = new Set();
  /** @type {Set<string>} */
  const seenCanon = new Set();

  function rec(board) {
    if (seen.has(board)) return;
    seen.add(board);
    seenCanon.add(canonicalKey(board));
    if (isTerminal(board)) return;
    const mover = currentPlayer(board);
    for (const m of legalMoves(board)) {
      rec(applyMove(board, m, mover));
    }
  }
  rec(EMPTY_BOARD);
  return { total: seen.size, canonical: seenCanon.size };
}

/* ---- モンテカルロ評価（乱択プレイアウト） ---- */

/**
 * board から手番を交互に乱択で進め、終局の勝者（引分けは null）を返す
 * @param {string} board
 * @param {() => number} rng
 * @returns {'X'|'O'|null}
 */
export function randomPlayoutOutcome(board, rng) {
  let b = board;
  while (!isTerminal(b)) {
    const mover = currentPlayer(b);
    const moves = legalMoves(b);
    const m = moves[randomIndex(rng, moves.length)];
    b = applyMove(b, m, mover);
  }
  return winner(b);
}

/**
 * 現局面の各合法手について、N 回の乱択プレイアウトで勝率を推定する。
 * @param {string} board
 * @param {number} n
 * @param {() => number} rng
 * @returns {{ index: number, wins: number, draws: number, losses: number, n: number, winRate: number }[]}
 */
export function mcEstimateMoves(board, n, rng) {
  const mover = currentPlayer(board);
  const moves = legalMoves(board);
  return moves.map((m) => {
    const child = applyMove(board, m, mover);
    let wins = 0;
    let draws = 0;
    let losses = 0;
    for (let i = 0; i < n; i++) {
      const w = randomPlayoutOutcome(child, rng);
      if (w === mover) wins++;
      else if (w === null) draws++;
      else losses++;
    }
    const winRate = (wins + 0.5 * draws) / n;
    return { index: m, wins, draws, losses, n, winRate };
  });
}

/* ---- 1ステップ実行用ジェネレータ（探索経路のコールスタックを覗く） ---- */

/**
 * @typedef {{
 *   board: string,
 *   mover: 'X'|'O',
 *   depth: number,
 *   best: number,
 *   phase: 'enter'|'child'|'exit',
 *   lastMove?: number,
 *   lastValue?: number,
 *   value?: number,
 *   cut?: boolean,
 * }} StepEvent
 */

/**
 * negamax を1ノードずつ辿れるジェネレータ。
 * `frames` 引数に現在のコールスタック（盤面の配列）が積まれる。
 * 空きマスが多い局面から使うと展開数が非常に多くなるため、
 * UI 側は残り手数が少ない局面での利用を推奨する（SPEC §10）。
 * @param {string} board
 * @param {number} alpha
 * @param {number} beta
 * @param {Required<SolveToggles>} toggles
 * @param {SolveStats} stats
 * @param {Map<string, number> | null} memoMap
 * @param {string[]} frames コールスタック（末尾が現在フレーム）
 * @param {number} [depth]
 * @returns {Generator<StepEvent, number, void>}
 */
export function* solveStep(
  board,
  alpha,
  beta,
  toggles,
  stats,
  memoMap,
  frames,
  depth = 0
) {
  stats.visited++;
  frames.push(board);
  const mover = currentPlayer(board);
  yield { board, mover, depth, best: -Infinity, phase: "enter" };

  if (isTerminal(board)) {
    const v = terminalValue(board);
    frames.pop();
    yield { board, mover, depth, best: v, value: v, phase: "exit" };
    return v;
  }

  const alphaOrig = alpha;
  let key = null;
  if (toggles.memo && memoMap) {
    key = toggles.symmetry ? canonicalKey(board) : board;
    const entry = memoMap.get(key);
    if (entry) {
      let resolved = null;
      if (entry.flag === "exact") resolved = entry.value;
      else if (entry.flag === "lower" && entry.value >= beta) resolved = entry.value;
      else if (entry.flag === "upper" && entry.value <= alpha) resolved = entry.value;
      if (resolved !== null) {
        stats.memoHits++;
        frames.pop();
        yield { board, mover, depth, best: resolved, value: resolved, phase: "exit" };
        return resolved;
      }
      if (toggles.alphaBeta) {
        if (entry.flag === "lower" && entry.value > alpha) alpha = entry.value;
        if (entry.flag === "upper" && entry.value < beta) beta = entry.value;
      }
    }
  }

  let best = -Infinity;
  for (const m of legalMoves(board)) {
    const child = applyMove(board, m, mover);
    const childVal = yield* solveStep(
      child,
      -beta,
      -alpha,
      toggles,
      stats,
      memoMap,
      frames,
      depth + 1
    );
    const v = neg(childVal);
    if (v > best) best = v;
    yield {
      board,
      mover,
      depth,
      best,
      phase: "child",
      lastMove: m,
      lastValue: v,
    };
    if (toggles.alphaBeta) {
      if (best > alpha) alpha = best;
      if (alpha >= beta) {
        stats.cuts++;
        yield { board, mover, depth, best, phase: "child", cut: true };
        break;
      }
    }
  }

  if (toggles.memo && memoMap && key !== null) {
    let flag;
    if (best <= alphaOrig) flag = "upper";
    else if (best >= beta) flag = "lower";
    else flag = "exact";
    memoMap.set(key, { value: best, flag });
  }
  frames.pop();
  yield { board, mover, depth, best, value: best, phase: "exit" };
  return best;
}

/** 盤面を3行のミニ文字列にする（コールスタック等の表示用） */
export function miniBoardText(board) {
  const row = (r) =>
    board
      .slice(r * 3, r * 3 + 3)
      .split("")
      .join(" ");
  return `${row(0)} / ${row(1)} / ${row(2)}`;
}

/* ============================================================
 * ブラウザ UI（DOM 依存。IS_BROWSER ガード内のみ）
 * ============================================================ */

if (IS_BROWSER) {
  runBrowserUi();
}

function runBrowserUi() {
  mountTopicShellFromDataset();

  const boardEl = document.getElementById("ttt-board");
  const dsPanels = document.getElementById("ds-panels");
  const presetEl = /** @type {HTMLSelectElement | null} */ (
    document.getElementById("preset")
  );
  const modeEditEl = /** @type {HTMLInputElement | null} */ (
    document.getElementById("edit-mode")
  );
  const editPieceEls = /** @type {NodeListOf<HTMLInputElement>} */ (
    document.querySelectorAll('input[name="edit-piece"]')
  );
  const toggleAbEl = /** @type {HTMLInputElement | null} */ (
    document.getElementById("toggle-ab")
  );
  const toggleMemoEl = /** @type {HTMLInputElement | null} */ (
    document.getElementById("toggle-memo")
  );
  const toggleSymEl = /** @type {HTMLInputElement | null} */ (
    document.getElementById("toggle-sym")
  );
  const btnAnalyze = document.getElementById("btn-analyze");
  const btnCompare = document.getElementById("btn-compare");
  const btnReset = document.getElementById("btn-reset");
  const btnStep = document.getElementById("btn-step");
  const btnPlay = document.getElementById("btn-play");
  const speedEl = /** @type {HTMLInputElement | null} */ (
    document.getElementById("speed")
  );
  const nEl = /** @type {HTMLInputElement | null} */ (
    document.getElementById("mc-n")
  );
  const seedEl = /** @type {HTMLInputElement | null} */ (
    document.getElementById("mc-seed")
  );
  const btnMcRun = document.getElementById("btn-mc-run");
  const symDetails = document.getElementById("sym-details");
  const symPanel = document.getElementById("sym-panel");
  const csharpSample = document.getElementById("csharp-sample");
  const reachableEl = document.getElementById("reachable-note");

  const setStatus = createStatus(document.getElementById("status"));
  const resultPanel = createResultPanel(document.getElementById("result-compare"));

  let board = EMPTY_BOARD;
  /** @type {ReturnType<typeof analyzeMoves> | null} */
  let lastAnalysis = null;
  /** @type {ReturnType<typeof mcEstimateMoves> | null} */
  let lastMc = null;
  let editMode = false;
  let editPiece = "X";

  // ---- ステップ実行の状態 ----
  /** @type {Generator<StepEvent, number, void> | null} */
  let stepGen = null;
  /** @type {string[]} */
  let stepFrames = [];
  /** @type {SolveStats} */
  let stepStats = createStats();
  /** @type {Map<string, number> | null} */
  let stepMemo = null;
  let stepBoardRoot = EMPTY_BOARD;
  let stepDone = false;
  let stepFinalValue = null;
  /** @type {StepEvent | null} */
  let lastStepEvent = null;
  const STEP_WARN_EMPTY = 5;

  function currentToggles() {
    return {
      alphaBeta: !!toggleAbEl?.checked,
      memo: !!toggleMemoEl?.checked,
      symmetry: !!toggleSymEl?.checked,
    };
  }

  function valueLabel(v) {
    if (v > 0) return "勝ち";
    if (v < 0) return "負け";
    return "引き分け";
  }

  function valueClass(v) {
    if (v > 0) return "is-win";
    if (v < 0) return "is-loss";
    return "is-draw";
  }

  function loadPreset(id) {
    stopStep();
    const preset = getPreset(id);
    board = preset.board;
    lastAnalysis = null;
    lastMc = null;
    if (nEl) nEl.value = String(preset.demoN ?? TICTACTOE_CONFIG.defaultN);
    if (seedEl) seedEl.value = String(preset.demoSeed ?? TICTACTOE_CONFIG.defaultSeed);
    resultPanel.hide();
    setStatus(`プリセット「${preset.label}」を読み込み — ${preset.blurb}`);
    renderAll();
  }

  function resetBoard() {
    loadPreset(presetEl?.value || DEFAULT_PRESET_ID);
  }

  function analyzeCurrent() {
    stopStep();
    const v = validateBoard(board);
    if (!v.legal) {
      setStatus(`⚠ 非法局面: ${v.reason}`);
      lastAnalysis = null;
      renderAll();
      return;
    }
    if (isTerminal(board)) {
      const w = winner(board);
      setStatus(w ? `終局: ${w} の勝ち` : "終局: 引き分け");
      lastAnalysis = null;
      renderAll();
      return;
    }
    lastAnalysis = analyzeMoves(board, currentToggles());
    lastMc = null;
    setStatus(
      `解析完了 — 根の値: ${valueLabel(lastAnalysis.rootValue)}（手番 ${lastAnalysis.mover}）` +
        ` / 訪問局面 ${lastAnalysis.stats.visited} / メモヒット ${lastAnalysis.stats.memoHits} / カット ${lastAnalysis.stats.cuts}`
    );
    renderAll();
  }

  function compareConfigs() {
    stopStep();
    const v = validateBoard(board);
    if (!v.legal || isTerminal(board)) {
      setStatus("⚠ 比較には合法かつ非終局の局面が必要です");
      return;
    }
    const rows = compareToggleConfigs(board);
    const values = new Set(rows.map((r) => r.rootValue));
    const consistent = values.size === 1;
    const sorted = [...rows].sort((a, b) => b.stats.visited - a.stats.visited);
    const max = sorted[0].stats.visited;
    const min = sorted[sorted.length - 1].stats.visited;

    const tableRows = rows
      .map((r) => {
        return `<tr>
          <td>${r.label}</td>
          <td>${valueLabel(r.rootValue)}</td>
          <td>${r.stats.visited}</td>
          <td>${r.stats.memoHits}</td>
          <td>${r.stats.cuts}</td>
        </tr>`;
      })
      .join("");

    resultPanel.show(`
      <h3>トグル8構成の比較（訪問局面数）</h3>
      <div class="ds-table-scroll">
        <table class="ttt-compare-table">
          <thead>
            <tr><th>構成</th><th>根の値</th><th>訪問局面</th><th>メモヒット</th><th>カット</th></tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
      <p class="result-verdict">
        全構成で根の値は${consistent ? "一致" : "不一致（要確認）"}しました。
        素の全探索（訪問 ${max}）に対し、α-β・メモ化・対称性除去を足すほど訪問局面数が減り、
        全部 ON（訪問 ${min}）が最小になります。
      </p>
      <p class="result-note">全 8 構成 = α-β × メモ化 × 対称性除去の ON/OFF。設定: <code>js/maps/tic-tac-toe-config.js</code></p>
    `);
    setStatus(`8構成比較 — 訪問局面数 ${min}〜${max}（全構成で根の値 ${consistent ? "一致" : "不一致"}）`);
  }

  function runMc() {
    stopStep();
    const v = validateBoard(board);
    if (!v.legal || isTerminal(board)) {
      setStatus("⚠ モンテカルロには合法かつ非終局の局面が必要です");
      return;
    }
    const n = Math.max(10, Math.min(10000, Number(nEl?.value) || TICTACTOE_CONFIG.defaultN));
    const seed = Number(seedEl?.value) || TICTACTOE_CONFIG.defaultSeed;
    const rng = mulberry32(seed);
    lastMc = mcEstimateMoves(board, n, rng);
    if (!lastAnalysis) {
      lastAnalysis = analyzeMoves(board, currentToggles());
    }
    const bestExact = Math.max(...lastAnalysis.moves.map((m) => m.value));
    const bestExactSet = new Set(
      lastAnalysis.moves.filter((m) => m.value === bestExact).map((m) => m.index)
    );
    const bestMc = lastMc.reduce((a, b) => (b.winRate > a.winRate ? b : a));
    const mismatch = !bestExactSet.has(bestMc.index);
    setStatus(
      `MC(N=${n}, seed=${seed}) 完了 — MC最善手 ${cellLabel(bestMc.index)}(勝率${bestMc.winRate.toFixed(2)})` +
        `${mismatch ? " ⚠ 完全解の最善手と不一致（低Nでの過大/過小評価の例）" : " / 完全解と一致"}`
    );
    renderAll();
  }

  function cellLabel(i) {
    return `#${i}(${Math.floor(i / 3)},${i % 3})`;
  }

  function cellClick(i) {
    if (stepGen) return; // ステップ実行中は編集不可
    stopStep(); // 完了済みのステップ表示が残っていればクリア
    if (editMode) {
      if (board[i] === editPiece) {
        board = applyMove(board, i, ".");
      } else {
        board = applyMove(board, i, editPiece);
      }
      lastAnalysis = null;
      lastMc = null;
      const v = validateBoard(board);
      setStatus(v.legal ? "編集モード — 合法局面" : `⚠ 非法局面: ${v.reason}`);
      renderAll();
      return;
    }
    if (board[i] !== ".") return;
    const v = validateBoard(board);
    if (!v.legal || isTerminal(board)) return;
    const mover = currentPlayer(board);
    board = applyMove(board, i, mover);
    lastAnalysis = null;
    lastMc = null;
    if (isTerminal(board)) {
      const w = winner(board);
      setStatus(w ? `${mover} が着手 → ${w} の勝ち` : `${mover} が着手 → 引き分け`);
    } else {
      setStatus(`${mover} が ${cellLabel(i)} に着手`);
    }
    renderAll();
  }

  /* ---- ステップ実行 ---- */

  function stopStep() {
    stepGen = null;
    stepFrames = [];
    lastStepEvent = null;
    stepDone = false;
    stepFinalValue = null;
    playback.stop();
  }

  function startStep() {
    const v = validateBoard(board);
    if (!v.legal || isTerminal(board)) {
      setStatus("⚠ ステップ実行には合法かつ非終局の局面が必要です");
      return false;
    }
    const empty = legalMoves(board).length;
    stepBoardRoot = board;
    stepStats = createStats();
    const toggles = currentToggles();
    stepMemo = toggles.memo ? new Map() : null;
    stepFrames = [];
    stepGen = solveStep(board, -Infinity, Infinity, toggles, stepStats, stepMemo, stepFrames);
    stepDone = false;
    stepFinalValue = null;
    if (empty > STEP_WARN_EMPTY) {
      setStatus(
        `⚠ 空きマス${empty}個 — 展開ノード数が多くなります。終盤プリセット推奨。1ステップずつ確認できます`
      );
    } else {
      setStatus(`ステップ実行開始 — 空きマス${empty}個`);
    }
    return true;
  }

  function stepOnce() {
    if (!stepGen) {
      if (!startStep()) return false;
    }
    const r = stepGen.next();
    if (r.done) {
      stepFinalValue = r.value;
      stepDone = true;
      stepGen = null; // 次のクリックで再スタートできるようにする
      lastStepEvent = null;
      setStatus(
        `ステップ実行完了 — 根の値 ${valueLabel(stepFinalValue)}` +
          ` / 訪問 ${stepStats.visited} / メモヒット ${stepStats.memoHits} / カット ${stepStats.cuts}`
      );
      renderStepPanel();
      return false;
    }
    lastStepEvent = r.value;
    if (r.value.phase === "enter") {
      setStatus(`探索: 深さ${r.value.depth} — ${r.value.mover} の手番の局面に入る`);
    } else if (r.value.phase === "child") {
      if (r.value.cut) {
        setStatus(`深さ${r.value.depth}: 枝刈り発生（残りの子を評価せず打ち切り）`);
      } else {
        setStatus(
          `深さ${r.value.depth}: 手${r.value.lastMove} の評価 = ${r.value.lastValue}（暫定best=${r.value.best}）`
        );
      }
    } else {
      setStatus(`深さ${r.value.depth}: 展開終了 → 値 ${r.value.value}`);
    }
    renderStepPanel();
    return true;
  }

  const playback = createPlayback({
    btnPlay: /** @type {HTMLButtonElement | null} */ (btnPlay),
    speedEl,
    onTick: () => stepOnce(),
    defaultDelayMs: 400,
    delayFromSpeed: (v) => 450 - v,
    labelPlay: "探索再生",
    labelPause: "一時停止",
  });

  /* ---- 描画 ---- */

  function renderBoard() {
    if (!boardEl) return;
    const winLine = winningLine(board);
    const winSet = new Set(winLine ?? []);
    const overlay = new Map();
    if (lastAnalysis) {
      for (const mv of lastAnalysis.moves) overlay.set(mv.index, mv.value);
    }
    const bestVal = lastAnalysis
      ? Math.max(...lastAnalysis.moves.map((m) => m.value))
      : null;
    const mcOverlay = new Map();
    if (lastMc) for (const mv of lastMc) mcOverlay.set(mv.index, mv);

    const cells = [];
    for (let i = 0; i < 9; i++) {
      const p = board[i];
      const classes = ["ttt-cell"];
      if (winSet.has(i)) classes.push("is-win-line");
      let content = p === "." ? "" : p;
      let overlayHtml = "";
      if (p === "." && overlay.has(i)) {
        const v = overlay.get(i);
        classes.push(valueClass(v));
        if (v === bestVal) classes.push("is-best");
        overlayHtml += `<span class="ttt-eval">${v > 0 ? "+1" : v}</span>`;
      }
      if (p === "." && mcOverlay.has(i)) {
        const mc = mcOverlay.get(i);
        overlayHtml += `<span class="ttt-mc">${(mc.winRate * 100).toFixed(0)}%</span>`;
      }
      cells.push(
        `<button type="button" class="${classes.join(" ")}" data-cell="${i}" aria-label="マス ${i}">
          <span class="ttt-piece ttt-piece-${p === "." ? "empty" : p}">${content}</span>
          ${overlayHtml}
        </button>`
      );
    }
    boardEl.innerHTML = `<div class="ttt-grid">${cells.join("")}</div>`;
    boardEl.querySelectorAll("[data-cell]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.getAttribute("data-cell"));
        cellClick(i);
      });
    });
  }

  function renderSymmetryPanel() {
    if (!symPanel) return;
    const transforms = allTransforms(board);
    const html = transforms
      .map((t) => {
        const rows = [0, 1, 2]
          .map(
            (r) =>
              `<div class="ttt-mini-row">${t.board
                .slice(r * 3, r * 3 + 3)
                .split("")
                .map((c) => `<span class="ttt-mini-cell">${c === "." ? "" : c}</span>`)
                .join("")}</div>`
          )
          .join("");
        return `<div class="ttt-sym-item${t.isCanonical ? " is-canonical" : ""}">
          <div class="ttt-mini-board">${rows}</div>
          <div class="ttt-sym-caption">k=${t.k}${t.isCanonical ? " ★代表" : ""}</div>
        </div>`;
      })
      .join("");
    symPanel.innerHTML = html;
  }

  function renderStepPanel() {
    if (!dsPanels) return;
    const frames = stepFrames.map((b, i) => ({
      title: `深さ${i}: ${currentPlayer(b)} の手番`,
      detail: miniBoardText(b),
    }));
    const stats = [
      `根: ${miniBoardText(stepBoardRoot)}`,
      `訪問局面: ${stepStats.visited}`,
      `メモヒット: ${stepStats.memoHits}`,
      `カット: ${stepStats.cuts}`,
      stepDone ? `完了 — 根の値: ${valueLabel(stepFinalValue)}` : "実行中…",
    ];
    setPanel(
      dsPanels,
      renderCallStack({
        label: "探索コールスタック（盤面ミニチュア）",
        frames,
        emptyText: "（1ステップ、または探索再生で開始）",
      }) +
        renderSet({ label: "ステップ計測", typeNote: "visited/memo/cut", items: stats })
    );
  }

  function renderMeasurePanel() {
    if (stepGen || lastStepEvent || stepDone) {
      renderStepPanel();
      return;
    }
    if (!dsPanels) return;
    const items = [];
    if (lastAnalysis) {
      items.push(`手番: ${lastAnalysis.mover}`);
      items.push(`根の値: ${valueLabel(lastAnalysis.rootValue)}`);
      items.push(`訪問局面: ${lastAnalysis.stats.visited}`);
      items.push(`メモヒット: ${lastAnalysis.stats.memoHits}`);
      items.push(`カット: ${lastAnalysis.stats.cuts}`);
    } else {
      items.push("（「解析」で現在のトグル構成を計測）");
    }
    const mcItems = lastMc
      ? lastMc.map(
          (m) =>
            `${cellLabel(m.index)}: 勝率${(m.winRate * 100).toFixed(1)}% (w${m.wins}/d${m.draws}/l${m.losses})`
        )
      : ["（MC 未実行）"];

    setPanel(
      dsPanels,
      renderSet({ label: "現在の計測（選択トグル）", typeNote: "visited/memo/cut", items }) +
        renderSet({ label: "モンテカルロ推定", typeNote: `N=${nEl?.value ?? TICTACTOE_CONFIG.defaultN}`, items: mcItems })
    );
  }

  function renderAll() {
    renderBoard();
    renderSymmetryPanel();
    renderMeasurePanel();
  }

  /* ---- イベント ---- */

  presetEl?.addEventListener("change", () => loadPreset(presetEl.value));
  btnReset?.addEventListener("click", () => resetBoard());
  btnAnalyze?.addEventListener("click", () => analyzeCurrent());
  btnCompare?.addEventListener("click", () => compareConfigs());
  btnMcRun?.addEventListener("click", () => runMc());
  btnStep?.addEventListener("click", () => {
    playback.stop();
    stepOnce();
  });
  btnPlay?.addEventListener("click", () => {
    if (playback.running) {
      playback.stop();
      setStatus("探索再生を一時停止");
      return;
    }
    if (stepDone) stopStep();
    playback.start();
  });
  modeEditEl?.addEventListener("change", () => {
    editMode = !!modeEditEl.checked;
    setStatus(editMode ? "編集モード ON — マスをクリックして X/O/消去" : "編集モード OFF — クリックで通常の着手");
  });
  editPieceEls.forEach((el) => {
    el.addEventListener("change", () => {
      if (el.checked) editPiece = el.value;
    });
  });
  [toggleAbEl, toggleMemoEl, toggleSymEl].forEach((el) => {
    el?.addEventListener("change", () => {
      lastAnalysis = null;
      renderAll();
    });
  });
  symDetails?.addEventListener("toggle", () => {
    if (symDetails.open) renderSymmetryPanel();
  });

  // プリセット select の中身を設定に基づいて生成
  if (presetEl) {
    presetEl.innerHTML = presetList()
      .map((p) => `<option value="${p.id}">${p.label}</option>`)
      .join("");
    presetEl.value = DEFAULT_PRESET_ID;
  }
  if (nEl) nEl.value = String(TICTACTOE_CONFIG.defaultN);
  if (seedEl) seedEl.value = String(TICTACTOE_CONFIG.defaultSeed);

  if (reachableEl) {
    // 起動時に一度だけ計算（空盤からの到達局面数。9段の再帰で高速）
    const { total, canonical } = countReachableStates();
    reachableEl.textContent = `到達可能な合法局面: ${total} 局面（対称性除去後の代表局面: ${canonical}）`;
  }

  resetBoard();
  loadTextSample(
    "../samples/TicTacToeExample.cs",
    csharpSample,
    "// samples/TicTacToeExample.cs を読み込めませんでした。"
  );
}
