/**
 * AND-OR 探索の初期木（ダンジョンクリアの比喩）
 *
 * kind:
 *   "or"   … どれか1つの子が真なら真（プレイヤーの選択）
 *   "and"  … すべての子が真なら真（必須条件・相手の全対応）
 *   "leaf" … 終端。value: true=成功 / false=失敗
 *
 * 編集したらブラウザを再読み込み。「リセット」で同じ定義に戻ります。
 */

/** @typedef {{ id: string, label: string, kind: 'or'|'and'|'leaf', value?: boolean, children?: string[] }} TreeNodeDef */

/**
 * @type {{ rootId: string, nodes: Record<string, TreeNodeDef> }}
 */
export const INITIAL_TREE = {
  rootId: "root",
  nodes: {
    root: {
      id: "root",
      label: "クリアする",
      kind: "or",
      children: ["safe", "force", "secret"],
    },
    // 正規ルート: 鍵とボス両方必要
    safe: {
      id: "safe",
      label: "正規ルート",
      kind: "and",
      children: ["key", "boss"],
    },
    key: { id: "key", label: "鍵を入手", kind: "leaf", value: true },
    boss: { id: "boss", label: "ボス撃破", kind: "leaf", value: true },
    // 強引: 警備Aは突破できるが警備Bで失敗 → AND 全体が偽
    force: {
      id: "force",
      label: "強引突破",
      kind: "and",
      children: ["guardA", "guardB"],
    },
    guardA: { id: "guardA", label: "警備A", kind: "leaf", value: true },
    guardB: { id: "guardB", label: "警備B", kind: "leaf", value: false },
    // 秘密の通路: 1手で成功（OR の別候補）
    secret: {
      id: "secret",
      label: "秘密の通路",
      kind: "leaf",
      value: true,
    },
  },
};

/**
 * 別シナリオ例（コメントアウト参照用）:
 * 根 OR の最初の子だけ成功する木にすると、残りを読まずに真になる様子が分かりやすい。
 * 現行木は左から「正規(成功) → 強引は途中まで → 秘密は未到達になり得る」を見せる。
 * 実際の探索順: 正規 AND が鍵・ボスで真 → 根 OR が即 true（強引・秘密は評価しない）。
 */
