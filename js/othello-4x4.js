/**
 * 4×4 オセロ デモ（符号化・転置表・対称正規化）
 * 共通基盤: js/platform/*
 *
 * このファイルの前半（SOLVER CORE）は DOM に依存しない純関数群。
 * Node からも `import` して数値検証できるように、DOM 操作は
 * `IS_BROWSER` ガードの内側（ファイル後半）にのみ書く。
 *
 * @see docs/topics/othello-4x4/SPEC.md
 */

import {
  DEFAULT_PRESET_ID,
  getPreset,
  presetList,
} from "./maps/othello-4x4-config.js";
import { setPanel, renderSet } from "./ds-viz.js";
import {
  createStatus,
  createResultPanel,
  loadTextSample,
  mountTopicShellFromDataset,
  runChunked,
} from "./platform/index.js";

const IS_BROWSER = typeof document !== "undefined";

/* ============================================================
 * SOLVER CORE（DOM 非依存・純関数。数値検証スクリプトから import 可能）
 * ============================================================ */

/** 盤サイズ（一辺） */
export const SIZE = 4;
/** 盤面のマス数 */
export const CELLS = SIZE * SIZE;

/**
 * 初期局面（標準オセロと同じ交差配置）。
 * 行優先16文字（'.' 空き / 'B' 黒 / 'W' 白）。
 * 中央2×2: (1,1)=W (1,2)=B / (2,1)=B (2,2)=W
 */
export const INITIAL_BOARD = ".....WB..BW.....";

/** 黒先手 */
export const INITIAL_TURN = "B";

/** 8方向（行差, 列差） */
const DIRS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

/** @param {'B'|'W'} turn */
export function opponent(turn) {
  return turn === "B" ? "W" : "B";
}

/** @param {number} r @param {number} c */
function inBounds(r, c) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

/** @param {number} r @param {number} c */
function idx(r, c) {
  return r * SIZE + c;
}

/**
 * @param {string} board
 * @param {string} piece
 * @returns {number}
 */
export function countPiece(board, piece) {
  let n = 0;
  for (let i = 0; i < CELLS; i++) if (board[i] === piece) n++;
  return n;
}

/** @param {string} board */
export function isFull(board) {
  return !board.includes(".");
}

/**
 * index に turn が着手した場合に反転する石の index 一覧（合法でなければ空配列）。
 * @param {string} board
 * @param {'B'|'W'} turn
 * @param {number} index
 * @returns {number[]}
 */
export function flipsForMove(board, turn, index) {
  if (board[index] !== ".") return [];
  const opp = opponent(turn);
  const r0 = Math.floor(index / SIZE);
  const c0 = index % SIZE;
  const flips = [];
  for (const [dr, dc] of DIRS) {
    let r = r0 + dr;
    let c = c0 + dc;
    const line = [];
    while (inBounds(r, c) && board[idx(r, c)] === opp) {
      line.push(idx(r, c));
      r += dr;
      c += dc;
    }
    if (line.length > 0 && inBounds(r, c) && board[idx(r, c)] === turn) {
      flips.push(...line);
    }
  }
  return flips;
}

/**
 * @param {string} board
 * @param {'B'|'W'} turn
 * @param {number} index
 * @returns {boolean}
 */
export function isLegalMove(board, turn, index) {
  return flipsForMove(board, turn, index).length > 0;
}

/**
 * @param {string} board
 * @param {'B'|'W'} turn
 * @returns {number[]} 合法手の index 一覧
 */
export function legalMoves(board, turn) {
  const out = [];
  for (let i = 0; i < CELLS; i++) {
    if (board[i] === "." && isLegalMove(board, turn, i)) out.push(i);
  }
  return out;
}

/**
 * @param {string} board
 * @param {'B'|'W'} turn
 * @param {number} index
 * @returns {string} 着手後の盤面（反転込み）
 */
export function applyMove(board, turn, index) {
  const flips = flipsForMove(board, turn, index);
  const arr = board.split("");
  arr[index] = turn;
  for (const f of flips) arr[f] = turn;
  return arr.join("");
}

/**
 * 両者とも合法手がない（=終局、満杯でなくとも打つ手なし）かどうか。
 * これは盤面のみから決まる性質で、「直前の手がパスだったか」という
 * 経路情報を状態に持たなくても正しく終局判定できる（SPEC §11 実装判断）。
 * @param {string} board
 */
export function bothHaveNoMoves(board) {
  return legalMoves(board, "B").length === 0 && legalMoves(board, "W").length === 0;
}

/** @param {string} board */
export function isTerminal(board) {
  return isFull(board) || bothHaveNoMoves(board);
}

