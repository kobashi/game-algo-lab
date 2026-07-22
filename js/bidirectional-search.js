/**
 * 双方向探索（Bidirectional BFS）可視化デモ
 * - 前向き: S から / 後ろ向き: 全 G から multi-source
 * - 出会点で経路接合。一方向 BFS との展開数比較
 * @see docs/topics/bidirectional-search/SPEC.md
 */

import { parseMap } from "./map-format.js";
import { INITIAL_MAP } from "./maps/bidirectional-search-map.js";
import { setPanel, renderQueue, renderSet, cellLabel } from "./ds-viz.js";
import {
  createStatus,
  createResultPanel,
  createPlayback,
  loadTextSample,
  bindMapPaint,
  mountTopicShellFromDataset,
  PF,
  PF_COLORS,
  createGridOps,
  applyParsedMap,
  drawPathfindingGrid,
  drawScorePair,
} from "./platform/index.js";

mountTopicShellFromDataset();

const COLS = PF.COLS;
const ROWS = PF.ROWS;
const CELL = PF.CELL;

const Mark = {
  NONE: 0,
  VISITED_F: 1,
  VISITED_B: 2,
  FRONTIER_F: 3,
  FRONTIER_B: 4,
  PATH: 5,
  MEET: 6,
};

const COLORS = {
  ...PF_COLORS,
  visitedF: "#3d7ab8",
  frontierF: "#7eb6e8",
  visitedB: "#b86a3d",
  frontierB: "#e8a87e",
  meet: "#c9a0dc",
  both: "#6b8f6b",
};

const grid = createGridOps(COLS, ROWS);
const { key, inBounds } = grid;
function isWalkable(x, y) {
  return grid.isWalkable(x, y, walls);
}
function neighbors(x, y) {
  return grid.neighbors(x, y, walls);
}

const canvas = document.getElementById("grid-canvas");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result-compare");
const speedInput = document.getElementById("speed");
const btnPlay = document.getElementById("btn-play");
const btnStep = document.getElementById("btn-step");
const btnReset = document.getElementById("btn-reset");
const paintGroup = document.getElementById("paint-tools");
const dsPanels = document.getElementById("ds-panels");
const csharpSample = document.getElementById("csharp-sample");
const policyEl = /** @type {HTMLSelectElement | null} */ (
  document.getElementById("expand-policy")
);

/** @type {number[][]} */
let costs = [];
/** @type {boolean[][]} */
let walls = [];
/** @type {number[][]} */
let marks = [];
/** @type {number[][]} 前向き歩数。未到達 -1 */
let distF = [];
/** @type {number[][]} 後ろ向き歩数。未到達 -1 */
let distB = [];

let start = { x: 1, y: 1 };
/** @type {{x:number,y:number}[]} */
let goals = [{ x: COLS - 2, y: ROWS - 2 }];

/** @type {{x:number,y:number}[]} */
let queueF = [];
/** @type {{x:number,y:number}[]} */
let queueB = [];
/** @type {Map<string, {x:number,y:number}|null>} */
let parentF = new Map();
/** @type {Map<string, {x:number,y:number}|null>} */
let parentB = new Map();
/** @type {Set<string>} */
let seenF = new Set();
/** @type {Set<string>} */
let seenB = new Set();

let finished = false;
let found = false;
/** @type {{x:number,y:number}|null} */
let meetCell = null;
/** 交互モード用: true なら次は前向き */
let nextForward = true;
/** 拡張したノード数（dequeue 回数） */
let expandCount = 0;
/** 前向き / 後ろ向き の dequeue 回数 */
let expandF = 0;
let expandB = 0;

const setStatus = createStatus(statusEl);
const resultPanel = createResultPanel(resultEl);

function isStart(x, y) {
  return x === start.x && y === start.y;
}
function isGoal(x, y) {
  return goals.some((g) => g.x === x && g.y === y);
}

function clearMarks() {
  marks = Array.from({ length: ROWS }, () => Array(COLS).fill(Mark.NONE));
  distF = Array.from({ length: ROWS }, () => Array(COLS).fill(-1));
  distB = Array.from({ length: ROWS }, () => Array(COLS).fill(-1));
}

function loadInitialMap() {
  const applied = applyParsedMap(
    parseMap(INITIAL_MAP),
    COLS,
    ROWS,
    "bidirectional-search-map.js"
  );
  costs = applied.costs;
  walls = applied.walls;
  start = applied.start;
  goals = applied.goals;
  meetCell = null;
}

