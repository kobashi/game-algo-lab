/**
 * トピックページの「コース内ナビ」— `?course=intro` で開かれたときだけ、
 * 入門コースの n/14・前後のトピックへのリンクを出す（P0-3）。
 *
 * 段の順序は `js/courses/intro-stages.js` が正。文言（タイトル・href）は
 * `js/main.js` の `TOPICS` から引く（二重管理しない）。
 *
 * @see docs/PLATFORM.md
 * @see docs/reviews/2026-09-26-intro-course-improvement-plan.md §5 P0-3
 */

import { escapeHtml } from "./text.js";
import { getCourseOrder } from "../courses/intro-stages.js";
import { findAudioStage, getAudioOrder } from "../courses/audio-stages.js";

/** クエリが無いときの既定。入門コースの結果はこれまでどおり。 */
export const COURSE_ID = "intro";

const COURSE_META = {
  intro: { label: "入門コース", list: "../courses/intro.html" },
  audio: { label: "応用サウンド", list: "../courses/audio.html" },
};

function currentSearch() {
  return typeof location !== "undefined" ? location.search : "";
}

/**
 * URL の `course` パラメータを読む（DOM なしでも呼べる）。
 * @param {string} [search]
 * @returns {string}
 */
export function readCourseParam(search = currentSearch()) {
  return new URLSearchParams(search ?? "").get("course") || "";
}

function basename(href) {
  return String(href ?? "").split("/").pop() || "";
}

/**
 * activeId のコース内での前後関係を、DOM なしで計算する（smoke テスト用）。
 * TOPICS は { id, title, href } の配列（`js/main.js` の TOPICS をそのまま渡せる）。
 *
 * @param {{ id: string, title: string, href: string }[]} topics
 * @param {string} activeId
 * @param {string} [courseId]
 * @returns {{
 *   index: number, total: number,
 *   prev: { id: string, title: string, href: string } | null,
 *   next: { id: string, title: string, href: string } | null,
 * } | null}
 */
/**
 * @param {string} courseId
 */
function orderFor(courseId) {
  if (courseId === "audio") return getAudioOrder();
  if (courseId === "intro") return getCourseOrder();
  return null;
}

export function computeCourseNav(topics, activeId, courseId = COURSE_ID) {
  const order = orderFor(courseId);
  if (!order) return null;
  const idx = order.indexOf(activeId);
  if (idx === -1) return null;

  const byId = new Map(topics.map((t) => [t.id, t]));
  const linkFor = (id) => {
    const t = byId.get(id);
    if (!t) return null;
    return {
      id,
      title: t.title,
      href: `${basename(t.href)}?course=${encodeURIComponent(courseId)}`,
    };
  };

  const peers =
    courseId === "audio"
      ? (findAudioStage(activeId)?.ids ?? []).map(linkFor).filter(Boolean)
      : [];

  return {
    index: idx + 1,
    total: order.length,
    prev: idx > 0 ? linkFor(order[idx - 1]) : null,
    next: idx < order.length - 1 ? linkFor(order[idx + 1]) : null,
    peers,
  };
}

/**
 * @param {ReturnType<typeof computeCourseNav>} info
 * @returns {string}
 */
/**
 * @param {NonNullable<ReturnType<typeof computeCourseNav>>} info
 * @param {string} courseId
 */
function courseNavHtml(info, courseId) {
  const meta = COURSE_META[courseId] ?? COURSE_META.intro;
  const prevHtml = info.prev
    ? `<a href="${escapeHtml(info.prev.href)}" class="course-nav-link">← 前: ${escapeHtml(
        info.prev.title
      )}</a>`
    : `<span class="course-nav-link course-nav-link-disabled">← 前へ（最初のトピック）</span>`;

  const nextHtml = info.next
    ? `<a href="${escapeHtml(info.next.href)}" class="course-nav-link">次: ${escapeHtml(
        info.next.title
      )} →</a>`
    : `<a href="${meta.list}" class="course-nav-link">コース一覧へ →</a>`;

  const peerHtml = info.peers?.length
    ? `<span class="course-nav-peers">同じ段階: ${info.peers
        .map(
          (peer) =>
            `<a href="${escapeHtml(peer.href)}" class="course-nav-link">${escapeHtml(peer.title)}</a>`
        )
        .join(" · ")}</span>`
    : "";

  return `
    <nav class="course-nav" aria-label="${escapeHtml(meta.label)}の前後のトピック">
      <a href="${meta.list}" class="course-nav-badge">${escapeHtml(meta.label)} ${info.index}/${info.total}</a>
      <span class="course-nav-sep">・</span>
      ${prevHtml}
      <span class="course-nav-sep">／</span>
      ${nextHtml}
      ${peerHtml}
    </nav>`;
}

/**
 * `?course=intro` または `?course=audio` のとき、ページ上部（.page-header の直後）と
 * ページ下部（#site-footer の直前）にコース内ナビを挿入する。
 *
 * @param {{ id: string, title: string, href: string }[]} topics `js/main.js` の TOPICS
 * @param {string} activeId
 * @param {Document} [doc]
 */
export function mountCourseNav(topics, activeId, doc = typeof document !== "undefined" ? document : null) {
  if (!doc) return;
  const courseId = readCourseParam();
  if (courseId !== "intro" && courseId !== "audio") return;

  const info = computeCourseNav(topics, activeId, courseId);
  if (!info) return;

  const html = courseNavHtml(info, courseId);

  const header = doc.querySelector(".page-header");
  if (header) header.insertAdjacentHTML("afterend", html);

  const footer = doc.getElementById("site-footer");
  if (footer) footer.insertAdjacentHTML("beforebegin", html);
}
