/**
 * 多腕バンディットの腕設定
 *
 * 各腕はベルヌーイ（確率 mean で報酬 1、否则 0）。
 * 最適腕は mean 最大のもの（既定では腕 D = 0.80）。
 *
 * 編集後はブラウザ再読み込み。
 */

/**
 * @type {{
 *   arms: { id: string, label: string, mean: number }[],
 *   defaultEpsilon: number,
 *   defaultSteps: number,
 *   defaultSeed: number
 * }}
 */
export const BANDIT_CONFIG = {
  arms: [
    { id: "A", label: "腕 A", mean: 0.25 },
    { id: "B", label: "腕 B", mean: 0.4 },
    { id: "C", label: "腕 C", mean: 0.55 },
    { id: "D", label: "腕 D", mean: 0.8 },
    { id: "E", label: "腕 E", mean: 0.5 },
  ],
  defaultEpsilon: 0.15,
  defaultSteps: 100,
  defaultSeed: 7,
};

export function bestMean(arms) {
  return Math.max(...arms.map((a) => a.mean));
}

export function bestArmIndex(arms) {
  let bi = 0;
  for (let i = 1; i < arms.length; i++) {
    if (arms[i].mean > arms[bi].mean) bi = i;
  }
  return bi;
}
