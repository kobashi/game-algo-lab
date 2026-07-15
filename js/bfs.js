/**
 * BFS (幅優先探索) 可視化デモ
 * - 通行コストは「参考値」のみ（BFS の探索順・採用判定には使わない）
 * - 探索済みセル: 大=歩数（深さ）、小=経路コスト参考値（マス元のコストは非表示）
 * - 初期地図は js/maps/bfs-map.js をエディタで直接編集する
 */

import { parseMap } from "./map-format.js";
import { INITIAL_MAP } from "./maps/bfs-map.js";
import {
  setPanel,
  renderQueue,
  renderSet,
  updateParentMapPanels,
  cellLabel,
} from "./ds-viz.js";

const COLS = 14;
const ROWS = 14;
const CELL = 40;

/** 表示用のセル種別 */
const Mark = {
  NONE: 0,
  VISITED: 1,
  FRONTIER: 2,
  PATH: 3,
};

const COLORS = {
  empty: "#0a0e14",
  wall: "#3d4f66",
  start: "#6bcb8f",
  goal: "#e07a5f",
  visited: "#2a4a6b",
  frontier: "#5b9fd4",
  path: "#f2cc8f",
  grid: "#1a222d",
  text: "#e8eef6",
  textMuted: "rgba(232, 238, 246, 0.55)",
  costTint: {
    [-1]: "rgba(107, 203, 143, 0.22)",
    0: "rgba(91, 159, 212, 0.18)",
    1: "transparent",
    2: "rgba(224, 122, 95, 0.28)",
  },
};

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

/** @type {number[][]} 通行コスト参考値 (-1, 0, 1, 2)。BFS の判定には未使用 */
let costs = [];
/** @type {boolean[][]} */
let walls = [];
/** @type {number[][]} 表示マーク */
let marks = [];
/** @type {number[][]} BFS 歩数。未到達は -1（内部用・最小化の対象） */
let hopDist = [];
/**
 * BFS 木に沿った経路コスト。未到達は null。
 * pathCost[隣] = pathCost[現在] + costs[隣]（参考値の累積。探索順には使わない）
 * @type {(number|null)[][]}
 */
let pathCost = [];

let start = { x: 1, y: 1 };
let goal = { x: COLS - 2, y: ROWS - 2 };
/** @type {{x:number,y:number}[]} */
let queue = [];
/** @type {Map<string, {x:number,y:number}|null>} */
let cameFrom = new Map();
/** @type {'wall' | -1 | 0 | 1 | 2} */
let paintMode = 1;
let painting = false;
let running = false;
let finished = false;
let found = false;
let timerId = null;

function key(x, y) {
  return `${x},${y}`;
}

function inBounds(x, y) {
  return x >= 0 && x < COLS && y >= 0 && y < ROWS;
}

function isWalkable(x, y) {
  return inBounds(x, y) && !walls[y][x];
}

function neighbors(x, y) {
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  const result = [];
  for (const [dx, dy] of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    if (isWalkable(nx, ny)) result.push({ x: nx, y: ny });
  }
  return result;
}

function isStart(x, y) {
  return x === start.x && y === start.y;
}

function isGoal(x, y) {
  return x === goal.x && y === goal.y;
}

