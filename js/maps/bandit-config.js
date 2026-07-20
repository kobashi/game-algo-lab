/**
 * 多腕バンディットの腕設定
 *
 * 各腕はベルヌーイ（確率 mean で報酬 1、否则 0）。
 *
 * 2プリセット:
 *   easy … 最適腕 D(μ=0.80) と次点(0.55)の差が 0.25 と大きく、
 *          ε-greedy でも早期に収束してしまう（旧来の既定）
 *   hard … 上位腕が 0.45〜0.60 に接近し、探索/活用のジレンマが
 *          既定 100 手では乱数次第で逆転しうるほど強く出る
 *
 * 編集後はブラウザ再読み込み。
 */

/**
 * @typedef {{ id: string, label: string, mean: number }} BanditArm
 * @typedef {{ label: string, arms: BanditArm[] }} BanditPreset
 */

/** @type {Record<string, BanditPreset>} */
export const BANDIT_PRESETS = {
  easy: {
    label: "易しい（差が大きい）",
    arms: [
      { id: "A", label: "腕 A", mean: 0.25 },
      { id: "B", label: "腕 B", mean: 0.4 },
      { id: "C", label: "腕 C", mean: 0.55 },
      { id: "D", label: "腕 D", mean: 0.8 },
      { id: "E", label: "腕 E", mean: 0.5 },
    ],
  },
  hard: {
    label: "難しい（接近）",
    arms: [
      { id: "A", label: "腕 A", mean: 0.4 },
      { id: "B", label: "腕 B", mean: 0.5 },
      { id: "C", label: "腕 C", mean: 0.55 },
      { id: "D", label: "腕 D", mean: 0.6 },
      { id: "E", label: "腕 E", mean: 0.45 },
    ],
  },
};

/** @type {string} */
export const DEFAULT_PRESET = "easy";

/**
 * @type {{
 *   arms: BanditArm[],
 *   defaultEpsilon: number,
 *   defaultSteps: number,
 *   defaultSeed: number,
 *   defaultPreset: string
 * }}
 */
export const BANDIT_CONFIG = {
  arms: BANDIT_PRESETS[DEFAULT_PRESET].arms,
  defaultEpsilon: 0.15,
  defaultSteps: 300,
  defaultSeed: 7,
  defaultPreset: DEFAULT_PRESET,
};

/**
 * @param {string} [presetId]
 * @returns {BanditArm[]}
 */
export function getPresetArms(presetId) {
  return (BANDIT_PRESETS[presetId ?? ""] ?? BANDIT_PRESETS[DEFAULT_PRESET]).arms;
}

/**
 * @param {BanditArm[]} arms
 */
export function bestMean(arms) {
  return Math.max(...arms.map((a) => a.mean));
}

/**
 * @param {BanditArm[]} arms
 */
export function bestArmIndex(arms) {
  let bi = 0;
  for (let i = 1; i < arms.length; i++) {
    if (arms[i].mean > arms[bi].mean) bi = i;
  }
  return bi;
}