/**
 * 終局時の値。turn（手番として評価したい側）視点の石差。
 * @param {string} board
 * @param {'B'|'W'} turn
 * @returns {number}
 */
export function terminalValue(board, turn) {
  return countPiece(board, turn) - countPiece(board, opponent(turn));
}

/** @param {string} board @param {'B'|'W'} turn */
export function encode(board, turn) {
  return board + turn;
}

/* ---- 対称性（8変換の最小符号化。手番込み） ---- */

/**
 * 座標変換: k=0..3 は 90°刻みの回転、k=4..7 は左右反転してから回転。
 * 三目並べ（3×3）と同型の考え方を 4×4 に一般化したもの。
 * @param {number} i セル index (0..15)
 * @param {number} k 変換 id (0..7)
 * @returns {number}
 */
export function transformIndex(i, k) {
  let r = Math.floor(i / SIZE);
  let c = i % SIZE;
  let steps = k;
  if (steps >= 4) {
    c = SIZE - 1 - c; // 左右反転
    steps -= 4;
  }
  for (let t = 0; t < steps; t++) {
    const nr = c;
    const nc = SIZE - 1 - r;
    r = nr;
    c = nc;
  }
  return r * SIZE + c;
}

/**
 * @param {string} board
 * @param {number} k
 * @returns {string}
 */
export function transformBoard(board, k) {
  const out = new Array(CELLS);
  for (let i = 0; i < CELLS; i++) {
    out[transformIndex(i, k)] = board[i];
  }
  return out.join("");
}

/**
 * 8変換のうち符号化（手番込み）で辞書順最小のものを代表値とする。
 * 手番文字は空間変換で入れ替わらないため、8通りとも末尾の turn は同じ。
 * @param {string} board
 * @param {'B'|'W'} turn
 * @returns {string}
 */
export function canonicalKey(board, turn) {
  let best = null;
  for (let k = 0; k < 8; k++) {
    const t = transformBoard(board, k) + turn;
    if (best === null || t < best) best = t;
  }
  return /** @type {string} */ (best);
}

/**
 * 現局面の8変換一覧（対称パネル表示用）
 * @param {string} board
 * @param {'B'|'W'} turn
 * @returns {{ k: number, board: string, encoded: string, isCanonical: boolean }[]}
 */
export function allTransforms(board, turn) {
  const canon = canonicalKey(board, turn);
  const out = [];
  for (let k = 0; k < 8; k++) {
    const t = transformBoard(board, k);
    const encoded = t + turn;
    out.push({ k, board: t, encoded, isCanonical: encoded === canon });
  }
  return out;
}

/* ---- negamax（α-β / 転置表 / 対称性除去はトグルで独立にON/OFF） ---- */

/**
 * @typedef {{ alphaBeta?: boolean, memo?: boolean, symmetry?: boolean }} SolveToggles
 * @typedef {{ visited: number, memoHits: number, cuts: number }} SolveStats
 */

/** @returns {SolveStats} */
export function createStats() {
  return { visited: 0, memoHits: 0, cuts: 0 };
}

/**
 * `-0` を `0` に正規化する（負号反転で -0 が発生するのを避け、
 * 表示・等値比較の混乱を防ぐ。三目並べと同じ対策）。
 * @param {number} v
 */
