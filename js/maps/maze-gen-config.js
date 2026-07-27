/**
 * 迷路生成デモ設定
 * @see docs/topics/maze-gen/SPEC.md
 */

export const MAZE_GEN_CONFIG = {
  defaultAlgo: "backtracker",
  defaultSeed: 42,
  /** セル数（通路セル）。奇数推奨 11..31 */
  defaultCells: 15,
  minCells: 7,
  maxCells: 31,
  /** 描画用セルピクセル（論理） */
  cellPx: 18,
};

export const MAZE_ALGOS = [
  {
    id: "backtracker",
    label: "Recursive Backtracker (DFS)",
    blurb: "深く掘り進み行き止まりで戻る。長い廊下ができやすい。",
  },
  {
    id: "prim",
    label: "Prim 風（frontier）",
    blurb: "訪問済みの縁からランダムに広げる。枝分かれが多くなる傾向。",
  },
];
