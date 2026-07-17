/**
 * α-β 法の初期木
 *
 * Min-Max デモと同型だが、手 B の MIN に 3 つ目の葉 B3 を追加。
 * α カットで B3 が読まれない様子を見せる。
 *
 * 手計算（左から）:
 *   A: min(3,12)=3 → 根の α が 3 に
 *   B: 8 → 2 で v=2 ≤ α=3 → B3(99) を刈る（α カット）
 *   C: min(4,6)=4
 *   根: max(3,2,4)=4（手 C）— Min-Max と同じ値
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
      children: ["B1", "B2", "B3"],
    },
    B1: { id: "B1", label: "相手γ", kind: "leaf", score: 8 },
    B2: { id: "B2", label: "相手δ", kind: "leaf", score: 2 },
    B3: {
      id: "B3",
      label: "相手ε(刈)",
      kind: "leaf",
      score: 99,
    },
    C: {
      id: "C",
      label: "手 C",
      kind: "min",
      children: ["C1", "C2"],
    },
    C1: { id: "C1", label: "相手ζ", kind: "leaf", score: 4 },
    C2: { id: "C2", label: "相手η", kind: "leaf", score: 6 },
  },
};

/** 素の Min-Max なら評価する葉の数（B3 含む） */
export const FULL_LEAF_COUNT = 7;
