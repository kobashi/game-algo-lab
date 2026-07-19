/**
 * 三目並べのプリセット局面集
 *
 * board は 9 文字（'.' 空き / 'X' / 'O'）の行優先文字列:
 *   0 1 2
 *   3 4 5
 *   6 7 8
 *
 * 編集後はブラウザ再読み込み。
 */

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   board: string,
 *   blurb: string,
 *   demoN?: number,
 *   demoSeed?: number,
 * }} TicTacToePreset
 */

/** @type {Record<string, TicTacToePreset>} */
export const TICTACTOE_PRESETS = {
  empty: {
    id: "empty",
    label: "空盤（引き分け証明）",
    board: ".........",
    blurb:
      "初期局面。完全解析で根の値が「引き分け」になることを確認する定番の出発点（学習目標1）。",
  },
  "open-corner": {
    id: "open-corner",
    label: "初手: 隅 (X)",
    board: "X........",
    blurb:
      "X が隅に初手。O が中央以外に応じると X 必勝、中央に応じると引き分けになる理論値を確認する。",
  },
  "open-center": {
    id: "open-center",
    label: "初手: 中央 (X)",
    board: "....X....",
    blurb: "X が中央に初手。隅初手（open-corner）との理論値の違いを比較する。",
  },
  "double-threat": {
    id: "double-threat",
    label: "ダブルリーチ罠",
    board: "XO..O..X.",
    blurb:
      "X の手番。完全解析では手6（左下隅）が唯一の必勝手（他は引き分け）。" +
      "手6は3方向の勝ち筋を同時に作るダブルリーチだが、乱択プレイアウトでの" +
      "「真の勝率」は他の手ほど差が開かないため、低い N（既定 N=30, seed=20）だと" +
      "MC 推定が最善手を外しやすい。N=5000 まで上げると正しい順位に収束する（学習目標3）。",
    demoN: 30,
    demoSeed: 20,
  },
  endgame: {
    id: "endgame",
    label: "終盤（残り4手・ステップ向け）",
    board: "X.X.O.OX.",
    blurb:
      "空きマスが4つだけの終盤局面（O の手番）。1ステップ実行で探索経路" +
      "（コールスタック）を最後まで無理なく追える大きさに絞ってある。" +
      "O の合法手4つのうち引き分けを保てるのは1つだけ。",
  },
};

/** @type {string} */
export const DEFAULT_PRESET_ID = "empty";

export const TICTACTOE_CONFIG = {
  defaultPreset: DEFAULT_PRESET_ID,
  defaultN: 100,
  defaultSeed: 7,
};

/**
 * @param {string} [id]
 * @returns {TicTacToePreset}
 */
export function getPreset(id) {
  return TICTACTOE_PRESETS[id ?? ""] ?? TICTACTOE_PRESETS[DEFAULT_PRESET_ID];
}

/** @returns {TicTacToePreset[]} */
export function presetList() {
  return Object.values(TICTACTOE_PRESETS);
}