function resetSearch() {
  stopAuto();
  finished = false;
  found = false;
  meetCell = null;
  expandCount = 0;
  expandF = 0;
  expandB = 0;
  nextForward = true;
  clearMarks();

  queueF = [{ ...start }];
  parentF = new Map([[key(start.x, start.y), null]]);
  seenF = new Set([key(start.x, start.y)]);
  distF[start.y][start.x] = 0;

  queueB = [];
  parentB = new Map();
  seenB = new Set();
  for (const g of goals) {
    const k = key(g.x, g.y);
    if (seenB.has(k)) continue;
    seenB.add(k);
    parentB.set(k, null);
    queueB.push({ ...g });
    distB[g.y][g.x] = 0;
  }

  // S がゴールのとき即終了
  if (seenB.has(key(start.x, start.y))) {
    finished = true;
    found = true;
    meetCell = { ...start };
    reportResult([{ ...start }]);
    setStatus("スタートがゴールです — 経路長 0");
    draw();
    updateDsViz();
    return;
  }

  resultPanel.hide();
  setStatus(
    "準備完了 — 青=前向き(S) / 橙=後ろ向き(G)。再生で両側から探索"
  );
  draw();
  updateDsViz();
}

/**
 * 一方向 BFS の展開数（dequeue 回数）と比較用経路長
 * @returns {{ expands: number, hops: number | null }}
 */
function countUnidirectionalBfs() {
  const q = [{ ...start }];
  const seen = new Set([key(start.x, start.y)]);
  const dist = new Map([[key(start.x, start.y), 0]]);
  let expands = 0;
  while (q.length) {
    const cur = q.shift();
    expands += 1;
    const d = dist.get(key(cur.x, cur.y)) ?? 0;
    if (isGoal(cur.x, cur.y)) {
      return { expands, hops: d };
    }
    for (const n of neighbors(cur.x, cur.y)) {
      const k = key(n.x, n.y);
      if (seen.has(k)) continue;
      seen.add(k);
      dist.set(k, d + 1);
      q.push(n);
    }
  }
  return { expands, hops: null };
}

function reconstructPath(meet) {
  const front = [];
  let c = meet;
  while (c) {
    front.push(c);
    const p = parentF.get(key(c.x, c.y));
    c = p ?? null;
  }
  front.reverse();

  const back = [];
  let b = parentB.get(key(meet.x, meet.y)) ?? null;
  while (b) {
    back.push(b);
    b = parentB.get(key(b.x, b.y)) ?? null;
  }
  return front.concat(back);
}

function paintPath(path) {
  for (const p of path) {
    if (isStart(p.x, p.y) || isGoal(p.x, p.y)) continue;
    if (meetCell && p.x === meetCell.x && p.y === meetCell.y) {
      marks[p.y][p.x] = Mark.MEET;
    } else {
      marks[p.y][p.x] = Mark.PATH;
    }
  }
  if (meetCell) {
    marks[meetCell.y][meetCell.x] = Mark.MEET;
  }
}

function reportResult(path) {
  const hops = Math.max(0, path.length - 1);
  const uni = countUnidirectionalBfs();
  const biExpands = expandCount;
  const saved =
    uni.expands != null && biExpands < uni.expands
      ? uni.expands - biExpands
      : 0;
  const ratio =
    uni.expands > 0 ? ((biExpands / uni.expands) * 100).toFixed(0) : "—";

  resultPanel.show(`
    <h3>結果の比較（双方向 vs 一方向 BFS）</h3>
    <ul>
      <li><strong>経路の歩数</strong>: ${hops}
        ${uni.hops != null ? `（一方向 BFS も ${uni.hops} — 最少歩数は一致）` : ""}</li>
      <li><strong>双方向の展開数</strong>（dequeue）: ${biExpands}
        （前 ${expandF} + 後 ${expandB}）</li>
      <li><strong>一方向 BFS の展開数</strong>: ${uni.expands ?? "—"}</li>
      <li><strong>出会点</strong>: ${
        meetCell ? cellLabel(meetCell.x, meetCell.y) : "—"
      }</li>
    </ul>
    <p class="result-verdict">${
      saved > 0
        ? `双方向の方が ${saved} 回少ない展開（一方向の約 ${ratio}%）でした。`
        : biExpands <= (uni.expands ?? biExpands)
          ? "この地図・方策では展開数は同程度か双方向が有利です。地図を広げると差が出やすいです。"
          : "方策や地図によっては双方向が必ずしも少なくなりません（フロンティア管理のオーバーヘッド）。"
    }</p>
    <p class="result-note">
      青系=S 側、橙系=G 側。複数ゴールは後ろ向き multi-source。コストは表示のみで探索順には使いません。
    </p>
  `);
}

