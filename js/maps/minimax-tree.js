/**
 * Min-Max 探索の初期木（深さ3・葉12 の標準木）
 *
 * kind:
 *   "max"  … 自分（最大化プレーヤ）
 *   "min"  … 相手（最小化プレーヤ）
 *   "leaf" … 終端局面。score が評価値（大きいほど自分に有利）
 *
 * 編集後はブラウザ再読み込み。リセットで同じ定義に戻ります。
 *
 * 構造: 根(MAX) → 手 L/M/R(MIN) → 応手 L1/L2 等(MAX) → 葉（12枚）
 * MIN の下にまた MAX が現れる交互再帰を、コールスタックで最大3段まで積んで見せる。
 *
 * 手計算の答え（枝刈りなし・全12葉を評価）:
 *   手 L: L1=max(5,3)=5, L2=max(7,9)=9 → L=min(5,9)=5
 *   手 M: M1=max(4,2)=4, M2=max(1,3)=3 → M=min(4,3)=3
 *   手 R: R1=max(6,8)=8, R2=max(7,4)=7 → R=min(8,7)=7
 *   根: max(5,3,7) = 7 → 手「R」を選ぶ
 *
 * この木は js/maps/alpha-beta-tree.js / js/maps/monte-carlo-tree.js と同型・同値
 * （葉のスコアも共通）。Min-Max は全12葉を評価し v=7、次の α-β 法は9葉だけで
 * 同じ v=7 に到達することを直接比較できる。
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
      children: ["L", "M", "R"],
    },
    L: {
      id: "L",
      label: "手 L",
      kind: "min",
      children: ["L1", "L2"],
    },
    L1: {
      id: "L1",
      label: "応手 L1",
      kind: "max",
      children: ["L1a", "L1b"],
    },
    L1a: { id: "L1a", label: "葉 L1a", kind: "leaf", score: 5 },
    L1b: { id: "L1b", label: "葉 L1b", kind: "leaf", score: 3 },
    L2: {
      id: "L2",
      label: "応手 L2",
      kind: "max",
      children: ["L2a", "L2b"],
    },
    L2a: { id: "L2a", label: "葉 L2a", kind: "leaf", score: 7 },
    L2b: { id: "L2b", label: "葉 L2b", kind: "leaf", score: 9 },
    M: {
      id: "M",
      label: "手 M",
      kind: "min",
      children: ["M1", "M2"],
    },
    M1: {
      id: "M1",
      label: "応手 M1",
      kind: "max",
      children: ["M1a", "M1b"],
    },
    M1a: { id: "M1a", label: "葉 M1a", kind: "leaf", score: 4 },
    M1b: { id: "M1b", label: "葉 M1b", kind: "leaf", score: 2 },
    M2: {
      id: "M2",
      label: "応手 M2",
      kind: "max",
      children: ["M2a", "M2b"],
    },
    M2a: { id: "M2a", label: "葉 M2a", kind: "leaf", score: 1 },
    M2b: { id: "M2b", label: "葉 M2b", kind: "leaf", score: 3 },
    R: {
      id: "R",
      label: "手 R",
      kind: "min",
      children: ["R1", "R2"],
    },
    R1: {
      id: "R1",
      label: "応手 R1",
      kind: "max",
      children: ["R1a", "R1b"],
    },
    R1a: { id: "R1a", label: "葉 R1a", kind: "leaf", score: 6 },
    R1b: { id: "R1b", label: "葉 R1b", kind: "leaf", score: 8 },
    R2: {
      id: "R2",
      label: "応手 R2",
      kind: "max",
      children: ["R2a", "R2b"],
    },
    R2a: { id: "R2a", label: "葉 R2a", kind: "leaf", score: 7 },
    R2b: { id: "R2b", label: "葉 R2b", kind: "leaf", score: 4 },
  },
};
