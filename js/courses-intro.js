/**
 * 入門コース入口 — TOPICS のカードを学ぶ順に6段で並べる
 * 文言は js/main.js の TOPICS が正。段の構成（id・順序）は
 * js/courses/intro-stages.js が正（トピックページのコース内ナビと共有）。
 */
import { mountTopicShellFromDataset } from "./platform/index.js";
import { TOPICS, createCard } from "./main.js";
import { STAGES } from "./courses/intro-stages.js";
import { INTRO_QUIZ } from "./courses/intro-quiz.js";

mountTopicShellFromDataset();

/** TOPICS.href はサイトルート基準。courses/ からは一段上がる */
function hrefFromCourse(href) {
  if (!href) return href;
  if (/^(https?:|\/|\.\.\/)/i.test(href)) return href;
  return `../${href}?course=intro`;
}

/**
 * 段の確認問題（4択）を描画する。方針は計画書 §10:
 * 選んだ直後に正誤と1行の解説を出す。答えは隠さず、点数は付けない。
 * @param {string} stageId
 * @param {number} stageNo 1 始まり（要素 id の衝突を避ける）
 * @returns {HTMLElement | null}
 */
function renderQuiz(stageId, stageNo) {
  const questions = INTRO_QUIZ[stageId];
  if (!questions || questions.length === 0) return null;

  const box = document.createElement("section");
  box.className = "course-quiz";
  box.setAttribute("aria-labelledby", `course-quiz-${stageNo}`);

  const title = document.createElement("h3");
  title.className = "course-quiz-title";
  title.id = `course-quiz-${stageNo}`;
  title.textContent = "確認問題";
  const lead = document.createElement("p");
  lead.className = "course-quiz-lead";
  lead.textContent = "この段を終えると、次のどれが言えるか。選ぶとすぐに解説が出ます。";
  box.append(title, lead);

  questions.forEach((q, qi) => {
    const item = document.createElement("div");
    item.className = "course-quiz-item";
    const qid = `course-quiz-${stageNo}-${qi + 1}`;
    item.setAttribute("role", "group");
    item.setAttribute("aria-labelledby", qid);

    const text = document.createElement("p");
    text.className = "course-quiz-q";
    text.id = qid;
    text.textContent = `Q${qi + 1}. ${q.text}`;

    const list = document.createElement("div");
    list.className = "course-quiz-choices";

    const feedback = document.createElement("p");
    feedback.className = "course-quiz-feedback";
    feedback.setAttribute("aria-live", "polite");
    feedback.hidden = true;

    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "btn btn-ghost btn-sm course-quiz-retry";
    retry.textContent = "もう一度選ぶ";
    retry.hidden = true;

    /** @type {HTMLButtonElement[]} */
    const buttons = q.choices.map((choice, ci) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "course-quiz-choice";
      b.textContent = `${"ABCD"[ci]}. ${choice}`;
      b.addEventListener("click", () => {
        const correct = ci === q.answer;
        buttons.forEach((other, oi) => {
          other.disabled = true;
          if (oi === q.answer) other.dataset.state = "correct";
          else if (oi === ci) other.dataset.state = "wrong";
          else other.dataset.state = "other";
        });
        b.setAttribute("aria-pressed", "true");
        feedback.dataset.state = correct ? "correct" : "wrong";
        feedback.textContent = correct
          ? `正解。${q.explain}`
          : `ちがいます。正解は ${"ABCD"[q.answer]}。${q.explain}`;
        feedback.hidden = false;
        retry.hidden = false;
      });
      return b;
    });

    retry.addEventListener("click", () => {
      buttons.forEach((b) => {
        b.disabled = false;
        delete b.dataset.state;
        b.removeAttribute("aria-pressed");
      });
      feedback.hidden = true;
      retry.hidden = true;
      buttons[0].focus();
    });

    list.append(...buttons);
    item.append(text, list, feedback, retry);
    box.appendChild(item);
  });

  return box;
}

function renderStages() {
  const root = document.getElementById("course-stages");
  if (!root) return;

  const byId = new Map(TOPICS.map((t) => [t.id, t]));
  const fragment = document.createDocumentFragment();

  STAGES.forEach((stage, i) => {
    const section = document.createElement("section");
    section.className = "course-stage";
    section.setAttribute("aria-labelledby", `course-stage-${i + 1}`);

    const heading = document.createElement("h2");
    heading.className = "course-stage-title";
    heading.id = `course-stage-${i + 1}`;
    heading.textContent = `${i + 1}. ${stage.title}`;

    const lead = document.createElement("p");
    lead.className = "course-stage-lead";
    lead.textContent = stage.lead;

    const grid = document.createElement("div");
    grid.className = "card-grid topic-category-grid";

    for (const id of stage.ids) {
      const topic = byId.get(id);
      if (!topic) {
        const missing = document.createElement("p");
        missing.className = "course-stage-lead";
        missing.textContent = `トピック ${id} が見つかりません。`;
        grid.appendChild(missing);
        continue;
      }
      grid.appendChild(
        createCard({
          ...topic,
          href: hrefFromCourse(topic.href),
        })
      );
    }

    section.append(heading, lead, grid);
    const quiz = renderQuiz(stage.id, i + 1);
    if (quiz) section.appendChild(quiz);
    fragment.appendChild(section);
  });

  root.replaceChildren(fragment);
}

renderStages();
