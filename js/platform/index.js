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
