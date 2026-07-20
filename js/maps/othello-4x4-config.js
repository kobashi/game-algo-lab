/**
 * 4×4 オセロのプリセット局面集
 *
 * board は 16 文字（'.' 空き / 'B' 黒 / 'W' 白）の行優先文字列:
 *   0  1  2  3
 *   4  5  6  7
 *   8  9 10 11
 *  12 13 14 15
 *
 * 理論結果（勝敗・石差）は実装の全解析（negamax + 転置表 + 対称除去）と、
 * それとは別コードで書いた素朴な独立実装（メモ化のみ・α-βなし negamax）の
 * 突き合わせで自前計算した値。文献値は参照していない（SPEC §1 学習目標4）。
 * 数値の根拠・独立実装との一致確認は HANDOFF.md「4×4オセロ メモ」を参照。
 *
 * 編集後はブラウザ再読み込み。
 */

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   board: string,
 *   turn: 'B'|'W',
 *   blurb: string,
 * }} OthelloPreset
 */

/** @type {Record<string, OthelloPreset>} */
export const OTHELLO_PRESETS = {
  initial: {
    id: "initial",
    label: "初期局面（黒先手）",
    board: ".....WB..BW.....",
    turn: "B",
    blurb:
      "標準の交差配置。完全解析（自前計算・独立実装で一致確認済み）では" +
      "黒が最善を尽くしても白に8石差で負ける（rootValue=-8）。" +
      "素の全探索（全トグルOFF）でも約22万局面・1秒未満で終わるが（実測は HANDOFF 参照）、" +
      "既定では α-β・転置表 ON にして体験を軽くしてある。",
  },
  midgame: {
    id: "midgame",
    label: "中盤（比較用）",
    board: ".WB..WWW.BBW..BW",
    turn: "B",
    blurb:
      "初期局面から実際の対局（乱択・seed=1）で6手進めた中盤局面。" +
      "完全解析では黒が2石差で勝つ（rootValue=2）。空きマス6個で素の全探索でも" +
      "255局面・十数ミリ秒と軽く、8構成比較や1手ごとの比較にちょうどよい大きさ。",
  },
  endgame: {
    id: "endgame",
    label: "終盤（残りマス少・読み切り観察向け）",
    board: "WWBBBWBW.WWW.WWW",
    turn: "B",
    blurb:
      "同じ乱択対局を10手まで進めた終盤局面（空きマス2個）。" +
      "合法手は2つしかなく、完全解析はごく少数の局面で完了する（黒が8石差で負け、rootValue=-8）。" +
      "評価オーバレイの変化を1手ずつ確認するのに向く。",
  },
};

/** @type {string} */
export const DEFAULT_PRESET_ID = "initial";

export const OTHELLO_CONFIG = {
  defaultPreset: DEFAULT_PRESET_ID,
};

/**
 * @param {string} [id]
 * @returns {OthelloPreset}
 */
export function getPreset(id) {
  return OTHELLO_PRESETS[id ?? ""] ?? OTHELLO_PRESETS[DEFAULT_PRESET_ID];
}

/** @returns {OthelloPreset[]} */
export function presetList() {
  return Object.values(OTHELLO_PRESETS);
}
