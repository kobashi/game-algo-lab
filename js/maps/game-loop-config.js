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
  /** 物理: 重力・床（座標は 0..1.15 に正規化。900 だと1回の落下が 50 ms で目で追えなかった） */
  gravity: 8,
  floorY: 1,
  restitution: 0.72,
  ballRadius: 0.045,
  /** これより遅い跳ね返りは床で止まったとみなす（正規化座標/秒） */
  restVelocity: 0.3,
  /** 描画1回あたりの基本の実時間 (ms)。人工遅延はこれに足す */
  frameMs: 1000 / 60,
  /** 「ときどき重い」で遅延をかける間隔（フレーム数） */
  spikeEvery: 5,
  /** 1回の実行で見せるシミュレーション時間 (ms)。横軸の幅 */
  windowMs: 3000,
  /** 正解の軌道を計算する刻み (ms) */
  refDtMs: 1,
  /** キャンバス論理サイズ（正規化座標 0..1 × 0..1.2） */
  worldWidth: 1,
  worldHeight: 1.15,
  logMax: 48,
};
