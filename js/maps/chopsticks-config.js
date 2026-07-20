/**
 * 割り箸のバリアント定義・プリセット局面集
 *
 * 局面は { mover: [a,b], opp: [c,d] }（a<=b, c<=d、0〜4の指の本数、mover=手番側）。
 * 数値は `js/chopsticks.js` の後退解析を実データで走らせて確認済み
 * （文献値ではなく本リポジトリの実装での自前計算値。検証手順は
 * docs/topics/chopsticks/SPEC.md §11 と HANDOFF.md を参照）。
 *
 * 編集後はブラウザ再読み込み。
 */

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   mover: [number, number],
 *   opp: [number, number],
 *   blurb: string,
 * }} ChopsticksPreset
 */

/** @type {Record<string, ChopsticksPreset>} */
export const CHOPSTICKS_PRESETS = {
  initial: {
    id: "initial",
    label: "初期局面 (1,1)-(1,1)",
    mover: [1, 1],
    opp: [1, 1],
    blurb:
      "標準の開始局面。両者とも両手1本ずつ。バリアントを切り替えて結論の違いを比較する定番の出発点（学習目標3）。",
  },
  "loop-example": {
    id: "loop-example",
    label: "ループの実例（分割ありで確認）",
    mover: [1, 3],
    opp: [2, 2],
    blurb:
      "分割ありバリアントで実際に「引き分け（ループ）」に分類される局面の一例。" +
      "分割なしだと同じ局面でも勝敗が確定することがあり、分割の有無が結論を変える例として使う（学習目標3）。",
  },
  endgame: {
    id: "endgame",
    label: "即詰み終盤（波0〜1向け）",
    mover: [0, 1],
    opp: [0, 4],
    blurb:
      "手番側が1本の手で相手の4本の手を叩くと 4+1=5 で相手の両手が死に、即座に手番側の勝ちが確定する" +
      "（実装で検証済み: 標準バリアントで WIN・波1）。" +
      "後退解析の波0（終局）→波1（1手勝ち）を最短で読める局面。",
  },
};

/** @type {string} */
export const DEFAULT_PRESET_ID = "initial";

/** @typedef {{ split: boolean, deathRule: 'geq5'|'exact5', mod5: boolean }} ChopsticksVariant */

/** @type {ChopsticksVariant} */
export const DEFAULT_VARIANT = { split: false, deathRule: "geq5", mod5: false };

/**
 * @param {string} [id]
 * @returns {ChopsticksPreset}
 */
export function getPreset(id) {
  return CHOPSTICKS_PRESETS[id ?? ""] ?? CHOPSTICKS_PRESETS[DEFAULT_PRESET_ID];
}

/** @returns {ChopsticksPreset[]} */
export function presetList() {
  return Object.values(CHOPSTICKS_PRESETS);
}