/**
 * 片側を1ノード拡張。出会えば meet を返す
 * @param {'F'|'B'} side
 * @returns {{x:number,y:number}|null}
 */
function expandOne(side) {
  const isF = side === "F";
  const queue = isF ? queueF : queueB;
  const parent = isF ? parentF : parentB;
  const seenSelf = isF ? seenF : seenB;
  const seenOther = isF ? seenB : seenF;
  const distSelf = isF ? distF : distB;
  const markVisited = isF ? Mark.VISITED_F : Mark.VISITED_B;
  const markFrontier = isF ? Mark.FRONTIER_F : Mark.FRONTIER_B;

  if (!queue.length) return null;

  const cur = queue.shift();
  expandCount += 1;
  if (isF) expandF += 1;
  else expandB += 1;

  const ck = key(cur.x, cur.y);
  if (
    !isStart(cur.x, cur.y) &&
    !isGoal(cur.x, cur.y) &&
    marks[cur.y][cur.x] !== Mark.MEET &&
    marks[cur.y][cur.x] !== Mark.PATH
  ) {
    // 両側到達済みマスは both 色を維持
    if (seenF.has(ck) && seenB.has(ck)) {
      /* keep */
    } else {
      marks[cur.y][cur.x] = markVisited;
    }
  }

  const curD = distSelf[cur.y][cur.x];

  for (const n of neighbors(cur.x, cur.y)) {
    const nk = key(n.x, n.y);
    if (seenSelf.has(nk)) continue;
    seenSelf.add(nk);
    parent.set(nk, cur);
    distSelf[n.y][n.x] = curD + 1;

    if (seenOther.has(nk)) {
      // 出会点
      if (!isStart(n.x, n.y) && !isGoal(n.x, n.y)) {
        marks[n.y][n.x] = Mark.MEET;
      }
      return { x: n.x, y: n.y };
    }

    queue.push(n);
    if (
      !isStart(n.x, n.y) &&
      !isGoal(n.x, n.y) &&
      marks[n.y][n.x] !== Mark.MEET
    ) {
      marks[n.y][n.x] = markFrontier;
    }
  }
  return null;
}

function chooseSide() {
  const policy = policyEl?.value || "smaller";
  if (!queueF.length) return "B";
  if (!queueB.length) return "F";
  if (policy === "alternate") {
    const side = nextForward ? "F" : "B";
    nextForward = !nextForward;
    return side;
  }
  // smaller frontier
  return queueF.length <= queueB.length ? "F" : "B";
}

function stepOnce() {
  if (finished) return false;

  if (!queueF.length || !queueB.length) {
    finished = true;
    found = false;
    setStatus("経路が見つかりませんでした（両側の探索が尽きました）");
    stopAuto();
    draw();
    updateDsViz();
    return false;
  }

  const side = chooseSide();
  const meet = expandOne(side);

  if (meet) {
    finished = true;
    found = true;
    meetCell = meet;
    const path = reconstructPath(meet);
    paintPath(path);
    reportResult(path);
    setStatus(
      `出会点 ${cellLabel(meet.x, meet.y)} — 歩数 ${path.length - 1} / 展開 ${expandCount}`
    );
    stopAuto();
    draw();
    updateDsViz();
    return false;
  }

  setStatus(
    `探索中… 拡張=${side === "F" ? "前" : "後"} / 展開 ${expandCount}` +
      ` / Q前 ${queueF.length} · Q後 ${queueB.length}`
  );
  draw();
  updateDsViz();
  return true;
}

function cellFillColor(x, y) {
  if (walls[y][x]) return COLORS.wall;
  if (isStart(x, y)) return COLORS.start;
  if (isGoal(x, y)) return COLORS.goal;
  const m = marks[y][x];
  if (m === Mark.MEET) return COLORS.meet;
  if (m === Mark.PATH) return COLORS.path;
  if (m === Mark.FRONTIER_F) return COLORS.frontierF;
  if (m === Mark.FRONTIER_B) return COLORS.frontierB;
  if (m === Mark.VISITED_F) return COLORS.visitedF;
  if (m === Mark.VISITED_B) return COLORS.visitedB;
  // 両側訪問だがマーク未更新
  const k = key(x, y);
  if (seenF.has(k) && seenB.has(k)) return COLORS.both;
  if (seenF.has(k)) return COLORS.visitedF;
  if (seenB.has(k)) return COLORS.visitedB;
  return COLORS.empty;
}

