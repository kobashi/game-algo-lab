/**
 * 入門コースの提出課題（14 本）— 学生に見せる文の正本
 *
 * 計画書: docs/reviews/2026-09-27-intro-course-assignments-plan.md
 * - §4 課題、§8 ユーザーの決定、§9 Grok の決定、§10.2 修正案（課題 3・4・13・14）
 * - 教員用の想定の答えは、このリポジトリに書かない（計画書 §11）
 *
 * 各項目:
 *   number     課題番号（コースの順）
 *   title      題
 *   question   問い
 *   condition  条件の補足（あれば）
 *   personal   学籍番号の末尾 1 桁 d（0〜9）から個人条件の文を作る関数（無ければ null）
 *   urls       提出する URL（id と説明）。原則 A・B の 2 本
 *   observe    観察に書くこと
 *   discuss    考察に書くことの候補（全部でなくてよい。100〜200 字で「事実」と「説明」）
 *   example    URL の形の例（`…` は自分で決める値）
 *
 * 文字列は演習カードと同じ軽量 Markdown（`` `code` `` / `**強調**`）。
 */

/**
 * @typedef {{
 *   number: number,
 *   title: string,
 *   question: string,
 *   condition?: string,
 *   personal: ((d: number) => string) | null,
 *   urls: { id: string, label: string }[],
 *   observe: string,
 *   discuss: string[],
 *   example?: string,
 * }} Assignment
 */

const UI_PLACES = [
  "左上（上端と左端から 16 px）",
  "右上（上端と右端から 16 px）",
  "中央（画面の真ん中）",
  "右下（下端と右端から 16 px）",
  "下中央（下端から 16 px、左右は真ん中）",
];

