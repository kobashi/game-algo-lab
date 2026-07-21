/**
 * MCTS デモ設定（題材は三目並べ。局面プリセットは tic-tac-toe-config を共有）
 * @see docs/topics/mcts/SPEC.md
 */

import {
  DEFAULT_PRESET_ID as TTT_DEFAULT,
  TICTACTOE_PRESETS,
  getPreset as getTttPreset,
  presetList as tttPresetList,
} from "./tic-tac-toe-config.js";

/** 主シナリオ（SPEC: double-threat） */
export const DEFAULT_PRESET_ID = "double-threat";

export const MCTS_CONFIG = {
  defaultPreset: DEFAULT_PRESET_ID,
  /** 反復数 N */
  defaultN: 200,
  minN: 10,
  maxN: 5000,
  stepN: 10,
  /** 探索定数 C（UCB1）。√2 ≈ 1.414 */
  defaultC: 1.414,
  minC: 0.1,
  maxC: 3.0,
  stepC: 0.1,
  /** 乱数シード */
  defaultSeed: 20,
  /** 木 SVG に出す最大ノード数（訪問上位 + 経路優先） */
  treeNodeLimit: 48,
  /** ノード表示の最低訪問数（経路上は常に表示） */
  treeMinVisits: 1,
};

/**
 * デモ用に露出するプリセット id（tic-tac-toe と共有）
 * @type {string[]}
 */
export const MCTS_PRESET_IDS = [
  "double-threat",
  "empty",
  "endgame",
  "open-corner",
  "open-center",
];

/**
 * @param {string} [id]
 */
export function getPreset(id) {
  const key = id && TICTACTOE_PRESETS[id] ? id : DEFAULT_PRESET_ID;
  return getTttPreset(key);
}

/**
 * @returns {import("./tic-tac-toe-config.js").TicTacToePreset[]}
 */
export function presetList() {
  return MCTS_PRESET_IDS.map((id) => TICTACTOE_PRESETS[id]).filter(Boolean);
}

export { TICTACTOE_PRESETS, TTT_DEFAULT, tttPresetList };