function clearMarks() {
  marks = Array.from({ length: ROWS }, () => Array(COLS).fill(Mark.NONE));
  hopDist = Array.from({ length: ROWS }, () => Array(COLS).fill(-1));
  pathCost = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

/** js/maps/bfs-map.js の INITIAL_MAP から読み込む */
function loadInitialMap() {
  const map = parseMap(INITIAL_MAP);
  if (map.cols !== COLS || map.rows !== ROWS) {
    throw new Error(
      `bfs-map.js のサイズは ${COLS}x${ROWS} にしてください（現在 ${map.cols}x${map.rows}）`
    );
  }
  costs = map.costs.map((row) => row.slice());
  walls = map.walls.map((row) => row.slice());
  start = { ...map.start };
  goal = { ...map.goal };
}

function resetSearch() {
  stopAuto();
  finished = false;
  found = false;
  clearMarks();
  hopDist[start.y][start.x] = 0;
  pathCost[start.y][start.x] = 0;
  queue = [{ ...start }];
  cameFrom = new Map([[key(start.x, start.y), null]]);
  setStatus("準備完了 — 初期地図は js/maps/bfs-map.js を編集。再生で探索");
  hideCompare();
  draw();
  updateDsViz();
}

function setStatus(text) {
  statusEl.textContent = text;
}

function updateDsViz() {
  const qItems = queue.map((c) => cellLabel(c.x, c.y));

  const inQueue = new Set(queue.map((c) => key(c.x, c.y)));
  const visitedItems = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (hopDist[y][x] < 0) continue;
      const k = key(x, y);
      // キュー上のみのフロンティアは「探索済み」から外す
      if (inQueue.has(k) && marks[y][x] === Mark.FRONTIER) continue;
      if (
        marks[y][x] === Mark.VISITED ||
        marks[y][x] === Mark.PATH ||
        isStart(x, y) ||
        (isGoal(x, y) && finished)
      ) {
        visitedItems.push(`${cellLabel(x, y)} s${hopDist[y][x]}`);
      }
    }
  }

  const edgeList = [];
  for (const [k, parent] of cameFrom.entries()) {
    if (!parent) continue;
    const [cx, cy] = k.split(",").map(Number);
    edgeList.push({ to: cellLabel(cx, cy), from: cellLabel(parent.x, parent.y) });
  }

  setPanel(
    dsPanels,
    renderQueue({
      label: "フロンティア（待ち行列）",
      items: qItems,
    }) +
      renderSet({
        label: "探索済み",
        typeNote: "HashSet / visited",
        items: visitedItems,
      })
  );
  updateParentMapPanels({
    edges: edgeList,
    root: cellLabel(start.x, start.y),
  });
}

async function loadCsharpSample() {
  if (!csharpSample) return;
  try {
    const res = await fetch("../samples/BfsExample.cs");
    if (!res.ok) throw new Error(String(res.status));
    const text = await res.text();
    csharpSample.textContent = text;
  } catch {
    csharpSample.textContent =
      "// samples/BfsExample.cs を読み込めませんでした。\n// ローカルサーバー経由で開いてください。";
  }
}

function hideCompare() {
  resultEl.hidden = true;
  resultEl.innerHTML = "";
}

function showCompare(html) {
  resultEl.hidden = false;
  resultEl.innerHTML = html;
}

function cellFillColor(x, y) {
  if (walls[y][x]) return COLORS.wall;
  if (isStart(x, y)) return COLORS.start;
  if (isGoal(x, y)) return COLORS.goal;
  const m = marks[y][x];
  if (m === Mark.PATH) return COLORS.path;
  if (m === Mark.FRONTIER) return COLORS.frontier;
  if (m === Mark.VISITED) return COLORS.visited;
  return COLORS.empty;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const px = x * CELL;
      const py = y * CELL;

      ctx.fillStyle = cellFillColor(x, y);
      ctx.fillRect(px, py, CELL, CELL);

      // 未探索（壁・スタート・ゴール以外）に通行コストの色味
      if (
        !walls[y][x] &&
        !isStart(x, y) &&
        !isGoal(x, y) &&
        marks[y][x] === Mark.NONE
      ) {
        const tint = COLORS.costTint[costs[y][x]];
        if (tint && tint !== "transparent") {
          ctx.fillStyle = tint;
          ctx.fillRect(px, py, CELL, CELL);
        }
      }

      ctx.strokeStyle = COLORS.grid;
      ctx.strokeRect(px + 0.5, py + 0.5, CELL - 1, CELL - 1);

      // 数値ラベル
      if (walls[y][x]) continue;

      const pc = pathCost[y][x];
      const hop = hopDist[y][x];
      const explored = pc !== null && hop >= 0 && !isStart(x, y);
      const onPathOrGoal = isGoal(x, y) || marks[y][x] === Mark.PATH;

      if (explored) {
        // 探索済み: 歩数=探索の深さ（大）と経路コスト参考値（小）。マス本来のコストは出さない
        ctx.fillStyle = onPathOrGoal ? "#1a1208" : COLORS.text;
        ctx.font = "bold 13px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(hop), px + CELL / 2, py + CELL / 2 - 5);

        ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillStyle = onPathOrGoal
          ? "rgba(26, 18, 8, 0.7)"
          : COLORS.textMuted;
        ctx.fillText(`c${pc}`, px + CELL / 2, py + CELL / 2 + 9);
      } else if (!isStart(x, y) && !isGoal(x, y)) {
        // 未探索: マスの通行コスト（参考値）のみ
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(costs[y][x]), px + CELL / 2, py + CELL / 2);
      } else if (isStart(x, y)) {
        ctx.fillStyle = "#0a1018";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("S", px + CELL / 2, py + CELL / 2 - 4);
        ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillText("0·c0", px + CELL / 2, py + CELL / 2 + 9);
      } else if (isGoal(x, y)) {
        ctx.fillStyle = "#1a100c";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("G", px + CELL / 2, py + CELL / 2);
      }
    }
  }
}

