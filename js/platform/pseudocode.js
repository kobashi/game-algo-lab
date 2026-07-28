/**
 * 疑似コードパネル — 実行ステップと行ハイライトを同期
 */
import { escapeHtml } from "./text.js";

/**
 * @typedef {{ id: string, text: string }} PseudoLine
 */

/**
 * @param {HTMLElement | null} root
 * @param {{ lines: PseudoLine[], title?: string }} opts
 * @returns {{
 *   setActive: (id: string | null) => void,
 *   getActive: () => string | null,
 *   el: HTMLElement | null,
 * }}
 */
export function createPseudocode(root, opts) {
  if (!root) {
    return {
      setActive() {},
      getActive: () => null,
      el: null,
    };
  }

  const { lines, title = "疑似コード（実行同期）" } = opts;
  /** @type {string | null} */
  let activeId = null;

  root.classList.add("pseudo-panel");
  root.innerHTML = `
    <h3 class="pseudo-title">${escapeHtml(title)}</h3>
    <ol class="pseudo-list" role="list">
      ${lines
        .map(
          (line, i) =>
            `<li class="pseudo-line" data-pseudo-id="${escapeHtml(line.id)}" data-i="${i}">
              <span class="pseudo-num">${i + 1}</span>
              <code class="pseudo-text">${escapeHtml(line.text)}</code>
            </li>`
        )
        .join("")}
    </ol>
    <p class="pseudo-caption footer-muted">強調行 = いまのステップで実行中の処理</p>
  `;

  /**
   * @param {string | null} id
   */
  function setActive(id) {
    activeId = id;
    root.querySelectorAll(".pseudo-line").forEach((li) => {
      const on = li.getAttribute("data-pseudo-id") === id;
      li.classList.toggle("is-active", on);
      if (on) {
        li.setAttribute("aria-current", "step");
        li.scrollIntoView({ block: "nearest", behavior: "smooth" });
      } else {
        li.removeAttribute("aria-current");
      }
    });
  }

  return {
    setActive,
    getActive: () => activeId,
    el: root,
  };
}
