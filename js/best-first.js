/**
 * 最良優先探索 可視化デモ
 * - 通行コストは g にそのまま加算（-1 も同じ式で扱う）
 * - 優先度 = h(n) のみ（実コスト g は展開順に使わない）
 * - 初期地図は js/maps/best-first-map.js をエディタで直接編集する
 */

import { parseMap } from "./map-format.js";
import { INITIAL_MAP } from "./maps/best-first-map.js";
import {
  setPanel,
  renderPriorityOpen,
  renderSet,
  updateParentMapPanels,
  cellLabel,
} from "./ds-viz.js";
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
} from "./platform/index.js";

mountTopicShellFromDataset();

const COLS = PF.COLS;
const ROWS = PF.ROWS;
const CELL = PF.CELL;

const Mark = {
  NONE: 0,
  CLOSED: 1, // 探索済み（クローズド）
  OPEN: 2, // オープン集合
  PATH: 3,
};

const COLORS = PF_COLORS;
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
const hInfoEl = document.getElementById("h-info");
const speedInput = document.getElementById("speed");
const btnPlay = document.getElementById("btn-play");
const btnStep = document.getElementById("btn-step");
const btnReset = document.getElementById("btn-reset");
const paintGroup = document.getElementById("paint-tools");
const dsPanels = document.getElementById("ds-panels");
const csharpSample = document.getElementById("csharp-sample");

/** @type {number[][]} 通行コスト (-1, 0, 1, 2) — g に加算 */
let costs = [];
/** @type {boolean[][]} */
let walls = [];
/** @type {number[][]} */
let marks = [];
/** @type {(number|null)[][]} スタートからの経路コスト g */
let gScore = [];
/** @type {(number|null)[][]} ヒューリスティック h */
let hScore = [];
/** @type {(number|null)[][]} f = g + h */
let fScore = [];

let start = { x: 1, y: 1 };
/** @type {{x:number,y:number}[]} ゴールは複数可。いずれかに到達で成功 */
let goals = [{ x: COLS - 2, y: ROWS - 2 }];
/** 到達したゴール（経路復元用） */
let foundGoal = null;

/** オープン集合（配列 + 都度最小 f を選択。教材用の単純実装） */
/** @type {{x:number,y:number}[]} */
let openSet = [];
/** @type {Set<string>} */
let openKeys = new Set();
/** @type {Set<string>} */
let closedSet = new Set();
/** @type {Map<string, {x:number,y:number}|null>} */
let cameFrom = new Map();

let finished = false;
let found = false;
let expandCount = 0;





function isStart(x, y) {
  return x === start.x && y === start.y;
}

function isGoal(x, y) {
  return goals.some((g) => g.x === x && g.y === y);
}

function hasNegativeCost() {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!walls[y][x] && costs[y][x] < 0) return true;
    }
  }
  return false;
}

/**
 * h の倍率 = マップ上の「非負」通行コストの最小値（-1 は倍率に使わない）
 * スタート / ゴールの 0 は倍率に含めない（地形コストだけ見る）
 * -1 があっても A* の式は同じ。g には -1 をそのまま加算する。
 */
function minNonNegativeCost() {
  let min = Infinity;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (walls[y][x] || isStart(x, y) || isGoal(x, y)) continue;
      const c = costs[y][x];
      if (c >= 0) min = Math.min(min, c);
    }
  }
  return min === Infinity ? 1 : min;
}

/** 最も近いゴールまでのマンハッタン距離 */
function manhattan(x, y) {
  let best = Infinity;
  for (const g of goals) {
    const d = Math.abs(x - g.x) + Math.abs(y - g.y);
    if (d < best) best = d;
  }
  return best === Infinity ? 0 : best;
}

/** ヒューリスティック（ゴールまでの見積り）。最良優先探索ではこれだけを優先度に使う */
function heuristic(x, y) {
  return manhattan(x, y) * minNonNegativeCost();
}

function updateHInfo() {
  const scale = minNonNegativeCost();
  if (hInfoEl) {
    hInfoEl.textContent = `優先度 = h = マンハッタン × ${scale}（g は展開順に使わない）`;
    hInfoEl.classList.add("h-info-warn");
  }
}