function getPathCells() {
  const path = [];
  let current = goal;
  while (current) {
    path.push(current);
    current = cameFrom.get(key(current.x, current.y)) ?? null;
  }
  return path.reverse();
}

function reconstructPath() {
  const path = getPathCells();
  for (const p of path) {
    if (isStart(p.x, p.y) || isGoal(p.x, p.y)) continue;
    marks[p.y][p.x] = Mark.PATH;
  }
  return path;
}

/** 経路上のセル通行コスト合計（スタートは含めない） */
function pathPassageCost(path) {
  let sum = 0;
  for (let i = 1; i < path.length; i++) {
    const { x, y } = path[i];
    sum += costs[y][x];
  }
  return sum;
}

/**
 * 通行コスト最小の単純経路（各マス高々1回）。
 * - コストがすべて非負 → ダイクストラ
 * - 負コストを含む → 再訪なし DFS（分岐限定）。広すぎるマップは計算を打ち切る
 *
 * 注: 無向グリッドで負コストを再訪可にすると、往復でコストがいくらでも下がる。
 * ゲームの経路探索では「同じマスを踏まない」前提が自然なのでそれに合わせる。
 */
function optimalPassageCost() {
  const hasNegative = costs.some((row, y) =>
    row.some((c, x) => !walls[y][x] && c < 0)
  );

  if (!hasNegative) {
    return { value: dijkstraCost(), method: "ダイクストラ" };
  }
  const value = minCostSimplePathDfs();
  return {
    value,
    method: value === null ? null : "単純経路探索（負コスト）",
  };
}

function dijkstraCost() {
  const dist = Array.from({ length: ROWS }, () => Array(COLS).fill(Infinity));
  dist[start.y][start.x] = 0;
  /** @type {{x:number,y:number,d:number}[]} */
  const pq = [{ x: start.x, y: start.y, d: 0 }];

  while (pq.length) {
    pq.sort((a, b) => a.d - b.d);
    const cur = pq.shift();
    if (!cur || cur.d !== dist[cur.y][cur.x]) continue;
    if (cur.x === goal.x && cur.y === goal.y) return cur.d;

    for (const n of neighbors(cur.x, cur.y)) {
      const nd = cur.d + costs[n.y][n.x];
      if (nd < dist[n.y][n.x]) {
        dist[n.y][n.x] = nd;
        pq.push({ x: n.x, y: n.y, d: nd });
      }
    }
  }
  return null;
}

function countWalkable() {
  let n = 0;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!walls[y][x]) n += 1;
    }
  }
  return n;
}

/** 再訪なし最小通行コスト。広マップは打ち切り。 */
function minCostSimplePathDfs() {
  // 通路が多すぎると組合せ爆発するためスキップ
  if (countWalkable() > 80) return null;

  let best = Infinity;
  const vis = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const t0 = performance.now();
  const TIME_LIMIT_MS = 80;

  function dfs(x, y, acc) {
    if (performance.now() - t0 > TIME_LIMIT_MS) return;
    if (acc >= best) return;
    if (x === goal.x && y === goal.y) {
      best = acc;
      return;
    }
    const ns = neighbors(x, y).slice();
    ns.sort((a, b) => costs[a.y][a.x] - costs[b.y][b.x]);
    for (const n of ns) {
      if (vis[n.y][n.x]) continue;
      vis[n.y][n.x] = true;
      dfs(n.x, n.y, acc + costs[n.y][n.x]);
      vis[n.y][n.x] = false;
    }
  }

  vis[start.y][start.x] = true;
  dfs(start.x, start.y, 0);
  if (performance.now() - t0 > TIME_LIMIT_MS && best === Infinity) return null;
  return best === Infinity ? null : best;
}

