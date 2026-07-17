/**
 * 根付き木の水平レイアウト（ゲーム木デモ共通）
 *
 * nodes[id] = { children: string[] }
 * 戻り値 layout[id] = { x, y }（中心座標）
 */

/**
 * @typedef {{ children?: string[] }} TreeNodeLike
 * @typedef {{ x: number, y: number }} Point
 * @typedef {{
 *   nodeWidth?: number,
 *   nodeHeight?: number,
 *   gapX?: number,
 *   gapY?: number,
 *   pad?: number,
 * }} TreeLayoutOptions
 */

/**
 * @param {Record<string, TreeNodeLike>} nodes
 * @param {string} rootId
 * @param {TreeLayoutOptions} [opts]
 * @returns {{
 *   layout: Record<string, Point>,
 *   width: number,
 *   height: number,
 *   nodeWidth: number,
 *   nodeHeight: number,
 * }}
 */
export function layoutTree(nodes, rootId, opts = {}) {
  const NODE_W = opts.nodeWidth ?? 100;
  const NODE_H = opts.nodeHeight ?? 48;
  const GAP_X = opts.gapX ?? 16;
  const GAP_Y = opts.gapY ?? 76;
  const PAD = opts.pad ?? 28;

  /** @type {Record<string, number>} */
  const widthCache = {};

  function subtreeWidth(id) {
    if (widthCache[id] != null) return widthCache[id];
    const n = nodes[id];
    const kids = n?.children ?? [];
    if (!kids.length) {
      widthCache[id] = NODE_W;
      return NODE_W;
    }
    let w = 0;
    kids.forEach((cid, i) => {
      w += subtreeWidth(cid);
      if (i < kids.length - 1) w += GAP_X;
    });
    widthCache[id] = Math.max(NODE_W, w);
    return widthCache[id];
  }

  /** @type {Record<string, Point>} */
  const layout = {};

  function place(id, xLeft, depth) {
    const n = nodes[id];
    const kids = n?.children ?? [];
    const w = subtreeWidth(id);
    const cx = xLeft + w / 2;
    const cy = PAD + depth * GAP_Y + NODE_H / 2;
    layout[id] = { x: cx, y: cy };

    if (!kids.length) return;
    let x = xLeft;
    const childrenSpan = kids.reduce(
      (s, cid, i) => s + subtreeWidth(cid) + (i ? GAP_X : 0),
      0
    );
    if (childrenSpan < w) x = xLeft + (w - childrenSpan) / 2;
    for (const cid of kids) {
      const cw = subtreeWidth(cid);
      place(cid, x, depth + 1);
      x += cw + GAP_X;
    }
  }

  function maxDepth(id) {
    const kids = nodes[id]?.children ?? [];
    if (!kids.length) return 0;
    return 1 + Math.max(...kids.map(maxDepth));
  }

  const tw = subtreeWidth(rootId);
  place(rootId, PAD, 0);
  const height = PAD * 2 + maxDepth(rootId) * GAP_Y + NODE_H;
  const width = tw + PAD * 2;

  return {
    layout,
    width,
    height,
    nodeWidth: NODE_W,
    nodeHeight: NODE_H,
  };
}

/**
 * SVG に viewBox / サイズを設定
 * @param {SVGElement | null} svg
 * @param {number} width
 * @param {number} height
 */
export function applySvgSize(svg, width, height) {
  if (!svg) return;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
}
