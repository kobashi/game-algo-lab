/**
 * 深さ優先探索 (DFS) 可視化デモ
 * - MAP 探索（スタート→ゴール）を再帰 DFS で行う
 * - ステップ実行のためコールスタックを明示的にシミュレート
 * - 行き止まりでフレームを pop = バックトラック
 * - 初期地図: js/maps/dfs-map.js
 */

import { parseMap } from "./map-format.js";
import { INITIAL_MAP } from "./maps/dfs-map.js";
import {
  setPanel,
  renderCallStack,
  renderSet,
  updateParentMapPanels,
  cellLabel,
} from "./ds-viz.js";

const COLS = 14;
const ROWS = 14;
const CELL = 40;

/** 探索方向: 右 → 下 → 左 → 上（袋小路に入りやすい順） */
const DIRS = [
  [1, 0, "右"],
  [0, 1, "下"],
  [-1, 0, "左"],
  [0, -1, "上"],
];

const Mark = {
  NONE: 0,
  ON_PATH: 1, // コールスタック上（現在の経路）
  DEAD: 2, // バックトラック済み
  PATH: 3, // 見つかった解
  CURRENT: 4, // スタックトップ
};

const COLORS = {
  empty: "#0a0e14",
  wall: "#3d4f66",
  start: "#6bcb8f",
  goal: "#e07a5f",
  onPath: "#2a4a6b",
  dead: "#3a3038",
  path: "#f2cc8f",
  current: "#5b9fd4",
  grid: "#1a222d",
  text: "#e8eef6",
  textMuted: "rgba(232, 238, 246, 0.55)",
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

/** @type {number[][]} */
let costs = [];
/** @type {boolean[][]} */
let walls = [];
/** @type {number[][]} */
let marks = [];
/** @type {boolean[][]} 訪問済み（再訪しない） */
let visited = [];
/** @type {number[][]} 深さ（コール深さ）。未到達 -1 */
let depthAt = [];

let start = { x: 1, y: 1 };
let goal = { x: 1, y: 5 };

/**
 * コールスタック（再帰フレーム）
 * @type {{x:number,y:number,nextDir:number,depth:number,phase:'enter'|'explore'}[]}
 */
let callStack = [];
/** @type {Map<string, {x:number,y:number}|null>} */
let cameFrom = new Map();

/** @type {'wall' | -1 | 0 | 1 | 2} */
let paintMode = 1;
let painting = false;
let running = false;
let finished = false;
let found = false;
let timerId = null;
let stepCount = 0;
let maxStackDepth = 0;
let backtrackCount = 0;

function key(x, y) {
  return `${x},${y}`;
}

function inBounds(x, y) {
  return x >= 0 && x < COLS && y >= 0 && y < ROWS;
}

function isWalkable(x, y) {
  return inBounds(x, y) && !walls[y][x];
}

function isStart(x, y) {
  return x === start.x && y === start.y;
}

function isGoal(x, y) {
  return x === goal.x && y === goal.y;
}

function loadInitialMap() {
  const map = parseMap(INITIAL_MAP);
  if (map.cols !== COLS || map.rows !== ROWS) {
    throw new Error(
      `dfs-map.js のサイズは ${COLS}x${ROWS} にしてください（現在 ${map.cols}x${map.rows}）`
    );
  }
  costs = map.costs.map((row) => row.slice());
  walls = map.walls.map((row) => row.slice());
  start = { ...map.start };
  goal = { ...map.goal };
}

function clearSearch() {
  marks = Array.from({ length: ROWS }, () => Array(COLS).fill(Mark.NONE));
  visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  depthAt = Array.from({ length: ROWS }, () => Array(COLS).fill(-1));
  callStack = [];
  cameFrom = new Map();
  stepCount = 0;
  maxStackDepth = 0;
  backtrackCount = 0;
}

function resetSearch() {
  stopAuto();
  finished = false;
  found = false;
  clearSearch();

  // DFS(start) の最初の呼び出しを積む
  callStack.push({
    x: start.x,
    y: start.y,
    nextDir: 0,
    depth: 0,
    phase: "enter",
  });
  cameFrom.set(key(start.x, start.y), null);
  maxStackDepth = 1;

  setStatus("準備完了 — 再帰 DFS。右優先で袋小路に入り、バックトラックします");
  hideCompare();
  draw();
  updateDsViz();
}

function setStatus(text) {
  statusEl.textContent = text;
}

function hideCompare() {
  resultEl.hidden = true;
  resultEl.innerHTML = "";
}

function showCompare(html) {
  resultEl.hidden = false;
  resultEl.innerHTML = html;
}

function syncMarksFromStack() {
  // バックトラック済みは DEAD のまま残し、スタック上を ON_PATH / CURRENT に
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (marks[y][x] === Mark.PATH) continue;
      if (marks[y][x] === Mark.DEAD) continue;
      if (visited[y][x] && marks[y][x] !== Mark.DEAD) {
        // 後でスタックで上書き
        marks[y][x] = Mark.DEAD;
      } else if (!visited[y][x]) {
        marks[y][x] = Mark.NONE;
      }
    }
  }
  for (let i = 0; i < callStack.length; i++) {
    const f = callStack[i];
    const isTop = i === callStack.length - 1;
    if (isStart(f.x, f.y) || isGoal(f.x, f.y)) continue;
    marks[f.y][f.x] = isTop ? Mark.CURRENT : Mark.ON_PATH;
  }
}