function clearScores() {
  marks = Array.from({ length: ROWS }, () => Array(COLS).fill(Mark.NONE));
  gScore = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  hScore = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  fScore = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  openSet = [];
  openKeys = new Set();
  closedSet = new Set();
  cameFrom = new Map();
  expandCount = 0;
}

/** js/maps/best-first-map.js の INITIAL_MAP から読み込む */
function loadInitialMap() {
  const applied = applyParsedMap(parseMap(INITIAL_MAP), COLS, ROWS, "best-first-map.js");
  costs = applied.costs;
  walls = applied.walls;
  start = applied.start;
  goals = applied.goals;
  foundGoal = null;
}

function pushOpen(x, y) {
  const k = key(x, y);
  if (openKeys.has(k)) return;
  openKeys.add(k);
  openSet.push({ x, y });
  if (!isStart(x, y) && !isGoal(x, y)) {
    marks[y][x] = Mark.OPEN;
  }
}

function removeOpen(x, y) {
  const k = key(x, y);
  openKeys.delete(k);
  openSet = openSet.filter((n) => !(n.x === x && n.y === y));
}

/** 最良優先探索: h が最小のノードを展開（g は見ない） */
function popBestOpen() {
  if (openSet.length === 0) return null;
  let bestI = 0;
  for (let i = 1; i < openSet.length; i++) {
    const a = openSet[i];
    const b = openSet[bestI];
    const ha = hScore[a.y][a.x] ?? Infinity;
    const hb = hScore[b.y][b.x] ?? Infinity;
    if (ha < hb) bestI = i;
  }
  const [node] = openSet.splice(bestI, 1);
  openKeys.delete(key(node.x, node.y));
  return node;
}

function setNodeScores(x, y, g) {
  const h = heuristic(x, y);
  gScore[y][x] = g; // 経路コストの記録用（優先度には未使用）
  hScore[y][x] = h;
  fScore[y][x] = h; // 表示上の「優先度」= h
}

function resetSearch() {
  stopAuto();
  finished = false;
  found = false;
  foundGoal = null;
  clearScores();
  updateHInfo();

  setNodeScores(start.x, start.y, 0);
  cameFrom.set(key(start.x, start.y), null);
  pushOpen(start.x, start.y);

  setStatus("準備完了 — 初期地図は js/maps/best-first-map.js を編集。再生で探索");
  hideCompare();
  draw();
  updateDsViz();
}

const setStatus = createStatus(statusEl);

function updateDsViz() {
  const openItems = openSet.map((c) => ({
    key: cellLabel(c.x, c.y),
    f: fScore[c.y][c.x] ?? 0,
    g: gScore[c.y][c.x] ?? 0,
    h: hScore[c.y][c.x] ?? 0,
  }));

  const closedItems = [...closedSet].map((k) => {
    const [x, y] = k.split(",").map(Number);
    const g = gScore[y][x];
    return g !== null && g !== undefined
      ? `${cellLabel(x, y)} g${g}`
      : cellLabel(x, y);
  });

  const edgeList = [];
  for (const [k, parent] of cameFrom.entries()) {
    if (!parent) continue;
    const [cx, cy] = k.split(",").map(Number);
    edgeList.push({ to: cellLabel(cx, cy), from: cellLabel(parent.x, parent.y) });
  }

  setPanel(
    dsPanels,
    renderPriorityOpen({
      label: "オープン集合（h 最小が次）",
      items: openItems,
    }) +
      renderSet({
        label: "クローズド集合",
        typeNote: "HashSet / closed",
        items: closedItems,
      })
  );
  updateParentMapPanels({
    edges: edgeList,
    root: cellLabel(start.x, start.y),
  });
}

function loadCsharpSample() {
  loadTextSample(
    "../samples/BestFirstExample.cs",
    csharpSample,
    "// samples/BestFirstExample.cs を読み込めませんでした。"
  );
}

