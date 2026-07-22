/**
 * ゲームループデモ設定
 * @see docs/topics/game-loop/SPEC.md
 */

export const GAME_LOOP_CONFIG = {
  /** 固定ステップの既定 (ms) — 60Hz 相当 */
  defaultFixedDtMs: 1000 / 60,
  minFixedDtMs: 1000 / 120,
  maxFixedDtMs: 1000 / 30,
  /** 1 フレーム内の最大 fixed 更新回数 */
  defaultMaxSteps: 8,
  minMaxSteps: 1,
  maxMaxSteps: 16,
  /** 人工遅延 (ms) で重いフレームを模擬 */
  defaultLagMs: 0,
  maxLagMs: 80,
  /** 物理: 重力・床 */
  gravity: 900,
  floorY: 1,
  restitution: 0.72,
  ballRadius: 0.045,
  /** キャンバス論理サイズ（正規化座標 0..1 × 0..1.2） */
  worldWidth: 1,
  worldHeight: 1.15,
  logMax: 48,
};