function cellFillColor(x, y) {
  if (walls[y][x]) return COLORS.wall;
  if (isStart(x, y)) return COLORS.start;
  if (isGoal(x, y) && found) return COLORS.goal;
  if (isGoal(x, y)) return COLORS.goal;
  const m = marks[y][x];
  if (m === Mark.PATH) return COLORS.path;
  if (m === Mark.CURRENT) return COLORS.current;
  if (m === Mark.ON_PATH) return COLORS.onPath;
  if (m === Mark.DEAD) return COLORS.dead;
  return COLORS.empty;
}

function draw() {
  syncMarksFromStack();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const px = x * CELL;
      const py = y * CELL;
      ctx.fillStyle = cellFillColor(x, y);
      ctx.fillRect(px, py, CELL, CELL);
      ctx.strokeStyle = COLORS.grid;
      ctx.strokeRect(px + 0.5, py + 0.5, CELL - 1, CELL - 1);

      if (walls[y][x]) continue;

      if (isStart(x, y)) {
        ctx.fillStyle = "#0a1018";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("S", px + CELL / 2, py + CELL / 2);
        continue;
      }
      if (isGoal(x, y) && depthAt[y][x] < 0) {
        ctx.fillStyle = "#1a100c";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("G", px + CELL / 2, py + CELL / 2);
        continue;
      }

      const d = depthAt[y][x];
      if (d >= 0) {
        const onSol = marks[y][x] === Mark.PATH;
        ctx.fillStyle = onSol ? "#1a1208" : COLORS.text;
        ctx.font = "bold 12px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(d), px + CELL / 2, py + CELL / 2);
      }
    }
  }
}

function updateDsViz() {
  const frames = callStack.map((f, i) => {
    const next =
      f.nextDir < DIRS.length ? DIRS[f.nextDir][2] : "（終了）";
    return {
      title: `Search${cellLabel(f.x, f.y)}`,
      detail: `depth=${f.depth} next=${next}`,
    };
  });

  const dead = [];
  const onPath = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!visited[y][x]) continue;
      const lab = `${cellLabel(x, y)} d${depthAt[y][x]}`;
      if (marks[y][x] === Mark.DEAD) dead.push(lab);
      else onPath.push(lab);
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
    renderCallStack({
      label: "コールスタック（再帰）",
      frames,
    }) +
      renderSet({
        label: "訪問済み（バックトラック後含む）",
        typeNote: "HashSet / visited",
        items: [...onPath, ...dead.map((s) => s + " ←bt")],
      })
  );
  updateParentMapPanels({
    edges: edgeList,
    root: cellLabel(start.x, start.y),
  });
}

function reconstructPath() {
  const path = [];
  let cur = goal;
  while (cur) {
    path.push(cur);
    cur = cameFrom.get(key(cur.x, cur.y)) ?? null;
  }
  path.reverse();
  for (const p of path) {
    if (isStart(p.x, p.y) || isGoal(p.x, p.y)) continue;
    marks[p.y][p.x] = Mark.PATH;
  }
  return path;
}

