/**
 * ニムの初期データ（1山パラメータ既定値・複数山プリセット）
 *
 * 数値は `js/nim.js` の solver（solveSingle / singleTheory / solveMulti / nimSum）を
 * 実データで走らせて確認済み（文献値ではなく本リポジトリの実装での自前計算値。
 * 検証手順は docs/topics/nim/SPEC.md §11 と HANDOFF.md を参照）。
 *
 * 編集後はブラウザ再読み込み。
 */

/** @typedef {{ N: number, k: number }} SinglePileParams */

/** モード1（1山）の既定値（SPEC §3: N=21, k=3） */
/** @type {SinglePileParams} */
export const DEFAULT_SINGLE_PARAMS = { N: 21, k: 3 };

export const SINGLE_N_MIN = 5;
export const SINGLE_N_MAX = 40;
export const SINGLE_K_MIN = 1;
export const SINGLE_K_MAX = 5;

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   piles: number[],
 *   blurb: string,
 * }} NimMultiPreset
 */

/**
 * 複数山プリセット。nim-sum（各山の XOR）は実装の `nimSum()` で計算し確認済み:
 *
 *   (3,5,7): 3=011, 5=101, 7=111 → XOR = 001 = 1 （非0 → 手番側（先手）勝ち）
 *   (1,2,3): 1=01, 2=10, 3=11    → XOR = 00 = 0 （0   → 手番側（先手）負け）
 *   (2,4,6): 2=010, 4=100, 6=110 → XOR = 000 = 0 （0   → 手番側（先手）負け）
 *
 * (2,4,6) は (1,2,3) の全山を2倍しただけの構成。XOR は「各ビットを1つ左シフト」しても
 * 0 は 0 のまま変わらない（シフトは線形なビットごと演算なので nim-sum の 0/非0 判定は
 * スケールに依存しない）ため、(1,2,3) と同じ「手番側の負け」という結論を保つ好例
 * （「偶数倍しても勝敗理論は変わらない」ことを示す一致確認プリセット）。
 */
/** @type {Record<string, NimMultiPreset>} */
export const MULTI_PRESETS = {
  "3-5-7": {
    id: "3-5-7",
    label: "(3, 5, 7) — nim-sum=1・先手勝ち",
    piles: [3, 5, 7],
    blurb:
      "nim-sum = 3 XOR 5 XOR 7 = 1（非0）。理論解どおり手番側（先手）が勝つ構成（学習目標2の基本形）。",
  },
  "1-2-3": {
    id: "1-2-3",
    label: "(1, 2, 3) — nim-sum=0・先手負け",
    piles: [1, 2, 3],
    blurb:
      "nim-sum = 1 XOR 2 XOR 3 = 0。手番側（先手）がどう取っても負ける構成。(3,5,7) との対照例。",
  },
  "2-4-6": {
    id: "2-4-6",
    label: "(2, 4, 6) — (1,2,3)の2倍・nim-sum=0",
    piles: [2, 4, 6],
    blurb:
      "nim-sum = 2 XOR 4 XOR 6 = 0。(1,2,3) の全山をちょうど2倍しただけだが、XORのビットシフト" +
      "不変性により結論（先手負け）は変わらないことを確認できる一致確認プリセット。",
  },
};

/** @type {string} */
export const DEFAULT_MULTI_PRESET_ID = "3-5-7";

/**
 * @param {string} [id]
 * @returns {NimMultiPreset}
 */
export function getMultiPreset(id) {
  return MULTI_PRESETS[id ?? ""] ?? MULTI_PRESETS[DEFAULT_MULTI_PRESET_ID];
}

/** @returns {NimMultiPreset[]} */
export function multiPresetList() {
  return Object.values(MULTI_PRESETS);
}