const resultPanel = createResultPanel(resultEl);
function hideCompare() {
  resultPanel.hide();
}
function showCompare(html) {
  resultPanel.show(html);
}

function cellFillColor(x, y) {
  if (walls[y][x]) return COLORS.wall;
  if (isStart(x, y)) return COLORS.start;
  if (isGoal(x, y)) return COLORS.goal;
  const m = marks[y][x];
  if (m === Mark.PATH) return COLORS.path;
  if (m === Mark.OPEN) return COLORS.open;
  if (m === Mark.CLOSED) return COLORS.closed;
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
      const g = gScore[y][x];
      const h = hScore[y][x];
      const f = fScore[y][x];
      const scored = g !== null;
      const onPath = marks[y][x] === Mark.PATH;
      const darkText = onPath || st || (gl && scored);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (scored && !st) {
        ctx.fillStyle = darkText ? "#1a1208" : COLORS.text;
        ctx.font = "bold 12px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillText(String(h), px + cell / 2, py + cell / 2 - 6);
        ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillStyle = darkText ? "rgba(26, 18, 8, 0.72)" : COLORS.textMuted;
        ctx.fillText("h", px + cell / 2, py + cell / 2 + 8);
      } else if (!st && !gl) {
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillText(String(costs[y][x]), px + cell / 2, py + cell / 2);
      } else if (st) {
        ctx.fillStyle = "#0a1018";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText("S", px + cell / 2, py + cell / 2 - 5);
        if (h !== null) {
          ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
          ctx.fillText(`h${h}`, px + cell / 2, py + cell / 2 + 9);
        }
      } else if (gl && !scored) {
        ctx.fillStyle = "#1a100c";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText("G", px + cell / 2, py + cell / 2);
      }

    },
  });
}

function getPathCells() {
  const path = [];
  let current = foundGoal;
  if (!current) return path;
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

function pathHops(path) {
  return Math.max(0, path.length - 1);
}

/** 同じ地図で BFS した場合の歩数最少経路の経路コスト（比較用） */
function bfsPathCost() {
  const q = [{ ...start }];
  const parent = new Map([[key(start.x, start.y), null]]);
  let head = 0;
  let end = null;
  while (head < q.length) {
    const cur = q[head++];
    if (isGoal(cur.x, cur.y)) {
      end = cur;
      break;
    }
    for (const n of neighbors(cur.x, cur.y)) {
      const k = key(n.x, n.y);
      if (parent.has(k)) continue;
      parent.set(k, cur);
      q.push(n);
    }
  }
  if (!end) return null;

  let sum = 0;
  let cur = end;
  while (cur) {
    const p = parent.get(key(cur.x, cur.y));
    if (p) sum += costs[cur.y][cur.x];
    cur = p;
  }
  return sum;
}

/** 再訪なしの最小経路コスト（教材用の真値比較） */
function optimalSimplePathCost() {
  let walkable = 0;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!walls[y][x]) walkable += 1;
    }
  }
  if (walkable > 80) return null;

  let best = Infinity;
  const vis = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const t0 = performance.now();

  function dfs(x, y, acc) {
    if (performance.now() - t0 > 80) return;
    if (acc >= best) return;
    if (isGoal(x, y)) {
      best = acc;
      return;
    }
    for (const n of neighbors(x, y)) {
      if (vis[n.y][n.x]) continue;
      vis[n.y][n.x] = true;
      const step = isStart(n.x, n.y) ? 0 : costs[n.y][n.x];
      dfs(n.x, n.y, acc + step);
      vis[n.y][n.x] = false;
    }
  }

  vis[start.y][start.x] = true;
  dfs(start.x, start.y, 0);
  return best === Infinity ? null : best;
}

