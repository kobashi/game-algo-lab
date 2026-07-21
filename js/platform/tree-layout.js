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
  // やや詰めた既定値（親幅フィット時もラベルが読める密度）
  const NODE_W = opts.nodeWidth ?? 92;
  const NODE_H = opts.nodeHeight ?? 44;
  const GAP_X = opts.gapX ?? 12;
  const GAP_Y = opts.gapY ?? 64;
  const PAD = opts.pad ?? 20;

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
 * SVG に viewBox / サイズを設定。
 * 既定は **コンテナ幅にフィット**（横スクロールを避ける）。
 * 座標レイアウトの width/height は viewBox に載せ、見た目の幅は CSS で 100% にする。
 *
 * @param {SVGElement | null} svg
 * @param {number} width  レイアウト座標の幅
 * @param {number} height レイアウト座標の高さ
 * @param {{ fit?: boolean }} [opts]
 *   fit: true（既定）= 親幅に合わせて縮小。false = 従来どおり絶対ピクセル
 */
export function applySvgSize(svg, width, height, opts = {}) {
  if (!svg) return;
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const fit = opts.fit !== false;

  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  if (fit) {
    // 親の幅に収める。height は aspect-ratio で自動（横スクロールを出さない）
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.style.width = "100%";
    svg.style.maxWidth = "100%";
    svg.style.height = "auto";
    svg.style.aspectRatio = `${w} / ${h}`;
    svg.style.display = "block";
  } else {
    svg.setAttribute("width", String(w));
    svg.setAttribute("height", String(h));
    svg.style.removeProperty("width");
    svg.style.removeProperty("max-width");
    svg.style.removeProperty("height");
    svg.style.removeProperty("aspect-ratio");
  }
}
