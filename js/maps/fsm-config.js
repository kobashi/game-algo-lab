/**
 * ステートマシン設定（ゲームキャラの行動例）
 *
 * states: 状態 id → 表示名 / 色 / 説明
 * transitions: "from|event" → to
 * demoScript: 自動デモ用イベント列
 *
 * 編集後はブラウザ再読み込み。
 */

/** @typedef {{ id: string, label: string, color: string, blurb: string }} FsmStateDef */

/**
 * @type {{
 *   initial: string,
 *   states: Record<string, FsmStateDef>,
 *   events: { id: string, label: string }[],
 *   transitions: Record<string, string>,
 *   demoScript: string[],
 *   layout: Record<string, { x: number, y: number }>
 * }}
 */
export const FSM_CONFIG = {
  initial: "Idle",
  states: {
    Idle: {
      id: "Idle",
      label: "Idle",
      color: "#5b9fd4",
      blurb: "待機。入力待ち。",
    },
    Walk: {
      id: "Walk",
      label: "Walk",
      color: "#6bcb8f",
      blurb: "移動中。止まると Idle へ。",
    },
    Jump: {
      id: "Jump",
      label: "Jump",
      color: "#a78bfa",
      blurb: "空中。着地で Idle。",
    },
    Attack: {
      id: "Attack",
      label: "Attack",
      color: "#e07a5f",
      blurb: "攻撃モーション中。終了で Idle。",
    },
    Hurt: {
      id: "Hurt",
      label: "Hurt",
      color: "#f2cc8f",
      blurb: "被弾硬直。回復で Idle、致命傷で Dead。",
    },
    Dead: {
      id: "Dead",
      label: "Dead",
      color: "#6a7d94",
      blurb: "戦闘不能。基本的に遷移しない終端。",
    },
  },
  events: [
    { id: "Move", label: "Move" },
    { id: "Stop", label: "Stop" },
    { id: "Jump", label: "Jump" },
    { id: "Land", label: "Land" },
    { id: "Attack", label: "Attack" },
    { id: "AttackEnd", label: "AttackEnd" },
    { id: "Hit", label: "Hit" },
    { id: "Recover", label: "Recover" },
    { id: "Kill", label: "Kill" },
  ],
  /**
   * key = `${from}|${event}` → to
   * 定義にない組み合わせは無視（状態維持）
   */
  transitions: {
    "Idle|Move": "Walk",
    "Idle|Jump": "Jump",
    "Idle|Attack": "Attack",
    "Idle|Hit": "Hurt",
    "Idle|Kill": "Dead",

    "Walk|Stop": "Idle",
    "Walk|Jump": "Jump",
    "Walk|Attack": "Attack",
    "Walk|Hit": "Hurt",
    "Walk|Kill": "Dead",

    "Jump|Land": "Idle",
    "Jump|Hit": "Hurt",
    "Jump|Kill": "Dead",

    "Attack|AttackEnd": "Idle",
    "Attack|Hit": "Hurt",
    "Attack|Kill": "Dead",

    "Hurt|Recover": "Idle",
    "Hurt|Kill": "Dead",
  },
  demoScript: [
    "Move",
    "Jump",
    "Land",
    "Attack",
    "AttackEnd",
    "Move",
    "Hit",
    "Recover",
    "Attack",
    "Kill",
  ],
  /** SVG 上の節点座標（viewBox 0..640 x 0..360） */
  layout: {
    Idle: { x: 120, y: 180 },
    Walk: { x: 320, y: 80 },
    Jump: { x: 520, y: 100 },
    Attack: { x: 320, y: 280 },
    Hurt: { x: 520, y: 260 },
    Dead: { x: 120, y: 300 },
  },
};

export function transitionKey(from, event) {
  return `${from}|${event}`;
}