function reportResult(path) {
  const hops = pathHops(path);
  const gGoal = foundGoal ? gScore[foundGoal.y][foundGoal.x] : null;
  const optimal = optimalSimplePathCost();
  const scale = minNonNegativeCost();

  let verdict = "";
  if (optimal !== null && gGoal > optimal) {
    verdict = `⚠ 最適は g=${optimal} ですが、最良優先探索は g=${gGoal} の経路を選びました（差 ${gGoal - optimal}）。h だけ見るとゴール方向の「高コスト短絡」に引き込まれます。`;
  } else if (optimal !== null && gGoal === optimal) {
    verdict =
      "今回は最適と一致しました。コスト差のある迂回路を置くと、h 優先の弱点が見えやすくなります。";
  } else {
    verdict = "h のみの優先は最適を保証しません。次の A* は g と h の両方を使います。";
  }

  showCompare(`
    <h3>結果（最良優先探索）</h3>
    <ul>
      <li><strong>経路コスト g(ゴール)</strong>: ${gGoal}（記録のみ・優先度には未使用）</li>
      <li><strong>真の最適（再訪なし）</strong>: ${optimal === null ? "—" : optimal}</li>
      <li><strong>歩数</strong>: ${hops}</li>
      <li><strong>展開ノード数</strong>: ${expandCount}</li>
      <li><strong>優先度</strong>: h = マンハッタン × ${scale}</li>
    </ul>
    <p class="result-verdict">${verdict}</p>
    <p class="result-note">
      大きい数字 = <strong>h</strong>。小 = <strong>g</strong>（参考）。
      A* は f = g + h にすることで、この貪欲さに実コストの補正を入れます。
    </p>
  `);

  setStatus(
    `ゴール到達 — g=${gGoal}` +
      (optimal !== null && gGoal > optimal
        ? `（最適 ${optimal} を見逃し）`
        : "") +
      ` / 歩数 ${hops} / 展開 ${expandCount}`
  );
}

function stepOnce() {
  if (finished) return false;

  if (openSet.length === 0) {
    finished = true;
    found = false;
    setStatus("経路が見つかりませんでした（オープン集合が空）");
    stopAuto();
    draw();
    updateDsViz();
    return false;
  }

  const current = popBestOpen();
  if (!current) return false;

  const ck = key(current.x, current.y);
  closedSet.add(ck);
  expandCount += 1;

  if (!isStart(current.x, current.y) && !isGoal(current.x, current.y)) {
    marks[current.y][current.x] = Mark.CLOSED;
  }

  const curG = gScore[current.y][current.x] ?? 0;
  const curF = fScore[current.y][current.x] ?? 0;

  if (isGoal(current.x, current.y)) {
    finished = true;
    found = true;
    foundGoal = { x: current.x, y: current.y };
    const path = reconstructPath();
    reportResult(path);
    stopAuto();
    draw();
    updateDsViz();
    return false;
  }

  for (const n of neighbors(current.x, current.y)) {
    const nk = key(n.x, n.y);
    if (closedSet.has(nk)) continue;

    // 進入コスト = 行き先マスの通行コスト（スタート以外）
    const stepCost = isStart(n.x, n.y) ? 0 : costs[n.y][n.x];
    const tentativeG = curG + stepCost;

    const prevG = gScore[n.y][n.x];
    if (prevG !== null && tentativeG >= prevG) continue;

    cameFrom.set(nk, current);
    setNodeScores(n.x, n.y, tentativeG);

    if (!openKeys.has(nk)) {
      pushOpen(n.x, n.y);
    } else {
      // 既にオープンでも g が改善されたので f は更新済み。色は OPEN のまま
      if (!isGoal(n.x, n.y)) marks[n.y][n.x] = Mark.OPEN;
    }
  }

  setStatus(
    `展開中… (${current.x},${current.y}) h=${hScore[current.y][current.x]} g=${curG}（参考） / open ${openSet.length}`
  );
  draw();
  updateDsViz();
  return true;
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
  finished = false;
  found = false;
  clearScores();
  updateHInfo();
  setNodeScores(start.x, start.y, 0);
  cameFrom.set(key(start.x, start.y), null);
  pushOpen(start.x, start.y);
  hideCompare();
  setStatus("マップを更新しました — 再生で探索");
  draw();
  updateDsViz();
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
  setStatus("best-first-map.js を再読み込みしました");
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
  initialMode: 1,
});

loadInitialMap();
resetSearch();
loadCsharpSample();
