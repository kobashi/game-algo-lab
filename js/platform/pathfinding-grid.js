/**
 * 経路探索グリッドの共通定数・幾何・下地描画
 * セル上の数値ラベルはトピック側（onCell）で描く。
 */

export const PF = {
  COLS: 14,
  ROWS: 14,
  CELL: 40,
};

/** 経路探索デモ共通の配色 */
export const PF_COLORS = {
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
  open: "#3d6a8a",
  closed: "#2a4a6b",
  costTint: {
    [-1]: "rgba(107, 203, 143, 0.22)",
    0: "rgba(91, 159, 212, 0.18)",
    1: "transparent",
    2: "rgba(224, 122, 95, 0.28)",
  },
};

/**
 * @param {number} cols
 * @param {number} rows
 */
export function createGridOps(cols, rows) {
  function key(x, y) {
    return `${x},${y}`;
  }

  function inBounds(x, y) {
    return x >= 0 && x < cols && y >= 0 && y < rows;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {boolean[][]} walls
   */
  function isWalkable(x, y, walls) {
    return inBounds(x, y) && !walls[y][x];
  }

  /**
   * 4 近傍
   * @param {number} x
   * @param {number} y
   * @param {boolean[][]} walls
   * @returns {{x:number,y:number}[]}
   */
  function neighbors(x, y, walls) {
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
      if (isWalkable(nx, ny, walls)) result.push({ x: nx, y: ny });
    }
    return result;
  }

  return { key, inBounds, isWalkable, neighbors, cols, rows };
}

/**
 * 地図パース結果を検証してコピー
 * @param {ReturnType<import('../map-format.js').parseMap>} map
 * @param {number} cols
 * @param {number} rows
 * @param {string} mapFileLabel
 */
export function applyParsedMap(map, cols, rows, mapFileLabel) {
  if (map.cols !== cols || map.rows !== rows) {
    throw new Error(
      `${mapFileLabel} のサイズは ${cols}x${rows} にしてください（現在 ${map.cols}x${map.rows}）`
    );
  }
  return {
    costs: map.costs.map((row) => row.slice()),
    walls: map.walls.map((row) => row.slice()),
    start: { ...map.start },
    goals: map.goals.map((g) => ({ ...g })),
  };
}

/**
 * @typedef {object} DrawGridOptions
 * @property {CanvasRenderingContext2D} ctx
 * @property {number} cols
 * @property {number} rows
 * @property {number} cell
 * @property {typeof PF_COLORS} [colors]
 * @property {boolean[][]} walls
 * @property {number[][]} costs
 * @property {number[][]} marks
 * @property {number} markNone  Mark.NONE の値
 * @property {(x:number,y:number)=>boolean} isStart
 * @property {(x:number,y:number)=>boolean} isGoal
 * @property {(x:number,y:number)=>string} fillColor  セルのベース色
 * @property {(info: {
 *   x: number, y: number, px: number, py: number, cell: number,
 *   isWall: boolean, isStart: boolean, isGoal: boolean
 * }) => void} [onCell]  ラベル等（壁以外でも呼ばれる。壁は isWall:true）
 */

/**
 * 下地（塗り・コスト色味・グリッド線）を描き、各マスで onCell を呼ぶ
 * @param {DrawGridOptions} opts
 */
export function drawPathfindingGrid(opts) {
  const {
    ctx,
    cols,
    rows,
    cell,
    colors = PF_COLORS,
    walls,
    costs,
    marks,
    markNone,
    isStart,
    isGoal,
    fillColor,
    onCell,
  } = opts;

  const w = cols * cell;
  const h = rows * cell;
  ctx.clearRect(0, 0, w, h);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = x * cell;
      const py = y * cell;
      const wall = walls[y][x];
      const start = isStart(x, y);
      const goal = isGoal(x, y);

      ctx.fillStyle = fillColor(x, y);
      ctx.fillRect(px, py, cell, cell);

      if (!wall && !start && !goal && marks[y][x] === markNone) {
        const tint = colors.costTint[costs[y][x]];
        if (tint && tint !== "transparent") {
          ctx.fillStyle = tint;
          ctx.fillRect(px, py, cell, cell);
        }
      }

      ctx.strokeStyle = colors.grid;
      ctx.strokeRect(px + 0.5, py + 0.5, cell - 1, cell - 1);

      onCell?.({
        x,
        y,
        px,
        py,
        cell,
        isWall: wall,
        isStart: start,
        isGoal: goal,
      });
    }
  }
}

/**
 * 未探索マスのコスト数字 / S / G の簡易ラベル
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} info
 * @param {number} cost
 * @param {typeof PF_COLORS} [colors]
 */
export function drawDefaultCellLabel(ctx, info, cost, colors = PF_COLORS) {
  const { px, py, cell, isWall, isStart, isGoal } = info;
  if (isWall) return;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (isStart) {
    ctx.fillStyle = "#0a1018";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("S", px + cell / 2, py + cell / 2);
    return;
  }
  if (isGoal) {
    ctx.fillStyle = "#1a100c";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("G", px + cell / 2, py + cell / 2);
    return;
  }

  ctx.fillStyle = colors.textMuted;
  ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(String(cost), px + cell / 2, py + cell / 2);
}
