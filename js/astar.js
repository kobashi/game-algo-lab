/**
 * A* 探索 可視化デモ
 * - 通行コストは g にそのまま加算（-1 も同じ式で扱う）
 * - f(n) = g(n) + h(n) が最小のノードから展開
 * - 初期地図は js/maps/astar-map.js をエディタで直接編集する
 */

import { parseMap } from "./map-format.js";
import { INITIAL_MAP } from "./maps/astar-map.js";
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
} from "./platform/index.js";

const COLS = 14;
const ROWS = 14;
const CELL = 40;

const Mark = {
  NONE: 0,
  CLOSED: 1, // 探索済み（クローズド）
  OPEN: 2, // オープン集合
  PATH: 3,
};

const COLORS = {
  empty: "#0a0e14",
  wall: "#3d4f66",
  start: "#6bcb8f",
  goal: "#e07a5f",
  closed: "#2a4a6b",
  open: "#5b9fd4",
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

/**
 * 全コストが非負かつ h 倍率がその最小値なら、格子上で許容的になりやすい。
 * -1（報酬）があると真の残りコストは見積りより小さくなり得り、最適を逃しうる。
 */
function heuristicConfig() {
  const scale = minNonNegativeCost();
  const neg = hasNegativeCost();
  const admissible = !neg;
  let label = `h = マンハッタン × ${scale}（非負コストの最小）`;
  if (neg) {
    label += " ※-1は g に加算。報酬路を見積もれず最適を逃しうる";
  }
  return { scale, admissible, label };
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

function heuristic(x, y) {
  return manhattan(x, y) * heuristicConfig().scale;
}

function updateHInfo() {
  const cfg = heuristicConfig();
  if (hInfoEl) {
    hInfoEl.textContent = cfg.label;
    hInfoEl.classList.toggle("h-info-warn", !cfg.admissible);
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

/** js/maps/astar-map.js の INITIAL_MAP から読み込む */
function loadInitialMap() {
  const map = parseMap(INITIAL_MAP);
  if (map.cols !== COLS || map.rows !== ROWS) {
    throw new Error(
      `astar-map.js のサイズは ${COLS}x${ROWS} にしてください（現在 ${map.cols}x${map.rows}）`
    );
  }
  costs = map.costs.map((row) => row.slice());
  walls = map.walls.map((row) => row.slice());
  start = { ...map.start };
  goals = map.goals.map((g) => ({ ...g }));
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

/** f 最小、同点なら g が大きい方（ゴールに近い見込み）を優先 */
function popBestOpen() {
  if (openSet.length === 0) return null;
  let bestI = 0;
  for (let i = 1; i < openSet.length; i++) {
    const a = openSet[i];
    const b = openSet[bestI];
    const fa = fScore[a.y][a.x] ?? Infinity;
    const fb = fScore[b.y][b.x] ?? Infinity;
    if (fa < fb) {
      bestI = i;
    } else if (fa === fb) {
      const ga = gScore[a.y][a.x] ?? Infinity;
      const gb = gScore[b.y][b.x] ?? Infinity;
      if (ga > gb) bestI = i;
    }
  }
  const [node] = openSet.splice(bestI, 1);
  openKeys.delete(key(node.x, node.y));
  return node;
}

function setNodeScores(x, y, g) {
  const h = heuristic(x, y);
  gScore[y][x] = g;
  hScore[y][x] = h;
  fScore[y][x] = g + h;
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

  setStatus("準備完了 — 初期地図は js/maps/astar-map.js を編集。再生で探索");
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
      label: "オープン集合",
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
    "../samples/AStarExample.cs",
    csharpSample,
    "// samples/AStarExample.cs を読み込めませんでした。"
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
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const px = x * CELL;
      const py = y * CELL;

      ctx.fillStyle = cellFillColor(x, y);
      ctx.fillRect(px, py, CELL, CELL);

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

      if (walls[y][x]) continue;

      const g = gScore[y][x];
      const h = hScore[y][x];
      const f = fScore[y][x];
      const scored = g !== null;
      const onPath = marks[y][x] === Mark.PATH;
      const darkText = onPath || isStart(x, y) || (isGoal(x, y) && scored);

      if (scored && !isStart(x, y)) {
        ctx.fillStyle = darkText ? "#1a1208" : COLORS.text;
        ctx.font = "bold 12px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(f), px + CELL / 2, py + CELL / 2 - 6);

        ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillStyle = darkText
          ? "rgba(26, 18, 8, 0.72)"
          : COLORS.textMuted;
        ctx.fillText(`g${g} h${h}`, px + CELL / 2, py + CELL / 2 + 8);
      } else if (!isStart(x, y) && !isGoal(x, y)) {
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
        ctx.fillText("S", px + CELL / 2, py + CELL / 2 - 5);
        if (f !== null) {
          ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
          ctx.fillText(`f${f}`, px + CELL / 2, py + CELL / 2 + 9);
        }
      } else if (isGoal(x, y) && !scored) {
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
  const bfsCost = bfsPathCost();
  const optimal = optimalSimplePathCost();
  const cfg = heuristicConfig();
  const neg = hasNegativeCost();

  let verdict = "";
  if (optimal !== null && gGoal > optimal) {
    verdict = `⚠ 最適は g=${optimal} ですが、A* は g=${gGoal} の経路でゴールを閉じました（差 ${gGoal - optimal}）。`;
    if (neg) {
      verdict +=
        " -1 は高コストを打ち消す報酬として g に効きますが、h は非負コストだけから見積もるため報酬路を後回しにし、見逃します。";
    } else if (!cfg.admissible) {
      verdict += " h が真の残りを上回ると、最初に閉じたゴールが最適とは限りません。";
    }
  } else if (optimal !== null && gGoal === optimal) {
    verdict = neg
      ? "今回は最適と一致しました。報酬の置き方によっては見逃すことがあります。"
      : "このマップでは A* の経路コストは最適と一致しました。";
  } else if (bfsCost !== null && gGoal < bfsCost) {
    verdict = `同一地図の BFS 経路コストは ${bfsCost} で、A* の方が有利です。`;
  } else if (bfsCost !== null) {
    verdict = `同一地図の BFS 経路コストは ${bfsCost} です。`;
  }

  showCompare(`
    <h3>結果（A*）</h3>
    <ul>
      <li><strong>経路コスト g(ゴール)</strong>: ${gGoal}</li>
      <li><strong>真の最適（再訪なし）</strong>: ${optimal === null ? "—" : optimal}</li>
      <li><strong>歩数</strong>: ${hops}</li>
      <li><strong>展開ノード数</strong>: ${expandCount}</li>
      <li><strong>ヒューリスティック</strong>: h = マンハッタン × ${cfg.scale}</li>
    </ul>
    <p class="result-verdict">${verdict}</p>
    <p class="result-note">
      大きい数字 = <strong>f = g + h</strong>。小 = <strong>g</strong> / <strong>h</strong>。
      -1 も含め、進入コストはすべて同じ式で g に加算しています。
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
    `展開中… (${current.x},${current.y}) f=${curF} g=${curG} h=${hScore[current.y][current.x]} / open ${openSet.length}`
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
  setStatus("astar-map.js の初期地図を再読み込みしました");
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