function reportResult(path) {
  const hops = path.length - 1;
  const bfsCost = pathPassageCost(path);
  const { value: optimal, method } = optimalPassageCost();
  const hasNeg = costs.some((row, y) =>
    row.some((c, x) => !walls[y][x] && c < 0)
  );

  let verdict;
  if (optimal === null) {
    verdict = hasNeg
      ? "負コストを含む広いマップでは最適値の計算を省略しました。弱点デモ地図で比較するか、コストを 0 以上にしてください。"
      : "最適コストを計算できませんでした（ゴール到達不可）。";
  } else if (bfsCost > optimal) {
    verdict = `⚠ BFS の経路は通行コストが最適より悪いです（差 ${bfsCost - optimal}）。歩数が最少でも、コスト最少とは限りません。`;
  } else if (bfsCost === optimal) {
    verdict =
      "このマップでは BFS 経路の通行コストも最適と一致しました。中央を「2」、迂回路を「0」にして差を作ると弱点が見えます。";
  } else {
    verdict = "結果を確認してください。";
  }

  const optLabel =
    optimal === null ? "—" : `${optimal}（${method}）`;

  showCompare(`
    <h3>結果の比較（BFS の弱点）</h3>
    <ul>
      <li><strong>歩数（マス数）</strong>: ${hops} ← BFS が実際に最小化するもの</li>
      <li><strong>BFS 経路の経路コスト</strong>: ${bfsCost}（マス上の大きい数字と同じ累積）</li>
      <li><strong>経路コスト最小の理論値</strong>: ${optLabel}</li>
    </ul>
    <p class="result-verdict">${verdict}</p>
    <p class="result-note">
      探索済みマス: 大きい数字 = <strong>歩数（探索の深さ）</strong>、
      小さい <code>c*</code> = <strong>経路コスト</strong>（参考）。マス本来のコストは出しません。
      ${hasNeg ? "負コストは「再訪なし」前提で比較しています。" : ""}
    </p>
  `);

  setStatus(
    `ゴール到達 — 歩数 ${hops} / 経路コスト ${bfsCost}` +
      (optimal !== null && bfsCost > optimal
        ? `（最適 ${optimal} より悪い）`
        : "")
  );
}

function stepOnce() {
  if (finished) return false;

  if (queue.length === 0) {
    finished = true;
    found = false;
    setStatus("経路が見つかりませんでした（行き止まり）");
    stopAuto();
    draw();
    updateDsViz();
    return false;
  }

  const current = queue.shift();
  const curHop = hopDist[current.y][current.x];
  const curPath = pathCost[current.y][current.x] ?? 0;

  if (!isStart(current.x, current.y) && !isGoal(current.x, current.y)) {
    marks[current.y][current.x] = Mark.VISITED;
  }

  if (isGoal(current.x, current.y)) {
    finished = true;
    found = true;
    const path = reconstructPath();
    reportResult(path);
    stopAuto();
    draw();
    updateDsViz();
    return false;
  }

  for (const n of neighbors(current.x, current.y)) {
    const k = key(n.x, n.y);
    if (cameFrom.has(k)) continue;
    cameFrom.set(k, current);
    // 歩数: BFS が使う距離（+1 のみ）
    hopDist[n.y][n.x] = curHop + 1;
    // 経路コスト: 参考表示用。親の経路コスト + 探索セルの通行コスト
    // ※キュー順・訪問判定には使わない（ここが弱点の可視化）
    pathCost[n.y][n.x] = curPath + costs[n.y][n.x];
    queue.push(n);
    if (!isGoal(n.x, n.y)) {
      marks[n.y][n.x] = Mark.FRONTIER;
    }
  }

  setStatus(
    `探索中… (${current.x},${current.y}) 経路コスト=${curPath}（参考） / 歩数=${curHop} / キュー ${queue.length}`
  );
  draw();
  updateDsViz();
  return true;
}

