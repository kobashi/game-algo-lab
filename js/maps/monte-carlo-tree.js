/**
 * モンテカルロ評価用の初期木（Min-Max / α-β デモと同型・同値の深さ3・葉12 標準木）
 *
 * 乱択プレイアウト: 根から葉まで、各節点で子を一様ランダムに選び score を得る。
 * 深さ3にしたことでプレイアウトが「3手の系列」として見え、
 * 経路1マス=1ステップの設計にも意味が出る（深さ2では実質サイコロ1回だった）。
 *
 * 比較用の理論値（手計算）:
 *   EV(L1) = (5+3)/2 = 4        EV(L2) = (7+9)/2 = 8        EV(L) = (4+8)/2 = 6
 *   EV(M1) = (4+2)/2 = 3        EV(M2) = (1+3)/2 = 2        EV(M) = (3+2)/2 = 2.5
 *   EV(R1) = (6+8)/2 = 7        EV(R2) = (7+4)/2 = 5.5       EV(R) = (7+5.5)/2 = 6.25
 *   根の乱択 EV = (6 + 2.5 + 6.25) / 3 = 14.75/3 ≈ 4.917
 *   Min-Max 値 = 7（最善は手 R）← 乱択平均とは一致しない
 *
 * 教材ポイント: 乱択評価では手 L(EV≈6.0) と手 R(EV≈6.25) が僅差になるが、
 * Min-Max（最善前提）では手 L=5 と手 R=7 で差がはっきりする。
 * 「乱択平均は相手の最善を仮定しない」ことが数値で確認できる。
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

/** Min-Max の根の値（比較用） */
export const MINIMAX_ROOT = 7;
/** 乱択プレイ時の真の期待値（比較用） */
export const TRUE_RANDOM_EV = (6 + 2.5 + 6.25) / 3;
