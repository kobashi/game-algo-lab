/**
 * DOM 操作の薄いラッパ（ステータス・結果パネル・C# 読込）
 */

/**
 * @param {HTMLElement | null} el
 * @returns {(msg: string) => void}
 */
export function createStatus(el) {
  return (msg) => {
    if (el) el.textContent = msg;
  };
}

/**
 * @param {HTMLElement | null} el
 */
export function createResultPanel(el) {
  return {
    hide() {
      if (!el) return;
      el.hidden = true;
      el.innerHTML = "";
    },
    /** @param {string} html */
    show(html) {
      if (!el) return;
      el.hidden = false;
      el.innerHTML = html;
    },
  };
}

/**
 * C# などのテキストサンプルを fetch して pre/code に載せる
 * @param {string} url
 * @param {HTMLElement | null} targetEl
 * @param {string} [fallback]
 */
export async function loadTextSample(
  url,
  targetEl,
  fallback = "// サンプルを読み込めませんでした。"
) {
  if (!targetEl) return;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    targetEl.textContent = await res.text();
  } catch {
    targetEl.textContent = fallback;
  }
}

/**
 * よく使うコントロール要素を id から取得
 * @param {Record<string, string>} ids  論理名 → element id
 */
export function bindElements(ids) {
  /** @type {Record<string, HTMLElement | null>} */
  const out = {};
  for (const [key, id] of Object.entries(ids)) {
    out[key] = document.getElementById(id);
  }
  return out;
}
