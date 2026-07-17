/**
 * 経路探索マップの塗り（コスト / 壁 / 複数ゴール G）
 */

/**
 * @param {HTMLCanvasElement} canvas
 * @param {PointerEvent} e
 * @param {number} cellSize
 * @returns {{ x: number, y: number }}
 */
export function canvasCellFromEvent(canvas, e, cellSize) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = Math.floor(((e.clientX - rect.left) * scaleX) / cellSize);
  const y = Math.floor(((e.clientY - rect.top) * scaleY) / cellSize);
  return { x, y };
}

/**
 * @param {string | null} v  data-paint 属性
 * @returns {'wall' | 'goal' | number}
 */
export function parsePaintMode(v) {
  if (v === "wall" || v === "goal") return v;
  return Number(v);
}

/**
 * @param {HTMLElement | null} paintGroup
 * @param {'wall' | 'goal' | number} mode
 */
export function syncPaintButtons(paintGroup, mode) {
  if (!paintGroup) return;
  for (const btn of paintGroup.querySelectorAll("[data-paint]")) {
    const v = btn.getAttribute("data-paint");
    const active =
      v === "wall" || v === "goal" ? mode === v : Number(v) === mode;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  }
}

/**
 * @param {object} ctx
 * @param {number} ctx.x
 * @param {number} ctx.y
 * @param {boolean} ctx.toggle
 * @param {{x:number,y:number}[]} ctx.goals  破壊的更新
 * @param {boolean[][]} ctx.walls
 * @param {number[][]} ctx.costs
 * @param {{x:number,y:number}} ctx.start
 * @param {(x:number,y:number)=>boolean} ctx.inBounds
 * @param {(x:number,y:number)=>boolean} ctx.isStart
 * @param {(msg:string)=>void} [ctx.setStatus]
 * @returns {boolean}
 */
export function placeGoal(ctx) {
  const { x, y, toggle, goals, walls, costs, start, inBounds, isStart, setStatus } =
    ctx;
  if (!inBounds(x, y) || isStart(x, y)) return false;
  if (x === start.x && y === start.y) return false;

  const idx = goals.findIndex((g) => g.x === x && g.y === y);
  if (idx >= 0) {
    if (!toggle) return false;
    if (goals.length <= 1) {
      setStatus?.("ゴールは最低1つ必要です");
      return false;
    }
    goals.splice(idx, 1);
    walls[y][x] = false;
    costs[y][x] = 1;
    return true;
  }
  walls[y][x] = false;
  costs[y][x] = 0;
  goals.push({ x, y });
  return true;
}

/**
 * @param {object} ctx
 * @param {number} ctx.x
 * @param {number} ctx.y
 * @param {'wall'|'goal'|number} ctx.paintMode
 * @param {boolean} ctx.drag  ドラッグ中（壁は ON 固定、ゴールは追加のみ）
 * @param {boolean[][]} ctx.walls
 * @param {number[][]} ctx.costs
 * @param {{x:number,y:number}[]} ctx.goals
 * @param {{x:number,y:number}} ctx.start
 * @param {(x:number,y:number)=>boolean} ctx.inBounds
 * @param {(x:number,y:number)=>boolean} ctx.isStart
 * @param {(x:number,y:number)=>boolean} ctx.isGoal
 * @param {(msg:string)=>void} [ctx.setStatus]
 * @returns {boolean}
 */
export function paintMapCell(ctx) {
  const {
    x,
    y,
    paintMode,
    drag,
    walls,
    costs,
    goals,
    start,
    inBounds,
    isStart,
    isGoal,
    setStatus,
  } = ctx;

  if (!inBounds(x, y) || isStart(x, y)) return false;

  if (paintMode === "goal") {
    return placeGoal({
      x,
      y,
      toggle: !drag,
      goals,
      walls,
      costs,
      start,
      inBounds,
      isStart,
      setStatus,
    });
  }

  if (isGoal(x, y)) return false;

  if (paintMode === "wall") {
    walls[y][x] = drag ? true : !walls[y][x];
  } else {
    walls[y][x] = false;
    costs[y][x] = /** @type {number} */ (paintMode);
  }
  return true;
}

/**
 * 塗り UI を canvas + ボタン群にバインド
 * @param {object} opts
 * @param {HTMLCanvasElement} opts.canvas
 * @param {HTMLElement} opts.paintGroup
 * @param {number} opts.cellSize
 * @param {() => boolean} opts.isBusy  探索中など
 * @param {() => object} opts.getContext  paintMapCell 用コンテキスト（paintMode/drag 除く）
 * @param {() => void} opts.onEdit
 * @param {(msg:string)=>void} [opts.setStatus]
 * @param {'wall'|'goal'|number} [opts.initialMode]
 */
export function bindMapPaint(opts) {
  const {
    canvas,
    paintGroup,
    cellSize,
    isBusy,
    getContext,
    onEdit,
    setStatus,
    initialMode = 1,
  } = opts;

  /** @type {'wall'|'goal'|number} */
  let paintMode = initialMode;
  let painting = false;

  function setPaintMode(mode) {
    paintMode = mode;
    syncPaintButtons(paintGroup, mode);
  }

  function apply(x, y, drag) {
    const base = getContext();
    const changed = paintMapCell({
      ...base,
      x,
      y,
      paintMode,
      drag,
      setStatus,
    });
    if (changed) onEdit();
    return changed;
  }

  function onPointerDown(e) {
    if (isBusy()) return;
    painting = true;
    canvas.setPointerCapture?.(e.pointerId);
    const { x, y } = canvasCellFromEvent(canvas, e, cellSize);
    // 壁のクリックはトグル（drag=false）
    apply(x, y, paintMode !== "wall");
  }

  function onPointerMove(e) {
    if (!painting || isBusy()) return;
    const { x, y } = canvasCellFromEvent(canvas, e, cellSize);
    apply(x, y, true);
  }

  function onPointerUp(e) {
    painting = false;
    try {
      canvas.releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  paintGroup.addEventListener("click", (e) => {
    const btn = /** @type {HTMLElement} */ (e.target).closest?.("[data-paint]");
    if (!btn) return;
    setPaintMode(parsePaintMode(btn.getAttribute("data-paint")));
  });

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("pointerleave", () => {
    painting = false;
  });

  setPaintMode(initialMode);

  return {
    get paintMode() {
      return paintMode;
    },
    setPaintMode,
  };
}