/** @type {Record<string, Assignment>} */
export const ASSIGNMENTS = {
  "game-loop": {
    number: 1,
    title: "打ち切らない MAX_STEPS を予想する",
    question: "重いフレームが続くとき、1 フレームに何回更新すれば遅れずに済むか。",
    personal: (d) => `人工遅延 L = ${80 - 5 * d} ms（モードは固定 timestep、人工遅延のかけ方は毎フレーム）`,
    urls: [
      { id: "A", label: "打ち切りが出ない最小の MAX_STEPS" },
      { id: "B", label: "A より 1 小さい MAX_STEPS（打ち切りが出る）" },
    ],
    observe:
      "A と B それぞれの、結果表の「平均 更新/フレーム」と「経過時間」と、打ち切りの回数（結果表の下の「MAX_STEPS 打ち切り … 回」。フレームログの「MAX_STEPS 警告」も同じ）。",
    discuss: [
      "なぜその回数か（1 フレームの実経過 16.7 + L ms と、アキュムレータで説明する）",
      "B でシミュレーションが遅れる理由",
      "打ち切りが無ければ何が起きるか（スパイラル・オブ・デス）",
    ],
    example: "`game-loop.html?mode=fixed&lag=L&maxsteps=…`",
  },

  "input-basics": {
    number: 2,
    title: "チャージ攻撃の閾値を決める",
    question: "溜め攻撃の「長押し」の閾値は何 ms がよいか。",
    personal: null,
    urls: [
      { id: "A", label: "閾値の 1 つ目" },
      { id: "B", label: "閾値の 2 つ目（A と違う値）" },
    ],
    observe:
      "イベントログの行（Charge が出たとき・出なかったとき）と、押していた長さ。結果はキー操作なので URL には入らない。ログをコピーして貼る。",
    discuss: [
      "Jump・Fire・Charge が、それぞれ held・down・up のどれを使っているか。Z を離したとき、Fire の回数はどうなるか",
      "閾値が短すぎる・長すぎると、プレイヤーはどう感じるか",
      "判定がフレーム単位（約 16.7 ms 刻み）になる影響",
    ],
    example: "`input-basics.html?longms=…`",
  },

  "velocity-motion": {
    number: 3,
    title: "すり抜けの境目を探す",
    question: "1 歩が「障害物の厚み ＋ ボールの直径」より大きくなると、必ずすり抜けるか。",
    personal: (d) => `横の速さ vx = ${195 + 5 * d}（vy = 0、障害物あり、障害物の厚み 10 px）`,
    urls: [
      { id: "A", label: "すり抜ける最小の dt（0.1 ms 刻みで探す）" },
      { id: "B", label: "A より 0.1 ms 小さい dt（当たる）" },
    ],
    observe:
      "A と B の「1フレームの移動 |v|·dt」。A ですり抜けたときの状態表示（厚みと直径を含む文）と、何回目の「1ステップ」ですり抜けたか（自分で数える）。",
    discuss: [
      "A の 1 歩と「厚み ＋ 直径」を比べる",
      "1 歩が厚み ＋ 直径より大きいのに当たる dt はあるか。あるならなぜか",
      "すり抜けを防ぐ方法",
    ],
    example: "`velocity-motion.html?vx=…&vy=0&obs=1&trail=1&thick=10&dt=…`",
  },

  "accel-gravity": {
    number: 4,
    title: "狙った高さの比を作る",
    question: "跳ねるたびに高さが決まった割合になるよう、反発係数を選べるか。",
    personal: (d) => {
      const e = 0.9 - 0.05 * d;
      return `目標の高さの比 R = ${(e * e).toFixed(2)}（障害物は消す: \`obs=0\`）`;
    },
    urls: [
      { id: "A", label: "予想した反発係数" },
      { id: "B", label: "A と同じ反発係数で、重力 g だけを変えたもの" },
    ],
    observe: "A と B の最高点の列（A → B → C …）と、隣どうしの比。",
    discuss: [
      "比が反発係数の 2 乗になる理由",
      "g を変えても比が変わらない理由",
      "目標とのずれと、その理由",
    ],
    example: "`accel-gravity.html?obs=0&rest=…&g=…`",
  },

  "circle-collision": {
    number: 5,
    title: "角でぎりぎり触れる配置",
    question: "円が箱の角に触れる瞬間を作れるか。辺で触れるときと何が違うか。",
    personal: (d) => `円 A の半径 = ${30 + 3 * d}`,
    urls: [
      { id: "A", label: "円 A が箱の角に接触（円A–AABB が HIT）" },
      { id: "B", label: "A から 1 px 離して miss" },
    ],
    observe: "A と B の、円A–AABB の判定と円と箱の距離。最近点（黄の点）が角に来ていること。",
    discuss: [
      "Clamp で最近点が角になる理由",
      "辺で触れるときとの違い",
      "平方根を使わずに比べる方法",
    ],
  },

  "coyote-time": {
    number: 6,
    title: "猶予の長さを決める",
    question: "自分のゲームに採用するなら、猶予は何 ms がよいか。",
    personal: null,
    urls: [
      { id: "A", label: "猶予 0 ms（`coyote=0`）" },
      { id: "B", label: "自分で選んだ長さの 1 つ目" },
      { id: "C", label: "自分で選んだ長さの 2 つ目" },
    ],
    observe:
      "それぞれ、崖から落ちながら 10 回試したときの統計表の成功・失敗の数（R キーで足場に戻る）。回数は URL に入らないので、数を書く。",
    discuss: [
      "成功率の変わり方",
      "猶予が長すぎると何が不自然になるか",
      "採用する値と、その理由",
    ],
    example: "`coyote-time.html?coyote=1&ms=…`",
  },

  "gfx-camera": {
    number: 7,
    title: "ジャンルに合うカメラ",
    question: "素早いアクションと、ゆったりした探索で、カメラの設定をどう変えるか。",
    personal: null,
    urls: [
      { id: "A", label: "アクション向けの設定" },
      { id: "B", label: "探索向けの設定" },
    ],
    observe: "A と B で、右に歩き続けたときに「遅れ」が落ち着いた値（px）。",
    discuss: [
      "1 歩の移動（約 3.67 px）と追従係数から遅れを予想し、実測と比べる",
      "デッドゾーンの役割",
    ],
    example: "`gfx-camera.html?follow=…&dead=…`",
  },

  "gfx-ui-canvas": {
    number: 8,
    title: "どの幅でも崩れない HUD",
    question: "画面の幅が変わっても、決めた場所に UI を置き続けられるか。",
    personal: (d) => `置く場所 = ${UI_PLACES[(d + 2) % 5]}`,
    urls: [
      { id: "A", label: "幅（連続）480（`vieww=480`）" },
      { id: "B", label: "幅（連続）640（`vieww=640`）" },
      { id: "C", label: "幅（連続）960（`vieww=960`）" },
    ],
    condition: "3 本とも Anchor・Pivot・Offset（`ox`・`oy`）は同じにする。幅だけを変える。",
    observe: "3 つの幅での、ボタンの左上の座標と、端からの距離。",
    discuss: [
      "Anchor と Pivot をどう選んだか、その理由",
      "左上 Anchor のままだとどうなるか",
    ],
  },

  "sfx-events": {
    number: 9,
    title: "音で出来事を区別する",
    question: "Hit と Pickup を、音だけで聞き分けられるようにできるか。",
    personal: null,
    urls: [
      { id: "A", label: "Hit の音（`ev=Hit`）" },
      { id: "B", label: "Pickup の音（`ev=Pickup`）" },
    ],
    observe: "ログの周波数と長さ。ミュートにしたときのログ。",
    discuss: [
      "音を変えるのに、イベントを出す側を変えなくてよい理由",
      "購読者をもう 1 つ足すなら何に使うか",
    ],
    example: "`sfx-events.html?ev=Hit&freq=…&dur=…&gain=…`",
  },

  fsm: {
    number: 10,
    title: "遷移 1 本で新しい振る舞いを作る",
    question: "遷移表の 1 マスだけを変えて、キャラに新しい振る舞いをさせられるか。",
    personal: null,
    urls: [
      { id: "A", label: "変更前（遷移の上書きなし。B と同じイベント列）" },
      { id: "B", label: "遷移を 1 本上書きし、違いが出るイベント列を入れたもの" },
    ],
    observe: "A と B の状態履歴（分かれるところ）。到達できない状態（灰色）の変化。",
    discuss: [
      "表の 1 マスで振る舞いが変わる理由",
      "変更で新しく困ること（抜け出せない状態や、届かなくなる状態）",
    ],
    example: "`fsm.html?from=…&ev=…&to=…&script=…`",
  },

  "rng-seed": {
    number: 11,
    title: "周期が最大になる LCG",
    question: "法 m の LCG で、周期がちょうど m になる a・c の組はどんな組か。",
    personal: (d) => `法 m = ${2 ** (6 + ((d + 1) % 4))}`,
    urls: [
      { id: "A", label: "周期が m になる a・c" },
      { id: "B", label: "周期が m より短くなる a・c" },
    ],
    observe: "A と B の周期の表示と、ヒストグラムの様子。",
    discuss: [
      "周期が m を超えない理由",
      "周期が m になる組に共通すること（予想でよい）",
      "周期が短いと何が困るか",
    ],
    example: "`rng-seed.html?algo=lcg&a=…&c=…&m=…`",
  },

  minimax: {
    number: 12,
    title: "最善手を変える最小の変更",
    question: "葉を 1 つだけ変えて最善手を変えるには、どの葉をどれだけ変えればよいか。",
    condition: "既定の葉から始める。変えるのは 1 枚だけ。",
    personal: null,
    urls: [
      { id: "A", label: "最善手が変わらない、いちばん大きな変更" },
      { id: "B", label: "最善手が変わる、いちばん小さな変更" },
    ],
    observe: "A と B の根の値と最善手（同点の表示が出たらそれも）。",
    discuss: [
      "どの葉が答えを決めているか",
      "その葉を変えても答えが変わらない範囲がある理由",
    ],
    example: "`minimax.html?leaves=…`",
  },

  "alpha-beta": {
    number: 13,
    title: "刈りの多い並び・少ない並び",
    question: "同じ木でも、枝を読む順番で、読む葉の数が変わるか。",
    condition:
      "葉の値の組み合わせは変えず、**同じ親を持つ枝どうしの順番だけ**を入れ替える（手 L・M・R の順、各手の中の応手の順、各応手の中の 2 枚の葉の順）。",
    personal: null,
    urls: [
      { id: "A", label: "読む葉ができるだけ少ない並び" },
      { id: "B", label: "読む葉ができるだけ多い並び" },
    ],
    observe: "A と B の、読んだ葉の数・カットの数・根の値。",
    discuss: [
      "良い手を先に読むと刈りが増える理由",
      "どちらの並びでも根の値が同じ理由",
    ],
    example: "`alpha-beta.html?leaves=…`",
  },

  "tic-tac-toe": {
    number: 14,
    title: "MC が正しくなる試行回数",
    question: "モンテカルロ法が完全解析と同じ手を選ぶには、何回試せばよいか。",
    personal: (d) => `シード = ${30 + d}（プリセットは初手: 隅 \`preset=open-corner\`）`,
    urls: [
      { id: "A", label: "N = 10〜1000 の範囲で、最後に不一致になる N（N は 10 刻み）" },
      { id: "B", label: "A + 10（一致する）" },
    ],
    observe: "A と B で「解析」と「MC 実行」をしたときの状態表示（MC の最善手・勝率と、「完全解と一致」か「不一致」か）。",
    discuss: [
      "N を増やすと一致する理由",
      "シードを変えると境目が変わる理由",
      "完全解析と比べた長所・短所",
    ],
    example: "`tic-tac-toe.html?preset=open-corner&mcseed=…&mcn=…`",
  },
};