function draw() {
  drawPathfindingGrid({
    ctx,
    cols: COLS,
    rows: ROWS,
    cell: CELL,
    colors: COLORS,
    walls,
    costs,
    marks,
    markNone: Mark.NONE,
    isStart,
    isGoal,
    fillColor: cellFillColor,
    onCell: ({ x, y, px, py, cell, isWall, isStart: st, isGoal: gl }) => {
      if (isWall) return;
      const df = distF[y][x];
      const db = distB[y][x];
      const onPath =
        marks[y][x] === Mark.PATH || marks[y][x] === Mark.MEET || gl;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (st) {
        drawScorePair(ctx, { px, py, cell }, "S", df >= 0 ? `→${df}` : "", {
          dark: true,
          colors: COLORS,
        });
        return;
      }
      if (gl) {
        drawScorePair(
          ctx,
          { px, py, cell },
          "G",
          db >= 0 ? `←${db}` : "",
          { dark: true, colors: COLORS }
        );
        return;
      }
      if (df >= 0 || db >= 0) {
        const big = df >= 0 ? `→${df}` : `←${db}`;
        const small =
          df >= 0 && db >= 0 ? `←${db}` : df >= 0 ? "" : db >= 0 ? "" : "";
        // 両方あるときは大=前・小=後
        if (df >= 0 && db >= 0) {
          drawScorePair(ctx, { px, py, cell }, `→${df}`, `←${db}`, {
            dark: onPath,
            colors: COLORS,
          });
        } else {
          drawScorePair(ctx, { px, py, cell }, big, small || "·", {
            dark: onPath,
            colors: COLORS,
          });
        }
      } else {
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillText(String(costs[y][x]), px + cell / 2, py + cell / 2);
      }
    },
  });
}

function updateDsViz() {
  const qF = queueF.map((c) => cellLabel(c.x, c.y));
  const qB = queueB.map((c) => cellLabel(c.x, c.y));
  const stats = [
    `展開合計: ${expandCount}（前 ${expandF} / 後 ${expandB}）`,
    `探索済 前: ${seenF.size} · 後: ${seenB.size}`,
    meetCell
      ? `出会点: ${cellLabel(meetCell.x, meetCell.y)}`
      : "出会点: （まだ）",
    found ? "状態: 経路確定" : finished ? "状態: 失敗" : "状態: 探索中",
  ];
  setPanel(
    dsPanels,
    renderQueue({ label: "前向き Queue（S 側）", items: qF }) +
      renderQueue({ label: "後ろ向き Queue（G 側）", items: qB }) +
      renderSet({
        label: "計測",
        typeNote: "bidirectional",
        items: stats,
      })
  );
}

const playback = createPlayback({
  btnPlay,
  speedEl: speedInput,
  delayFromSpeed: (v) => 450 - v,
  onTick: () => stepOnce(),
});

function stopAuto() {
  playback.stop();
}

function togglePlay() {
  if (finished) resetSearch();
  if (playback.running) {
    stopAuto();
    setStatus("一時停止");
    return;
  }
  playback.start();
}

function afterEdit() {
  stopAuto();
  resetSearch();
  setStatus("マップを更新しました — 再生で探索");
}

btnPlay.addEventListener("click", togglePlay);
btnStep.addEventListener("click", () => {
  if (playback.running) stopAuto();
  if (finished) resetSearch();
  stepOnce();
});
btnReset.addEventListener("click", () => {
  loadInitialMap();
  resetSearch();
  setStatus("初期地図を再読み込みしました");
});
policyEl?.addEventListener("change", () => {
  if (!finished && expandCount === 0) {
    setStatus(
      `拡張方策: ${
        policyEl.value === "alternate" ? "交互" : "小さい側優先"
      }`
    );
  }
});

bindMapPaint({
  canvas,
  paintGroup,
  cellSize: CELL,
  isBusy: () => playback.running,
  getContext: () => ({
    walls,
    costs,
    goals,
    start,
    inBounds,
    isStart,
    isGoal,
  }),
  onEdit: () => afterEdit(),
  setStatus,
});

loadTextSample(
  "../samples/BidirectionalSearchExample.cs",
  csharpSample,
  "// samples/BidirectionalSearchExample.cs を読み込めませんでした。"
);

loadInitialMap();
resetSearch();
