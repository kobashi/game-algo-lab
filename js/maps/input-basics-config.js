/**
 * 入力の基礎デモ設定
 * @see docs/topics/input-basics/SPEC.md
 */

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   keys: string[],
 *   hint: string,
 * }} InputActionDef
 */

/** @type {InputActionDef[]} */
export const INPUT_ACTIONS = [
  {
    id: "jump",
    label: "Jump",
    keys: ["Space", " "],
    hint: "Space — down エッジのみで +1（押し続けても 1 回）",
  },
  {
    id: "fire",
    label: "Fire",
    keys: ["KeyZ", "z", "Z"],
    hint: "Z — held の間毎フレーム連射（悪い例・対比用）",
  },
  {
    id: "charge",
    label: "Charge",
    keys: ["KeyX", "x", "X"],
    hint: "X — 長押し閾値でチャージ完了 1 回",
  },
  {
    id: "move",
    label: "Move",
    keys: ["ArrowRight", "ArrowLeft"],
    hint: "←→ — held で移動（押し続けてよい例）",
  },
];

export const INPUT_BASICS_CONFIG = {
  defaultLongPressMs: 400,
  minLongPressMs: 100,
  maxLongPressMs: 1500,
  logMax: 36,
  moveSpeed: 0.45,
};
