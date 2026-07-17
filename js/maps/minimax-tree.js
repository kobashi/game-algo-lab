/**
 * Min-Max 探索の初期木（2 手読みの小さな対戦）
 *
 * kind:
 *   "max"  … 自分（最大化プレーヤ）
 *   "min"  … 相手（最小化プレーヤ）
 *   "leaf" … 終端局面。score が評価値（大きいほど自分に有利）
 *
 * 編集後はブラウザ再読み込み。リセットで同じ定義に戻ります。
 *
 * 手計算の答え:
 *   A: min(3,12) = 3
 *   B: min(8,2)  = 2
 *   C: min(4,6)  = 4
 *   根: max(3,2,4) = 4 → 手「C」を選ぶ
 */

/** @typedef {{ id: string, label: string, kind: 'max'|'min'|'leaf', score?: number, children?: string[] }} TreeNodeDef */

/**
 * @type {{ rootId: string, nodes: Record<string, TreeNodeDef> }}
 */
export const INITIAL_TREE = {
  rootId: "root",
  nodes: {
    root: {
      id: "root",
      label: "自分の手番",
      kind: "max",
      children: ["A", "B", "C"],
    },
    A: {
      id: "A",
      label: "手 A",
      kind: "min",
      children: ["A1", "A2"],
    },
    A1: { id: "A1", label: "相手α", kind: "leaf", score: 3 },
    A2: { id: "A2", label: "相手β", kind: "leaf", score: 12 },
    B: {
      id: "B",
      label: "手 B",
      kind: "min",
      children: ["B1", "B2"],
    },
    B1: { id: "B1", label: "相手γ", kind: "leaf", score: 8 },
    B2: { id: "B2", label: "相手δ", kind: "leaf", score: 2 },
    C: {
      id: "C",
      label: "手 C",
      kind: "min",
      children: ["C1", "C2"],
    },
    C1: { id: "C1", label: "相手ε", kind: "leaf", score: 4 },
    C2: { id: "C2", label: "相手ζ", kind: "leaf", score: 6 },
  },
};
