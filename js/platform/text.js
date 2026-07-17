/**
 * 文字列エスケープ（HTML / SVG / XML）
 * トピック固有ロジックに依存しない共通基盤。
 */

/** @param {unknown} s */
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** SVG 属性・テキスト用（現状 escapeHtml と同型） */
export function escapeXml(s) {
  return escapeHtml(s);
}
