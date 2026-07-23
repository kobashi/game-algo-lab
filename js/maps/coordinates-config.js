/**
 * 座標変換デモ設定
 * @see docs/topics/coordinates/SPEC.md
 */

export const COORD_CONFIG = {
  /** ワールド論理サイズ（単位） */
  worldHalf: 5,
  defaultParent: { x: 0, y: 0, angleDeg: 25 },
  defaultLocal: { x: 1.2, y: 0.4 },
  defaultCamera: { x: 0, y: 0, zoom: 40 },
  minZoom: 16,
  maxZoom: 80,
};
