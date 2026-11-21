/**
 * 応用サウンドコースの入口。段は audio-stages.js、文言は TOPICS。
 */
import { mountTopicShellFromDataset } from "./platform/index.js";
import { TOPICS, createCard } from "./main.js";
import { AUDIO_STAGES } from "./courses/audio-stages.js";

mountTopicShellFromDataset();

/**
 * @param {string} href
 */
function hrefFromCourse(href) {
  if (!href) return href;
  if (/^(https?:|\/|\.\.\/)/i.test(href)) return href;
  return `../${href}?course=audio`;
}

function renderStages() {
  const root = document.getElementById("course-stages");
  if (!root) return;
  const byId = new Map(TOPICS.map((topic) => [topic.id, topic]));
  const fragment = document.createDocumentFragment();

  AUDIO_STAGES.forEach((stage, index) => {
    const section = document.createElement("section");
    section.className = "course-stage";
    const heading = document.createElement("h2");
    heading.className = "course-stage-title";
    heading.id = `audio-stage-${index + 1}`;
    heading.textContent = `${index + 1}. ${stage.title}`;
    const lead = document.createElement("p");
    lead.className = "course-stage-lead";
    lead.textContent = stage.lead;
    const grid = document.createElement("div");
    grid.className = "card-grid topic-category-grid";
    for (const id of stage.ids) {
      const topic = byId.get(id);
      if (!topic) continue;
      grid.appendChild(createCard({ ...topic, href: hrefFromCourse(topic.href) }));
    }
    section.append(heading, lead, grid);
    fragment.appendChild(section);
  });

  root.replaceChildren(fragment);
}

renderStages();