function reportResult(path) {
  showCompare(`
    <h3>結果（DFS）</h3>
    <ul>
      <li><strong>経路長（歩数）</strong>: ${Math.max(0, path.length - 1)}</li>
      <li><strong>最大スタック深さ</strong>: ${maxStackDepth}</li>
      <li><strong>バックトラック回数</strong>: ${backtrackCount}</li>
      <li><strong>ステップ数</strong>: ${stepCount}</li>
    </ul>
    <p class="result-verdict">
      再帰が深くなるほどコールスタックが伸び、行き止まりで return（pop）して戻ります。
      最短経路は保証しません（先に見つけた道を返します）。
    </p>
    <p class="result-note">マスの数字 = そのマスに入ったときの再帰の深さ。</p>
  `);
  setStatus(
    `ゴール到達 — 歩数 ${path.length - 1} / 最大深さ ${maxStackDepth} / BT ${backtrackCount}`
  );
}

/**
 * 1 ステップ:
 *  - enter: マスへ「呼び出し」入場（訪問マーク）
 *  - explore: 次の方向を試し、未訪問なら子を push（再帰呼び出し）
 *  - 方向が尽きたら pop（return / バックトラック）
 */
function stepOnce() {
  if (finished) return false;

  if (callStack.length === 0) {
    finished = true;
    found = false;
    setStatus("経路なし — スタックが空になりました");
    stopAuto();
    draw();
    updateDsViz();
    return false;
  }

  stepCount += 1;
  const frame = callStack[callStack.length - 1];

  // --- 呼び出し入場 ---
  if (frame.phase === "enter") {
    visited[frame.y][frame.x] = true;
    depthAt[frame.y][frame.x] = frame.depth;
    frame.phase = "explore";

    if (isGoal(frame.x, frame.y)) {
      finished = true;
      found = true;
      const path = reconstructPath();
      reportResult(path);
      stopAuto();
      draw();
      updateDsViz();
      return false;
    }

    setStatus(
      `呼び出し Search${cellLabel(frame.x, frame.y)} depth=${frame.depth}（入場）`
    );
    draw();
    updateDsViz();
    return true;
  }

  // --- 子の探索（再帰呼び出し） ---
  while (frame.nextDir < DIRS.length) {
    const [dx, dy, name] = DIRS[frame.nextDir];
    frame.nextDir += 1;
    const nx = frame.x + dx;
    const ny = frame.y + dy;
    if (!isWalkable(nx, ny) || visited[ny][nx]) continue;

    cameFrom.set(key(nx, ny), { x: frame.x, y: frame.y });
    callStack.push({
      x: nx,
      y: ny,
      nextDir: 0,
      depth: frame.depth + 1,
      phase: "enter",
    });
    maxStackDepth = Math.max(maxStackDepth, callStack.length);

    setStatus(
      `再帰呼び出し → Search${cellLabel(nx, ny)}（${name}） stack=${callStack.length}`
    );
    draw();
    updateDsViz();
    return true;
  }

  // --- return / バックトラック ---
  callStack.pop();
  backtrackCount += 1;
  if (!isStart(frame.x, frame.y) && !isGoal(frame.x, frame.y)) {
    marks[frame.y][frame.x] = Mark.DEAD;
  }

  setStatus(
    `return Search${cellLabel(frame.x, frame.y)}（バックトラック） stack=${callStack.length}`
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
  } else {
    walls[y][x] = false;
    costs[y][x] = paintMode;
  }
  return true;
}

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
  resetSearch();
  setStatus("マップを更新しました — 再生で探索");
}

function onPointerDown(e) {
  if (running) return;
  painting = true;
  canvas.setPointerCapture?.(e.pointerId);
  const { x, y } = canvasCellFromEvent(e);
  if (paintMode === "wall") {
    if (paintCell(x, y)) afterEdit();
  } else if (paintCellDrag(x, y)) {
    afterEdit();
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
    const active = v === "wall" ? mode === "wall" : Number(v) === mode;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  }
}

async function loadCsharpSample() {
  if (!csharpSample) return;
  try {
    const res = await fetch("../samples/DfsExample.cs");
    if (!res.ok) throw new Error(String(res.status));
    csharpSample.textContent = await res.text();
  } catch {
    csharpSample.textContent =
      "// samples/DfsExample.cs を読み込めませんでした。";
  }
}

btnPlay.addEventListener("click", togglePlay);
btnStep.addEventListener("click", () => {
  if (running) stopAuto();
  if (finished) resetSearch();
  stepOnce();
});
btnReset.addEventListener("click", () => {
  loadInitialMap();
  resetSearch();
  setStatus("dfs-map.js を再読み込みしました");
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

setPaintMode(1);
loadInitialMap();
resetSearch();
loadCsharpSample();
