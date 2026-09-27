/**
 * 用語注（ホバー・フォーカス・タップで説明を出す）
 *
 * 使い方: HTML で `<span class="term" data-term="frame">フレーム</span>` と書き、ページの JS で
 * `mountGlossary()` を 1 回呼ぶ。後から JS で描いた要素（表の見出しなど）にもそのまま効く（イベント委譲）。
 *
 * - マウス: 乗せると出る、外すと消える
 * - キーボード: Tab で用語に移ると出る。Esc で消える
 * - タッチ: タップで出す／もう一度タップか外側のタップで消す
 *
 * 説明文は js/platform/glossary-terms.js。
 */
import { GLOSSARY } from "./glossary-terms.js";

let mounted = false;

/**
 * @param {{ root?: ParentNode }} [opts]
 */
export function mountGlossary(opts = {}) {
  const root = opts.root ?? document;
  prepareTerms(root);
  if (mounted) return;
  mounted = true;

  const tip = document.createElement("div");
  tip.className = "term-tip";
  tip.id = "term-tip";
  tip.setAttribute("role", "tooltip");
  tip.hidden = true;
  document.body.appendChild(tip);

  /** @type {HTMLElement | null} */
  let current = null;
  /** タップで開いたか（タップで開いたものはマウスが外れても消さない） */
  let pinned = false;

  /** @param {HTMLElement} el */
  function show(el) {
    const entry = GLOSSARY[el.dataset.term || ""];
    if (!entry) return;
    if (current && current !== el) current.removeAttribute("aria-describedby");
    current = el;
    tip.innerHTML = "";
    const head = document.createElement("strong");
    head.className = "term-tip-head";
    head.textContent = entry.term;
    const body = document.createElement("span");
    body.textContent = entry.text;
    tip.append(head, body);
    tip.hidden = false;
    el.setAttribute("aria-describedby", tip.id);
    place(el);
  }

  function hide() {
    if (current) current.removeAttribute("aria-describedby");
    current = null;
    pinned = false;
    tip.hidden = true;
  }

  /** 用語の下に出す。下に入らなければ上。左右は画面からはみ出さないよう寄せる */
  function place(el) {
    const r = el.getBoundingClientRect();
    const margin = 8;
    tip.style.left = "0px";
    tip.style.top = "0px";
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    let left = r.left + r.width / 2 - tw / 2;
    left = Math.max(margin, Math.min(left, vw - tw - margin));
    let top = r.bottom + 6;
    if (top + th > vh - margin && r.top - th - 6 > margin) top = r.top - th - 6;
    tip.style.left = `${left + window.scrollX}px`;
    tip.style.top = `${top + window.scrollY}px`;
  }

  /** @param {EventTarget | null} t */
  const termOf = (t) =>
    t instanceof Element ? /** @type {HTMLElement | null} */ (t.closest(".term[data-term]")) : null;

  document.addEventListener("mouseover", (e) => {
    // 表の描き直しなどで用語の要素ごと消えたときは、説明も消す
    if (current && !current.isConnected) hide();
    if (pinned) return;
    const el = termOf(e.target);
    if (el) show(el);
  });
  document.addEventListener("mouseout", (e) => {
    if (pinned) return;
    const el = termOf(e.target);
    if (el && !el.contains(/** @type {Node | null} */ (e.relatedTarget))) hide();
  });
  document.addEventListener("focusin", (e) => {
    const el = termOf(e.target);
    if (el) show(el);
  });
  document.addEventListener("focusout", (e) => {
    if (termOf(e.target) && !pinned) hide();
  });
  document.addEventListener("click", (e) => {
    const el = termOf(e.target);
    if (el) {
      // ラベルの中の用語をタップしても、スライダーなどにフォーカスが移らないようにする
      e.preventDefault();
      if (pinned && current === el) {
        hide();
      } else {
        show(el);
        pinned = true;
      }
      return;
    }
    if (pinned) hide();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && current) hide();
    const el = termOf(e.target);
    if (el && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      show(el);
      pinned = true;
    }
  });
  window.addEventListener("resize", () => current && place(current));
}

/**
 * 用語の要素にキーボードで移れるようにし、辞書に無いキーは警告する
 * @param {ParentNode} root
 */
function prepareTerms(root) {
  for (const el of root.querySelectorAll(".term[data-term]")) {
    const key = /** @type {HTMLElement} */ (el).dataset.term || "";
    if (!GLOSSARY[key]) {
      console.warn(`glossary: 辞書に無い用語 "${key}"`);
      continue;
    }
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
  }
}

/**
 * JS で描く HTML に用語注を入れるための小さな補助
 * @param {string} key
 * @param {string} label すでにエスケープ済みの表示文字列
 */
export function termHtml(key, label) {
  return `<span class="term" data-term="${key}" tabindex="0">${label}</span>`;
}
