/**
 * 入門コースの C# 解説（C 言語の既修得者向け）の一覧 — トピック id → ページとサンプル
 *
 * 1 から順に読む前提で、C# の文法は初めて出てきた回でだけ説明する（後の回はその回へリンク）。
 * href・sample はサイトルート基準。トピックページのコード欄（js/platform/topic-shell.js）と
 * コース入口（js/courses-intro.js）から、この一覧でリンクを出す。
 *
 * @type {Record<string, { number: number, title: string, href: string, sample: string }>}
 */
export const CS_GUIDES = {
  "game-loop": { number: 1, title: "ゲームループ", href: "courses/cs-game-loop.html", sample: "samples/GameLoopExample.cs" },
  "input-basics": { number: 2, title: "入力の基礎", href: "courses/cs-input-basics.html", sample: "samples/InputBasicsExample.cs" },
  "velocity-motion": { number: 3, title: "速度による移動", href: "courses/cs-velocity-motion.html", sample: "samples/VelocityMotionExample.cs" },
  "accel-gravity": { number: 4, title: "加速度と重力", href: "courses/cs-accel-gravity.html", sample: "samples/AccelGravityExample.cs" },
  "circle-collision": { number: 5, title: "円同士・円と AABB", href: "courses/cs-circle-collision.html", sample: "samples/CircleCollisionExample.cs" },
  "coyote-time": { number: 6, title: "コヨーテタイム", href: "courses/cs-coyote-time.html", sample: "samples/CoyoteTimeExample.cs" },
  "gfx-camera": { number: 7, title: "カメラ", href: "courses/cs-gfx-camera.html", sample: "samples/GfxCameraExample.cs" },
  "gfx-ui-canvas": { number: 8, title: "UI の配置", href: "courses/cs-gfx-ui-canvas.html", sample: "samples/GfxUiCanvasExample.cs" },
  "sfx-events": { number: 9, title: "イベントと効果音", href: "courses/cs-sfx-events.html", sample: "samples/SfxEventsExample.cs" },
  fsm: { number: 10, title: "ステートマシン", href: "courses/cs-fsm.html", sample: "samples/FsmExample.cs" },
  "rng-seed": { number: 11, title: "乱数とシード", href: "courses/cs-rng-seed.html", sample: "samples/RngSeedExample.cs" },
  minimax: { number: 12, title: "Min-Max 探索", href: "courses/cs-minimax.html", sample: "samples/MinimaxExample.cs" },
  "alpha-beta": { number: 13, title: "α-β 法", href: "courses/cs-alpha-beta.html", sample: "samples/AlphaBetaExample.cs" },
  "tic-tac-toe": { number: 14, title: "三目並べ", href: "courses/cs-tic-tac-toe.html", sample: "samples/TicTacToeExample.cs" },
};
