/**
 * 入門コース入口 — TOPICS のカードを学ぶ順に6段で並べる
 * 文言は js/main.js の TOPICS が正。段の構成（id・順序）は
 * js/courses/intro-stages.js が正（トピックページのコース内ナビと共有）。
 */
import { mountTopicShellFromDataset } from "./platform/index.js";
import { TOPICS, createCard } from "./main.js";
import { STAGES } from "./courses/intro-stages.js";

mountTopicShellFromDataset();

/** TOPICS.href はサイトルート基準。courses/ からは一段上がる */
function hrefFromCourse(href) {
  if (!href) return href;
  if (/^(https?:|\/|\.\.\/)/i.test(href)) return href;
  return `../${href}?course=intro`;
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
    fragment.appendChild(section);
  });

  root.replaceChildren(fragment);
}

renderStages();
