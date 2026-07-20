/**
 * AND-OR 探索の初期木（ダンジョンクリアの比喩・深さ3）
 *
 * kind:
 *   "or"   … どれか1つの子が真なら真（プレイヤーの選択）
 *   "and"  … すべての子が真なら真（必須条件・相手の全対応）
 *   "leaf" … 終端。value: true=成功 / false=失敗
 *
 * 編集したらブラウザを再読み込み。「リセット」で同じ定義に戻ります。
 *
 * 旧版（2段の OR-of-AND）は真理値表と等価で交互再帰が見えなかったため、
 * 「鍵を入手」を葉から OR 節点（買う/盗む）に差し替えて深さ3にした。
 * AND（正規ルート）の子に OR（鍵の入手手段）が入り、「AND の中の OR」という
 * 交互再帰と部分打ち切りの両方が1本の木で見える。
 *
 * 実際の探索順（深さ優先・左から右）:
 *   根 OR「クリアする」→ 1つ目の子「正規ルート」(AND) を評価
 *     正規ルート AND → 1つ目の子「鍵を入手」(OR) を評価
 *       鍵を入手 OR → 「買う」(偽) を先に試して失敗 → 次に「盗む」(真) を試して成功
 *       → 鍵を入手 OR は真（2つ目の子で成功）
 *     → 正規ルート AND は次の子「ボス撃破」(真) も評価 → 正規ルートは真
 *   → 根 OR は最初の子（正規ルート）で真が確定 → 即 true で打ち切り
 *     （「強引突破」「秘密の通路」は未評価のまま）
 *
 * 根の結論は旧版と同じ「真（解あり）」で、強引・秘密が未評価な点も変わらない。
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
    // 鍵の入手手段: 買う→盗むの順に試す OR 節点（深さ3の核）
    key: {
      id: "key",
      label: "鍵を入手",
      kind: "or",
      children: ["buy", "steal"],
    },
    buy: { id: "buy", label: "買う", kind: "leaf", value: false },
    steal: { id: "steal", label: "盗む", kind: "leaf", value: true },
    boss: { id: "boss", label: "ボス撃破", kind: "leaf", value: true },
    // 強引: 警備Aは突破できるが警備Bで失敗 → AND 全体が偽（未評価のまま残る）
    force: {
      id: "force",
      label: "強引突破",
      kind: "and",
      children: ["guardA", "guardB"],
    },
    guardA: { id: "guardA", label: "警備A", kind: "leaf", value: true },
    guardB: { id: "guardB", label: "警備B", kind: "leaf", value: false },
    // 秘密の通路: 1手で成功（OR の別候補・未評価のまま残る）
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
 * 「買う」を true にすると鍵 OR は1つ目の子で即成功し、「盗む」は評価されなくなる
 * （OR の早期打ち切りを鍵の内側でも確認できる）。
 * 現行木は「買う→盗む」の順で、鍵 OR 自身が1つ目失敗・2つ目成功という
 * 交互再帰の途中経過を見せつつ、根 OR は正規ルート成功で即 true になる。
 */
