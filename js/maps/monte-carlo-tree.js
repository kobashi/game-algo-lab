/**
 * モンテカルロ評価用の初期木（Min-Max デモと同型）
 *
 * 乱択プレイアウト: 各節点で子を一様ランダムに選び葉の score を得る。
 *
 * 比較用の理論値（手計算）:
 *   葉: A1=3, A2=12, B1=8, B2=2, C1=4, C2=6
 *   手 A の EV = (3+12)/2 = 7.5
 *   手 B の EV = (8+2)/2  = 5
 *   手 C の EV = (4+6)/2  = 5
 *   根の乱択 EV = (7.5+5+5)/3 = 5.833…
 *   Min-Max 値 = 4（最善は手 C）← 乱択平均とは一致しない
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

/** Min-Max の根の値（比較用） */
export const MINIMAX_ROOT = 4;
/** 乱択プレイ時の真の期待値（比較用） */
export const TRUE_RANDOM_EV = (7.5 + 5 + 5) / 3;