function neg(v) {
  return v === 0 ? 0 : -v;
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
 * negamax 本体（SPEC §4 の Solve に対応）。
 *
 * pos = (盤面, 手番) のみで状態を表す。SPEC の擬似コードにある
 * 「直前がパスか」というフラグは、`bothHaveNoMoves(board)`（両者とも
 * 合法手がない）という**盤面だけから決まる性質**と等価であるため
 * 状態に持たない（SPEC §11 実装判断・理由は同ファイルに記載）。
 *
 * 転置表には値だけでなく exact/lower/upper の境界フラグを保存する
 * （三目並べと同じ理由: α-β 併用時の打ち切り値をフラグなしでキャッシュすると
 * 別窓からの読み出しで値が壊れる）。
 * @param {string} board
 * @param {'B'|'W'} turn
 * @param {number} alpha
 * @param {number} beta
 * @param {Required<SolveToggles>} toggles
 * @param {SolveStats} stats
 * @param {Map<string, { value: number, flag: 'exact'|'lower'|'upper' }> | null} memoMap
 * @returns {number} turn 視点の石差
 */
export function solveNode(board, turn, alpha, beta, toggles, stats, memoMap) {
  stats.visited++;

  if (isTerminal(board)) {
    return terminalValue(board, turn);
  }

  const alphaOrig = alpha;
  let key = null;
  if (toggles.memo && memoMap) {
    key = toggles.symmetry ? canonicalKey(board, turn) : encode(board, turn);
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
      if (toggles.alphaBeta) {
        if (entry.flag === "lower" && entry.value > alpha) alpha = entry.value;
        if (entry.flag === "upper" && entry.value < beta) beta = entry.value;
      }
    }
  }

  const moves = legalMoves(board, turn);
  let best;
  if (moves.length === 0) {
    // 合法手なし = パス（手番交代のみ、盤面は不変の特殊節点）
    best = neg(solveNode(board, opponent(turn), -beta, -alpha, toggles, stats, memoMap));
  } else {
    best = -Infinity;
    for (const m of moves) {
      const child = applyMove(board, turn, m);
      const v = neg(solveNode(child, opponent(turn), -beta, -alpha, toggles, stats, memoMap));
      if (v > best) best = v;
      if (toggles.alphaBeta) {
        if (best > alpha) alpha = best;
        if (alpha >= beta) {
          stats.cuts++;
          break;
        }
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
 * 現局面の全合法手を完全解析する（ルートは常に全探索 = 評価オーバレイ用に全手の値を確定）。
 * 合法手が0（root がパスのみ）の場合は手番交代した局面の値を反転して root 値とする。
 * @param {string} board
 * @param {'B'|'W'} turn
 * @param {SolveToggles} [toggles]
 * @returns {{
 *   mover: 'B'|'W',
 *   rootValue: number,
 *   moves: { index: number, value: number }[],
 *   stats: SolveStats,
 *   toggles: Required<SolveToggles>,
 *   passOnly: boolean,
 *   terminal: boolean,
 * }}
 */
export function analyzeMoves(board, turn, toggles = {}) {
  const t = normalizeToggles(toggles);
  const stats = createStats();
  const memoMap = t.memo ? new Map() : null;

  if (isTerminal(board)) {
    return {
      mover: turn,
      rootValue: terminalValue(board, turn),
      moves: [],
      stats,
      toggles: t,
      passOnly: false,
      terminal: true,
    };
  }

  const moves = legalMoves(board, turn);
  if (moves.length === 0) {
    const rootValue = neg(
      solveNode(board, opponent(turn), -Infinity, Infinity, t, stats, memoMap)
    );
    return { mover: turn, rootValue, moves: [], stats, toggles: t, passOnly: true, terminal: false };
  }

  const moveResults = moves.map((m) => {
    const child = applyMove(board, turn, m);
    const value = neg(solveNode(child, opponent(turn), -Infinity, Infinity, t, stats, memoMap));
    return { index: m, value };
  });
  const rootValue = Math.max(...moveResults.map((mv) => mv.value));
  return {
    mover: turn,
    rootValue,
    moves: moveResults,
    stats,
    toggles: t,
    passOnly: false,
    terminal: false,
  };
}

/** 8トグル構成（2^3）を総当たりし、visited/memoHits/cuts を比較する */
export function compareToggleConfigs(board, turn) {
  /** @type {{ toggles: Required<SolveToggles>, label: string, rootValue: number, stats: SolveStats }[]} */
  const rows = [];
  for (let mask = 0; mask < 8; mask++) {
    const toggles = {
      alphaBeta: !!(mask & 1),
      memo: !!(mask & 2),
      symmetry: !!(mask & 4),
    };
    const result = analyzeMoves(board, turn, toggles);
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
  parts.push(t.memo ? "転置表:ON" : "転置表:OFF");
  parts.push(t.symmetry ? "対称:ON" : "対称:OFF");
  return parts.join(" / ");
}

/**
 * 3段計測（正本 §6.3 指定・SPEC §4）: ①生の生成局面数 ②転置表による再訪除去後
 * ③対称正規化後。α-β は現在の UI トグルに従い3列とも共通で適用する
 * （α-β は別軸として8構成比較で確認する）。
 * @param {string} board
 * @param {'B'|'W'} turn
 * @param {SolveToggles} [baseToggles]
 */
export function analyzeThreeStage(board, turn, baseToggles = {}) {
  const ab = !!baseToggles.alphaBeta;
  const raw = analyzeMoves(board, turn, { alphaBeta: ab, memo: false, symmetry: false });
  const tt = analyzeMoves(board, turn, { alphaBeta: ab, memo: true, symmetry: false });
  const sym = analyzeMoves(board, turn, { alphaBeta: ab, memo: true, symmetry: true });
  return { raw, tt, sym };
}

/* ---- チャンク実行用ジェネレータ（UI を固めずに解析する） ---- */

/** 何 visited ごとに制御を返すか（測定に基づき調整。SPEC §11 参照） */
export const YIELD_EVERY = 400;

/**
 * solveNode のジェネレータ版。ロジックは solveNode と同一で、
 * 一定訪問数ごとに `yield` して呼び出し側（runChunked）に制御を返す。
 * @param {string} board
 * @param {'B'|'W'} turn
 * @param {number} alpha
 * @param {number} beta
 * @param {Required<SolveToggles>} toggles
 * @param {SolveStats} stats
 * @param {Map<string, { value: number, flag: 'exact'|'lower'|'upper' }> | null} memoMap
 * @returns {Generator<void, number, void>}
 */
export function* solveNodeGen(board, turn, alpha, beta, toggles, stats, memoMap) {
  stats.visited++;
  if (stats.visited % YIELD_EVERY === 0) yield;

  if (isTerminal(board)) {
    return terminalValue(board, turn);
  }

  const alphaOrig = alpha;
  let key = null;
  if (toggles.memo && memoMap) {
    key = toggles.symmetry ? canonicalKey(board, turn) : encode(board, turn);
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
      if (toggles.alphaBeta) {
        if (entry.flag === "lower" && entry.value > alpha) alpha = entry.value;
        if (entry.flag === "upper" && entry.value < beta) beta = entry.value;
      }
    }
  }

  const moves = legalMoves(board, turn);
  let best;
  if (moves.length === 0) {
    best = neg(
      yield* solveNodeGen(board, opponent(turn), -beta, -alpha, toggles, stats, memoMap)
    );
  } else {
    best = -Infinity;
    for (const m of moves) {
      const child = applyMove(board, turn, m);
      const v = neg(
        yield* solveNodeGen(child, opponent(turn), -beta, -alpha, toggles, stats, memoMap)
      );
      if (v > best) best = v;
      if (toggles.alphaBeta) {
        if (best > alpha) alpha = best;
        if (alpha >= beta) {
          stats.cuts++;
          break;
        }
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
 * analyzeMoves のジェネレータ版。`runChunked` で駆動する。
 * @param {string} board
 * @param {'B'|'W'} turn
 * @param {SolveToggles} [toggles]
 * @returns {Generator<void, ReturnType<typeof analyzeMoves>, void>}
 */
export function* analyzeMovesGen(board, turn, toggles = {}, externalStats = null) {
  const t = normalizeToggles(toggles);
  const stats = externalStats || createStats();
  const memoMap = t.memo ? new Map() : null;

  if (isTerminal(board)) {
    return {
      mover: turn,
      rootValue: terminalValue(board, turn),
      moves: [],
      stats,
      toggles: t,
      passOnly: false,
      terminal: true,
    };
  }

  const moves = legalMoves(board, turn);
  if (moves.length === 0) {
    const rootValue = neg(
      yield* solveNodeGen(board, opponent(turn), -Infinity, Infinity, t, stats, memoMap)
    );
    return { mover: turn, rootValue, moves: [], stats, toggles: t, passOnly: true, terminal: false };
  }

  const moveResults = [];
  for (const m of moves) {
    const child = applyMove(board, turn, m);
    const value = neg(
      yield* solveNodeGen(child, opponent(turn), -Infinity, Infinity, t, stats, memoMap)
    );
    moveResults.push({ index: m, value });
  }
  const rootValue = Math.max(...moveResults.map((mv) => mv.value));
  return {
    mover: turn,
    rootValue,
    moves: moveResults,
    stats,
    toggles: t,
    passOnly: false,
    terminal: false,
  };
}

/**
 * 3段計測のチャンク版。①生 ②転置表 ③転置表+対称 を順番にチャンク実行する。
 * @param {string} board
 * @param {'B'|'W'} turn
 * @param {SolveToggles} [baseToggles]
 * @returns {Generator<{ stage: 'raw'|'tt'|'sym' }, { raw: ReturnType<typeof analyzeMoves>, tt: ReturnType<typeof analyzeMoves>, sym: ReturnType<typeof analyzeMoves> }, void>}
 */
export function* analyzeThreeStageGen(board, turn, baseToggles = {}) {
  const ab = !!baseToggles.alphaBeta;
  const raw = yield* analyzeMovesGen(board, turn, { alphaBeta: ab, memo: false, symmetry: false });
  yield { stage: "raw" };
  const tt = yield* analyzeMovesGen(board, turn, { alphaBeta: ab, memo: true, symmetry: false });
  yield { stage: "tt" };
  const sym = yield* analyzeMovesGen(board, turn, { alphaBeta: ab, memo: true, symmetry: true });
  yield { stage: "sym" };
  return { raw, tt, sym };
}

/**
 * 8構成比較のチャンク版。
 * @param {string} board
 * @param {'B'|'W'} turn
 * @returns {Generator<{ rows: { toggles: Required<SolveToggles>, label: string, rootValue: number, stats: SolveStats }[] }, { toggles: Required<SolveToggles>, label: string, rootValue: number, stats: SolveStats }[], void>}
 */
export function* compareToggleConfigsGen(board, turn) {
  const rows = [];
  for (let mask = 0; mask < 8; mask++) {
    const toggles = {
      alphaBeta: !!(mask & 1),
      memo: !!(mask & 2),
      symmetry: !!(mask & 4),
    };
    const result = yield* analyzeMovesGen(board, turn, toggles);
    rows.push({
      toggles,
      label: toggleLabel(toggles),
      rootValue: result.rootValue,
      stats: result.stats,
    });
    yield { rows: rows.slice() };
  }
  return rows;
}

/** 盤面を4行のミニ文字列にする（表示用） */
export function miniBoardText(board) {
  const row = (r) =>
    board
      .slice(r * SIZE, r * SIZE + SIZE)
      .split("")
      .join(" ");
  return Array.from({ length: SIZE }, (_, r) => row(r)).join(" / ");
}

/**
 * 手番解決: 合法手がない側は自動でパスする。両者ともなければ何もしない
 * （呼び出し側で isTerminal を確認する）。
 * @param {string} board
 * @param {'B'|'W'} turn
 * @returns {'B'|'W'} 実際に着手すべき手番
 */
export function resolveTurn(board, turn) {
  let t = turn;
  let guard = 0;
  while (legalMoves(board, t).length === 0 && !isTerminal(board) && guard < 4) {
    t = opponent(t);
    guard++;
  }
  return t;
}

/* ============================================================
 * ブラウザ UI（DOM 依存。IS_BROWSER ガード内のみ）
 * ============================================================ */

if (IS_BROWSER) {
  runBrowserUi();
}

function runBrowserUi() {
  mountTopicShellFromDataset();

  const boardEl = document.getElementById("oth-board");
  const dsPanels = document.getElementById("ds-panels");
  const presetEl = /** @type {HTMLSelectElement | null} */ (
    document.getElementById("preset")
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
  const btnCpu = document.getElementById("btn-cpu");
  const passBannerEl = document.getElementById("pass-banner");
  const scoreRowEl = document.getElementById("score-row");
  const stagePanelEl = document.getElementById("stage-panel");
  const symDetails = document.getElementById("sym-details");
  const symPanel = document.getElementById("sym-panel");
  const encodeViewEl = document.getElementById("encode-view");
  const progressEl = document.getElementById("oth-progress");
  const csharpSample = document.getElementById("csharp-sample");

  const setStatus = createStatus(document.getElementById("status"));
  const resultPanel = createResultPanel(document.getElementById("result-compare"));

  let board = INITIAL_BOARD;
  let turn = INITIAL_TURN;
  let lastFlips = /** @type {number[]} */ ([]);
  let passMessage = "";
  /** @type {ReturnType<typeof analyzeMoves> | null} */
  let lastAnalysis = null;
  /** @type {{ raw: ReturnType<typeof analyzeMoves>, tt: ReturnType<typeof analyzeMoves>, sym: ReturnType<typeof analyzeMoves> } | null} */
  let lastThreeStage = null;
  /** @type {{ cancel: () => void } | null} */
  let currentTask = null;
  /** @type {{ cancel: () => void } | null} */
  let threeStageTask = null;
  let busy = false;

  function currentToggles() {
    return {
      alphaBeta: !!toggleAbEl?.checked,
      memo: !!toggleMemoEl?.checked,
      symmetry: !!toggleSymEl?.checked,
    };
  }

  function valueLabel(v) {
    if (v > 0) return `勝ち(+${v})`;
    if (v < 0) return `負け(${v})`;
    return "引き分け(0)";
  }

  function valueClass(v) {
    if (v > 0) return "is-win";
    if (v < 0) return "is-loss";
    return "is-draw";
  }

  function pieceLabel(p) {
    return p === "B" ? "黒" : p === "W" ? "白" : "";
  }

  function stopTask() {
    if (currentTask) {
      currentTask.cancel();
      currentTask = null;
    }
    if (threeStageTask) {
      threeStageTask.cancel();
      threeStageTask = null;
    }
    busy = false;
  }

  /** 合法手がない側を自動でパスさせ、パスが起きたかを記録する */
  function settleTurn() {
    passMessage = "";
    if (isTerminal(board)) return;
    if (legalMoves(board, turn).length > 0) return;
    const passer = turn;
    turn = opponent(turn);
    passMessage = `${pieceLabel(passer)}に合法手なし → パス（次は${pieceLabel(turn)}）`;
  }

  function loadPreset(id) {
    stopTask();
    const preset = getPreset(id);
    board = preset.board;
    turn = preset.turn;
    lastFlips = [];
    lastAnalysis = null;
    lastThreeStage = null;
    settleTurn();
    resultPanel.hide();
    setStatus(`プリセット「${preset.label}」を読み込み — ${preset.blurb}`);
    renderAll();
  }

  function resetBoard() {
    loadPreset(presetEl?.value || DEFAULT_PRESET_ID);
  }

  function performMove(index) {
    if (busy) return;
    if (isTerminal(board)) return;
    if (!legalMoves(board, turn).includes(index)) return;
    const flips = flipsForMove(board, turn, index);
    const mover = turn;
    board = applyMove(board, turn, index);
    lastFlips = flips;
    turn = opponent(turn);
    lastAnalysis = null;
    lastThreeStage = null;
    settleTurn();
    if (isTerminal(board)) {
      const b = countPiece(board, "B");
      const w = countPiece(board, "W");
      const result = b === w ? "引き分け" : b > w ? "黒の勝ち" : "白の勝ち";
      setStatus(
        `${pieceLabel(mover)}が着手 → 終局: ${result}（黒${b} - 白${w}）`
      );
    } else {
      setStatus(
        `${pieceLabel(mover)}が着手（反転${flips.length}石）${passMessage ? " / " + passMessage : ""}`
      );
    }
    renderAll();
  }

  function cellClick(i) {
    performMove(i);
  }

  function cpuMove() {
    if (busy) return;
    if (isTerminal(board)) return;
    const moves = legalMoves(board, turn);
    if (moves.length === 0) return; // settleTurn が処理するはずだが念のため
    const result = analyzeMoves(board, turn, { alphaBeta: true, memo: true, symmetry: true });
    let best = result.moves[0];
    for (const mv of result.moves) if (mv.value > best.value) best = mv;
    performMove(best.index);
  }

  function analyzeCurrent() {
    stopTask();
    if (isTerminal(board)) {
      setStatus("終局局面です。プリセットを読み込み直してください。");
      return;
    }
    const toggles = currentToggles();
    busy = true;
    let chunkCount = 0;
    const stats = createStats();
    setStatus("解析中…");
    if (progressEl) progressEl.textContent = "解析中…";
    currentTask = runChunked(analyzeMovesGen(board, turn, toggles, stats), {
      chunkMs: 16,
      onProgress: () => {
        chunkCount++;
        if (progressEl) {
          progressEl.textContent = `解析中…（チャンク${chunkCount} / 訪問局面 ${stats.visited}）`;
        }
      },
      onDone: (result) => {
        lastAnalysis = result;
        if (progressEl) progressEl.textContent = "";
        setStatus(
          `解析完了 — 手番${pieceLabel(result.mover)} / 根の値: ${valueLabel(result.rootValue)}` +
            ` / 訪問局面 ${result.stats.visited} / 転置表ヒット ${result.stats.memoHits} / カット ${result.stats.cuts}`
        );
        renderAll();
        runThreeStage(toggles);
      },
    });
    renderAll();
  }

  function runThreeStage(toggles) {
    if (threeStageTask) {
      threeStageTask.cancel();
      threeStageTask = null;
    }
    busy = true;
    let chunkCount = 0;
    threeStageTask = runChunked(analyzeThreeStageGen(board, turn, toggles), {
      chunkMs: 16,
      onProgress: (y) => {
        chunkCount++;
        if (progressEl) {
          const stageNote = y && y.stage ? `（${y.stage} 完了）` : "";
          progressEl.textContent = `3段計測 実行中…（チャンク${chunkCount}）${stageNote}`;
        }
      },
      onDone: (result) => {
        lastThreeStage = result;
        busy = false;
        threeStageTask = null;
        if (progressEl) progressEl.textContent = "";
        renderStagePanel();
      },
    });
  }

  function compareConfigs() {
    stopTask();
    if (isTerminal(board)) {
      setStatus("⚠ 比較には非終局の局面が必要です");
      return;
    }
    busy = true;
    let chunkCount = 0;
    setStatus("8構成比較を実行中…");
    currentTask = runChunked(compareToggleConfigsGen(board, turn), {
      chunkMs: 16,
      onProgress: (y) => {
        chunkCount++;
        if (progressEl) {
          progressEl.textContent = `8構成比較 実行中…（チャンク${chunkCount} / ${y?.rows?.length ?? 0}/8 構成完了）`;
        }
      },
      onDone: (rows) => {
        busy = false;
        currentTask = null;
        if (progressEl) progressEl.textContent = "";
        const values = new Set(rows.map((r) => r.rootValue));
        const consistent = values.size === 1;
        const sorted = [...rows].sort((a, b) => b.stats.visited - a.stats.visited);
        const max = sorted[0].stats.visited;
        const min = sorted[sorted.length - 1].stats.visited;
        const tableRows = rows
          .map(
            (r) => `<tr>
              <td>${r.label}</td>
              <td>${valueLabel(r.rootValue)}</td>
              <td>${r.stats.visited}</td>
              <td>${r.stats.memoHits}</td>
              <td>${r.stats.cuts}</td>
            </tr>`
          )
          .join("");
        resultPanel.show(`
          <h3>トグル8構成の比較（訪問局面数）</h3>
          <div class="ds-table-scroll">
            <table class="oth-compare-table">
              <thead>
                <tr><th>構成</th><th>根の値</th><th>訪問局面</th><th>転置表ヒット</th><th>カット</th></tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
          </div>
          <p class="result-verdict">
            全構成で根の値は${consistent ? "一致" : "不一致（要確認）"}しました。
            素の全探索（訪問 ${max}）に対し、α-β・転置表・対称性除去を足すほど訪問局面数が減り、
            全部 ON（訪問 ${min}）が最小になります。
          </p>
          <p class="result-note">全 8 構成 = α-β × 転置表 × 対称性除去の ON/OFF。設定: <code>js/maps/othello-4x4-config.js</code></p>
        `);
        setStatus(`8構成比較 — 訪問局面数 ${min}〜${max}（全構成で根の値 ${consistent ? "一致" : "不一致"}）`);
      },
    });
    renderAll();
  }

  /* ---- 描画 ---- */

  function renderBoard() {
    if (!boardEl) return;
    const terminal = isTerminal(board);
    const legal = terminal || busy ? [] : legalMoves(board, turn);
    const legalSet = new Set(legal);
    const flipSet = new Set(lastFlips);
    const overlay = new Map();
    if (lastAnalysis) {
      for (const mv of lastAnalysis.moves) overlay.set(mv.index, mv.value);
    }
    const bestVal = lastAnalysis && lastAnalysis.moves.length
      ? Math.max(...lastAnalysis.moves.map((m) => m.value))
      : null;

    const cells = [];
    for (let i = 0; i < CELLS; i++) {
      const p = board[i];
      const classes = ["oth-cell"];
      if (legalSet.has(i)) classes.push("is-legal");
      if (flipSet.has(i)) classes.push("is-flipped");
      let overlayHtml = "";
      if (p === "." && overlay.has(i)) {
        const v = overlay.get(i);
        classes.push(valueClass(v));
        if (v === bestVal) classes.push("is-best");
        overlayHtml = `<span class="oth-eval">${v > 0 ? "+" + v : v}</span>`;
      }
      cells.push(
        `<button type="button" class="${classes.join(" ")}" data-cell="${i}" aria-label="マス ${i}">
          <span class="oth-piece ${p === "." ? "oth-piece-empty" : "oth-piece-" + p}"></span>
          ${overlayHtml}
        </button>`
      );
    }
    boardEl.innerHTML = `<div class="oth-grid">${cells.join("")}</div>`;
    boardEl.querySelectorAll("[data-cell]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.getAttribute("data-cell"));
        cellClick(i);
      });
    });
  }

  function renderPassBanner() {
    if (!passBannerEl) return;
    if (passMessage) {
      passBannerEl.textContent = `⚠ ${passMessage}`;
      passBannerEl.hidden = false;
    } else {
      passBannerEl.hidden = true;
      passBannerEl.textContent = "";
    }
  }

  function renderScoreRow() {
    if (!scoreRowEl) return;
    const b = countPiece(board, "B");
    const w = countPiece(board, "W");
    const terminal = isTerminal(board);
    const turnNote = terminal ? "終局" : `手番: ${pieceLabel(turn)}`;
    scoreRowEl.innerHTML = `<span>黒 <strong>${b}</strong></span><span>白 <strong>${w}</strong></span><span>${turnNote}</span>`;
  }

  function renderEncodeView() {
    if (!encodeViewEl) return;
    const enc = encode(board, turn);
    const canon = isTerminal(board) ? enc : canonicalKey(board, turn);
    encodeViewEl.innerHTML = `符号化（手番込み）: <strong>${enc}</strong><br>対称除去の代表値（canonical）: <strong>${canon}</strong>`;
  }

  function renderStagePanel() {
    if (!stagePanelEl) return;
    if (!lastThreeStage) {
      stagePanelEl.innerHTML = `<p class="result-note">「解析」を実行すると、生の生成局面数 / 転置表後 / 対称除去後 の3段比較がここに表示されます。</p>`;
      return;
    }
    const { raw, tt, sym } = lastThreeStage;
    const cards = [
      { title: "①生の生成局面数", stats: raw.stats, note: "転置表・対称除去なし" },
      { title: "②転置表による再訪除去後", stats: tt.stats, note: `転置表ヒット ${tt.stats.memoHits}` },
      { title: "③対称正規化後", stats: sym.stats, note: `転置表ヒット ${sym.stats.memoHits}` },
    ];
    stagePanelEl.innerHTML = `
      <div class="oth-stage-row">
        ${cards
          .map(
            (c) => `<div class="oth-stage-card">
              <h4>${c.title}</h4>
              <div class="oth-stage-value">${c.stats.visited}</div>
              <div class="oth-stage-note">${c.note}</div>
            </div>`
          )
          .join("")}
      </div>
      <p class="result-note">根の値: ${valueLabel(raw.rootValue)}（3列とも一致${
        raw.rootValue === tt.rootValue && tt.rootValue === sym.rootValue ? "" : "していません⚠"
      }）。α-β は現在のトグル設定（${currentToggles().alphaBeta ? "ON" : "OFF"}）を3列共通で適用しています。</p>
    `;
  }

  function renderSymmetryPanel() {
    if (!symPanel) return;
    const transforms = allTransforms(board, turn);
    const html = transforms
      .map((t) => {
        const rows = Array.from({ length: SIZE }, (_, r) =>
          `<div class="oth-mini-row">${t.board
            .slice(r * SIZE, r * SIZE + SIZE)
            .split("")
            .map(
              (c) =>
                `<span class="oth-mini-cell">${c === "." ? "" : `<span class="oth-mini-piece is-${c}"></span>`}</span>`
            )
            .join("")}</div>`
        ).join("");
        return `<div class="oth-sym-item${t.isCanonical ? " is-canonical" : ""}">
          <div class="oth-mini-board">${rows}</div>
          <div class="oth-sym-caption">k=${t.k}${t.isCanonical ? " ★代表" : ""}</div>
        </div>`;
      })
      .join("");
    symPanel.innerHTML = html;
  }

  function renderMeasurePanel() {
    if (!dsPanels) return;
    const items = [];
    if (lastAnalysis) {
      items.push(`手番: ${pieceLabel(lastAnalysis.mover)}`);
      items.push(`根の値: ${valueLabel(lastAnalysis.rootValue)}`);
      items.push(`訪問局面: ${lastAnalysis.stats.visited}`);
      items.push(`転置表ヒット: ${lastAnalysis.stats.memoHits}`);
      items.push(`カット: ${lastAnalysis.stats.cuts}`);
      items.push(`トグル: ${toggleLabel(lastAnalysis.toggles)}`);
    } else {
      items.push("（「解析」で現在のトグル構成を計測）");
    }
    setPanel(
      dsPanels,
      renderSet({ label: "現在の計測（選択トグル）", typeNote: "visited/memoHits/cuts", items })
    );
  }

  function renderAll() {
    renderBoard();
    renderPassBanner();
    renderScoreRow();
    renderEncodeView();
    renderStagePanel();
    renderSymmetryPanel();
    renderMeasurePanel();
  }

  /* ---- イベント ---- */

  presetEl?.addEventListener("change", () => loadPreset(presetEl.value));
  btnReset?.addEventListener("click", () => resetBoard());
  btnAnalyze?.addEventListener("click", () => analyzeCurrent());
  btnCompare?.addEventListener("click", () => compareConfigs());
  btnCpu?.addEventListener("click", () => cpuMove());
  [toggleAbEl, toggleMemoEl, toggleSymEl].forEach((el) => {
    el?.addEventListener("change", () => {
      lastAnalysis = null;
      lastThreeStage = null;
      renderAll();
    });
  });
  symDetails?.addEventListener("toggle", () => {
    if (symDetails.open) renderSymmetryPanel();
  });

  if (presetEl) {
    presetEl.innerHTML = presetList()
      .map((p) => `<option value="${p.id}">${p.label}</option>`)
      .join("");
    presetEl.value = DEFAULT_PRESET_ID;
  }
  if (toggleAbEl) toggleAbEl.checked = true;
  if (toggleMemoEl) toggleMemoEl.checked = true;
  if (toggleSymEl) toggleSymEl.checked = false;

  resetBoard();
  loadTextSample(
    "../samples/Othello4x4Example.cs",
    csharpSample,
    "// samples/Othello4x4Example.cs を読み込めませんでした。"
  );
}
