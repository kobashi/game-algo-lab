/**
 * 入門コース入口 — TOPICS のカードを学ぶ順に6段で並べる
 * 文言は js/main.js の TOPICS が正（ここでは id と段だけ持つ）
 */
import { mountTopicShellFromDataset } from "./platform/index.js";
import { TOPICS, createCard } from "./main.js";

mountTopicShellFromDataset();

/** @type {{ title: string, lead: string, ids: string[] }[]} */
const STAGES = [
  {
    title: "まず動かす",
    lead: "ゲームが1秒間に何をしているかを知る",
    ids: ["game-loop", "input-basics"],
  },
  {
    title: "物を動かす",
    lead: "位置・速度・重力・当たり判定",
    ids: ["velocity-motion", "accel-gravity", "circle-collision"],
  },
  {
    title: "手ざわりを作る",
    lead: "同じ処理でも操作感は数値で変わる",
    ids: ["coyote-time", "gfx-camera"],
  },
  {
    title: "見せる・鳴らす",
    lead: "画面表示と効果音のつなぎ方",
    ids: ["gfx-ui-canvas", "sfx-events"],
  },
  {
    title: "状態と乱数",
    lead: "状態遷移と、再現できる乱数",
    ids: ["fsm", "rng-seed"],
  },
  {
    title: "考えるAI",
    lead: "先読みで手を選ぶ",
    ids: ["minimax", "tic-tac-toe"],
  },
];

/** TOPICS.href はサイトルート基準。courses/ からは一段上がる */
function hrefFromCourse(href) {
  if (!href) return href;
  if (/^(https?:|\/|\.\.\/)/i.test(href)) return href;
  return `../${href}`;
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
