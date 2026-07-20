/**
 * α-β 法の初期木（Min-Max デモと同型・同値の深さ3・葉12 標準木）
 *
 * 深さ2（根→MIN→葉）では β カットが構造的に発生し得ないため、
 * 深さ3（根→MIN→MAX→葉）にして β カット・α カット・内部節点ごとの
 * 深い刈り（枝丸ごと未評価）の3つを1本の木で見せる。
 *
 * 手計算（左から、根は α=−∞ β=+∞ で開始）:
 *   手 L: 応手 L1 は葉「L1a=5」→「L1b=3」の順に評価 → v=max=5（カットなし）
 *         L の β が 5 になり、応手 L2 は葉「L2a=7」→「L2b=9」の順。
 *         最初の葉 L2a=7 ≥ β(5) → **β カット**（葉 L2b=9 は読まずに済む）
 *         L = min(5, 7) = 5（本当の L2 の値は 9 だが、L はどのみち 5 を選ぶ）
 *   手 M: 根の α が 5 になった後に開始。応手 M1 は葉「M1a=4」→「M1b=2」で v=4
 *         M の v=4 ≤ α(5) → **α カット**。応手 M2 は節点ごと未評価
 *         （葉 M2a・M2b の2枚も読まずに済む＝内部節点ごとの深い刈り）
 *   手 R: 応手 R1 は葉「R1a=6」→「R1b=8」で v=8。
 *         応手 R2 は葉「R2a=7」→「R2b=4」で v=7（カットなし）
 *         R = min(8, 7) = 7
 *   根 = max(5, ≤4, 7) = 7（最善手は R）— Min-Max と同じ値
 *
 * 評価した葉: L1(2) + L2(1, カットで L2b 未評価) + M1(2) + M2(0, 節点ごと未評価)
 *           + R1(2) + R2(2) = 9 / 全12葉。カット回数 = 2（β カット1・α カット1）。
 *
 * 子順を入れ替えると刈り量が変わる例: 根の children を ["R","M","L"] にすると、
 * 先に R=7 で α=7 が立ち、L の応手 L1=5 ≤ α(7) で L2 が節点ごと未評価になり、
 * 葉訪問が 8/12 まで減る（このファイルの children 配列を書き換えて確認可）。
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
      label: "応手 L2(刈)",
      kind: "max",
      children: ["L2a", "L2b"],
    },
    L2a: { id: "L2a", label: "葉 L2a", kind: "leaf", score: 7 },
    L2b: { id: "L2b", label: "葉 L2b(刈)", kind: "leaf", score: 9 },
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
      label: "応手 M2(刈)",
      kind: "max",
      children: ["M2a", "M2b"],
    },
    M2a: { id: "M2a", label: "葉 M2a(刈)", kind: "leaf", score: 1 },
    M2b: { id: "M2b", label: "葉 M2b(刈)", kind: "leaf", score: 3 },
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

/** 素の Min-Max なら評価する葉の数（深さ3・葉12 の標準木） */
export const FULL_LEAF_COUNT = 12;
