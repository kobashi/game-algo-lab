/**
 * 演習節（課題カード）の描画 — 入門コースの P0-1。
 *
 * 文言の正本は `js/courses/intro-exercises.js`（トピック id → カード）。
 * カードの各文字列は軽量 Markdown（`` `code またはURL` `` / `**強調**`）で書き、
 * ここで HTML に変換する。付録Aの文面をそのまま保つため、要約・改変はしない。
 *
 * 置き場所（付録A・§5 P0-1 実装方針どおり）:
 * - 「このデモで学ぶこと」の `.lesson-details` があれば、その直後
 * - 無ければ（sfx-events）C# 実装例の `.code-section` の直前
 *
 * 目標・予想・手順は常に見える。「期待される観察」と「発展」は
 * `<details>` で既定は畳む（§8 決定2: 先に自分で予想させてから開く）。
 *
 * 手順中の URL は同じページを別パラメータで開くリンクにする。
 * `?course=intro` で開かれているときは、そのリンクにも course=intro を付ける
 * （§8「実装時に固定すること」— コース内ナビが途切れないように）。
 *
 * @see docs/PLATFORM.md
 * @see docs/reviews/2026-09-26-intro-course-improvement-plan.md §5 P0-1
 */

import { escapeHtml } from "./text.js";
import { readCourseParam, COURSE_ID } from "./course-nav.js";

/**
 * @typedef {{
 *   number: number,
 *   title: string,
 *   goal: string,
 *   guess: string,
 *   stepsIntro?: string,
 *   steps: string[],
 *   observations: string[],
 *   extension?: string,
 *   scope?: string,
 * }} ExerciseCard
 */

/**
 * `href` が `?` を含むかで `?` / `&` を選んで course パラメータを足す。
 * suffix が空文字なら何もしない（コース外から来た URL には付けない）。
 * @param {string} href
 * @param {string} suffix `"course=intro"` または `""`
 */
function appendCourseParam(href, suffix) {
  if (!suffix) return href;
  return href.includes("?") ? `${href}&${suffix}` : `${href}?${suffix}`;
}

/**
 * 軽量 Markdown → HTML。
 * `` `xxx.html...` `` は同じページを開くリンクに、それ以外の `` `...` `` は `<code>` に、
 * `**...**` は `<strong>` にする。地の文はそのまま（原稿に生の `<` `&` は含めない）。
 * @param {string | undefined} text
 * @param {string} courseSuffix
 */
function renderInline(text, courseSuffix) {
  if (text == null) return "";
  let out = String(text).replace(/`([^`]+)`/g, (_, raw) => {
    if (/\.html(\?|$)/.test(raw)) {
      const href = appendCourseParam(raw, courseSuffix);
      return `<a href="${escapeHtml(href)}" class="exercise-url">${escapeHtml(raw)}</a>`;
    }
    return `<code>${escapeHtml(raw)}</code>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, (_, raw) => `<strong>${escapeHtml(raw)}</strong>`);
  return out;
}

function listHtml(items, ordered, suffix) {
  const tag = ordered ? "ol" : "ul";
  const lis = items
    .map((item) => `<li>${renderInline(item, suffix)}</li>`)
    .join("\n          ");
  return `<${tag} class="exercise-list">\n          ${lis}\n        </${tag}>`;
}

/**
 * @param {ExerciseCard} card
 * @param {string} [courseSuffix] `"course=intro"` または `""`（既定: 現在の URL から判定）
 * @returns {string}
 */
export function exerciseSectionHtml(
  card,
  courseSuffix = readCourseParam() === COURSE_ID ? `course=${COURSE_ID}` : ""
) {
  const stepsHtml =
    card.steps.length > 1
      ? listHtml(card.steps, true, courseSuffix)
      : `<p class="exercise-steps-single">${renderInline(card.steps[0], courseSuffix)}</p>`;

  const observationsHtml = listHtml(card.observations, false, courseSuffix);

  const extensionHtml = card.extension
    ? `
      <details class="lesson-details exercise-details">
        <summary>発展</summary>
        <div class="lesson-box-nested">
          <p>${renderInline(card.extension, courseSuffix)}</p>
        </div>
      </details>`
    : "";

  const scopeHtml = card.scope
    ? `<p class="exercise-scope"><strong>コースでの範囲:</strong> ${renderInline(card.scope, courseSuffix)}</p>`
    : "";

  return `
    <section class="ds-section exercise-section" aria-labelledby="exercise-heading">
      <h2 id="exercise-heading">演習</h2>
      <p class="section-lead section-lead-compact exercise-title">${escapeHtml(card.title)}</p>
      <div class="exercise-card">
        <p class="exercise-line"><strong>目標:</strong> ${renderInline(card.goal, courseSuffix)}</p>
        <p class="exercise-line"><strong>予想:</strong> ${renderInline(card.guess, courseSuffix)}</p>
        <div class="exercise-steps">
          <p class="exercise-label">手順</p>${
            card.stepsIntro
              ? `\n          <p class="exercise-steps-intro">${renderInline(card.stepsIntro, courseSuffix)}</p>`
              : ""
          }
          ${stepsHtml}
        </div>
        <details class="lesson-details exercise-details">
          <summary>期待される観察</summary>
          <div class="lesson-box-nested">
            ${observationsHtml}
          </div>
        </details>${extensionHtml}${scopeHtml}
      </div>
    </section>`;
}

/**
 * `.lesson-details` の直後、無ければ `.code-section` の直前に演習節を挿入する。
 * card が無い（該当トピックが入門コース対象外）場合は何もしない。
 *
 * @param {ExerciseCard | undefined} card
 * @param {string} [activeId] 現状は未使用（将来のログ・分析用に残す）
 * @param {Document | null} [doc]
 */
export function mountExercises(
  card,
  activeId = "",
  doc = typeof document !== "undefined" ? document : null
) {
  if (!doc || !card) return;
  // 既にこのページで描画済みなら二重に足さない（republish 等の再実行対策）
  if (doc.getElementById("exercise-heading")) return;

  const html = exerciseSectionHtml(card);

  const lessonDetails = doc.querySelector(".lesson-details");
  if (lessonDetails) {
    lessonDetails.insertAdjacentHTML("afterend", html);
    return;
  }

  const codeSection = doc.querySelector(".code-section");
  if (codeSection) {
    codeSection.insertAdjacentHTML("beforebegin", html);
  }
}
