/**
 * Game Algo Lab — 共通基盤（platform）
 *
 * 新規トピックは可能な限りここを import し、
 * アルゴリズム固有の step / draw だけを js/<id>.js に書く。
 *
 * @see docs/PLATFORM.md
 * @see docs/templates/TOPIC_SCAFFOLD.md
 */

export { escapeHtml, escapeXml } from "./text.js";
export {
  createStatus,
  createResultPanel,
  loadTextSample,
  bindElements,
} from "./dom.js";
export { createPlayback } from "./playback.js";
export { mulberry32, randomIndex } from "./rng.js";
export { layoutTree, applySvgSize } from "./tree-layout.js";
export {
  canvasCellFromEvent,
  parsePaintMode,
  syncPaintButtons,
  placeGoal,
  paintMapCell,
  bindMapPaint,
} from "./grid-paint.js";
export {
  PF,
  PF_COLORS,
  createGridOps,
  applyParsedMap,
  drawPathfindingGrid,
  drawDefaultCellLabel,
  drawScorePair,
} from "./pathfinding-grid.js";
export {
  NAV_GROUPS,
  FOOTER_RELATED,
  FOOTER_NOTES,
  mountSiteHeader,
  mountSiteFooter,
  mountSiteHeaderFromDataset,
  mountTopicShellFromDataset,
} from "./topic-shell.js";
export {
  MATURITY_ORDER,
  MATURITY_LABEL,
  MATURITY_HINT,
  TOPIC_META,
  TOPIC_MATURITY,
  resolveTopicMeta,
  resolveMaturity,
  normalizeMaturityMeta,
  maturityLabel,
  maturityHint,
  formatMaturityDetail,
  countByMaturity,
  createMaturityBadge,
  mountPageMaturity,
} from "./maturity.js";