function stopAuto() {
  running = false;
  btnPlay.textContent = "再生";
  if (timerId !== null) {
    clearTimeout(timerId);
    timerId = null;
  }
}

function scheduleNext() {
  if (!running) return;
  const delay = 450 - Number(speedInput.value);
  timerId = setTimeout(() => {
    if (stepOnce()) scheduleNext();
  }, delay);
}

function togglePlay() {
  if (finished) resetSearch();
  if (running) {
    stopAuto();
    setStatus("一時停止");
    return;
  }
  running = true;
  btnPlay.textContent = "一時停止";
  if (stepOnce()) scheduleNext();
}

function canvasCellFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = Math.floor(((e.clientX - rect.left) * scaleX) / CELL);
  const y = Math.floor(((e.clientY - rect.top) * scaleY) / CELL);
  return { x, y };
}

function paintCell(x, y) {
  if (!inBounds(x, y) || isStart(x, y) || isGoal(x, y)) return false;

  if (paintMode === "wall") {
    walls[y][x] = !walls[y][x];
    if (walls[y][x]) {
      // 壁にしたらコストは保持（解除時に戻る）
    }
  } else {
    walls[y][x] = false;
    costs[y][x] = paintMode;
  }
  return true;
}

/** ドラッグ塗り用: wall は ON 固定、コストは上書き */
function paintCellDrag(x, y) {
  if (!inBounds(x, y) || isStart(x, y) || isGoal(x, y)) return false;

  if (paintMode === "wall") {
    walls[y][x] = true;
  } else {
    walls[y][x] = false;
    costs[y][x] = paintMode;
  }
  return true;
}

function afterEdit() {
  // マップ編集後は探索状態をクリア
  stopAuto();
  finished = false;
  found = false;
  clearMarks();
  hopDist[start.y][start.x] = 0;
  pathCost[start.y][start.x] = 0;
  queue = [{ ...start }];
  cameFrom = new Map([[key(start.x, start.y), null]]);
  hideCompare();
  setStatus("マップを更新しました — 再生で探索");
  draw();
  updateDsViz();
}

function onPointerDown(e) {
  if (running) return;
  if (finished) {
    // 編集時は自動で探索結果をクリア
  }
  painting = true;
  canvas.setPointerCapture?.(e.pointerId);
  const { x, y } = canvasCellFromEvent(e);
  if (paintMode === "wall") {
    // クリック1回目はトグル
    if (paintCell(x, y)) afterEdit();
  } else {
    if (paintCellDrag(x, y)) afterEdit();
  }
}

function onPointerMove(e) {
  if (!painting || running) return;
  const { x, y } = canvasCellFromEvent(e);
  if (paintCellDrag(x, y)) afterEdit();
}

function onPointerUp(e) {
  painting = false;
  try {
    canvas.releasePointerCapture?.(e.pointerId);
  } catch {
    /* ignore */
  }
}

function setPaintMode(mode) {
  paintMode = mode;
  for (const btn of paintGroup.querySelectorAll("[data-paint]")) {
    const v = btn.getAttribute("data-paint");
    const active =
      v === "wall" ? mode === "wall" : Number(v) === mode;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  }
}

// イベント
btnPlay.addEventListener("click", togglePlay);
btnStep.addEventListener("click", () => {
  if (running) stopAuto();
  if (finished) resetSearch();
  stepOnce();
});
btnReset.addEventListener("click", () => {
  loadInitialMap();
  resetSearch();
  setStatus("bfs-map.js の初期地図を再読み込みしました");
});

paintGroup.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-paint]");
  if (!btn) return;
  const v = btn.getAttribute("data-paint");
  setPaintMode(v === "wall" ? "wall" : Number(v));
});

canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointercancel", onPointerUp);
canvas.addEventListener("pointerleave", () => {
  painting = false;
});

// 起動
setPaintMode(1);
loadInitialMap();
resetSearch();
loadCsharpSample();
