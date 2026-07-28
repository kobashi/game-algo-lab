/**
 * 継承 vs コンポーネント
 * @see docs/topics/component-vs-inheritance/SPEC.md
 */
import { COMPONENT_VS_INHERITANCE_CONFIG as C } from "./maps/component-vs-inheritance-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const treeEl = document.getElementById("inh-tree");
const classSelect = /** @type {HTMLSelectElement} */ (
  document.getElementById("inh-class")
);
const inhCard = document.getElementById("inh-card");
const compChecks = document.getElementById("comp-checks");
const compCard = document.getElementById("comp-card");
const noteEl = document.getElementById("cvi-note");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/** capabilities implied by inheritance leaf classes */
const INH_CAPS = {
  Entity: [],
  Character: ["Health", "Move"],
  Enemy: ["Health", "Move"],
  FlyingEnemy: ["Health", "Move", "Fly"],
  Player: ["Health", "Move", "Shoot"],
  Prop: [],
};

/** @type {Set<string>} */
const selectedComps = new Set(["Health", "Move"]);

function renderTree() {
  if (!treeEl) return;
  const byParent = new Map();
  for (const n of C.inheritanceTree) {
    const p = n.parent ?? "__root__";
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p).push(n.id);
  }
  function ul(parent) {
    const kids = byParent.get(parent) || [];
    if (!kids.length) return "";
    return `<ul class="cvi-tree-ul">${kids
      .map(
        (id) =>
          `<li><button type="button" class="cvi-node${classSelect?.value === id ? " is-active" : ""}" data-id="${id}">${id}</button>${ul(id)}</li>`
      )
      .join("")}</ul>`;
  }
  treeEl.innerHTML = ul("__root__");
  treeEl.querySelectorAll(".cvi-node").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (classSelect) classSelect.value = /** @type {HTMLElement} */ (btn).dataset.id || "Entity";
      render();
    });
  });
}

function fillSelect() {
  if (!classSelect) return;
  classSelect.innerHTML = C.inheritanceTree
    .map((n) => `<option value="${n.id}">${n.id}</option>`)
    .join("");
  classSelect.value = "FlyingEnemy";
}

function renderCompChecks() {
  if (!compChecks) return;
  compChecks.innerHTML = C.components
    .map(
      (c) => `
    <label class="ttt-check cvi-check">
      <input type="checkbox" data-comp="${c.id}" ${selectedComps.has(c.id) ? "checked" : ""} />
      <span class="cvi-swatch" style="background:${c.color}"></span> ${c.label}
    </label>`
    )
    .join("");
  compChecks.querySelectorAll("input").forEach((inp) => {
    inp.addEventListener("change", () => {
      const id = /** @type {HTMLInputElement} */ (inp).dataset.comp || "";
      if (/** @type {HTMLInputElement} */ (inp).checked) selectedComps.add(id);
      else selectedComps.delete(id);
      render();
    });
  });
}

function capsHtml(caps, colors) {
  if (!caps.length) return '<span class="footer-muted">（能力なし）</span>';
  return caps
    .map((id) => {
      const col = colors[id] || "#9aabbf";
      return `<span class="cvi-chip" style="border-color:${col};color:${col}">${id}</span>`;
    })
    .join(" ");
}

function renderCards() {
  const cls = classSelect?.value || "Entity";
  const inhCaps = INH_CAPS[cls] || [];
  const colorMap = Object.fromEntries(C.components.map((c) => [c.id, c.color]));
  if (inhCard) {
    inhCard.innerHTML = `
      <h3 class="gl-block-title">${cls}</h3>
      <p class="footer-muted">継承で固定された能力</p>
      <div class="cvi-chips">${capsHtml(inhCaps, colorMap)}</div>
      <p class="cvi-blurb">クラスを変えないと能力を付け外しできない。</p>`;
  }
  const compList = [...selectedComps];
  if (compCard) {
    compCard.innerHTML = `
      <h3 class="gl-block-title">Entity + components</h3>
      <p class="footer-muted">トグルで能力を合成</p>
      <div class="cvi-chips">${capsHtml(compList, colorMap)}</div>
      <p class="cvi-blurb">同じ Entity に Fly と Shoot を同時に載せられる。</p>`;
  }
  if (noteEl) {
    const inhSet = new Set(inhCaps);
    const same =
      inhCaps.length === compList.length &&
      compList.every((c) => inhSet.has(c));
    noteEl.textContent = same
      ? "いま両側の能力セットは一致しています。"
      : "能力セットが異なります — 継承はクラス固定、コンポーネントは自由に合成。";
  }
  setStatus(`継承: ${cls} · コンポーネント: ${compList.join("+") || "なし"}`);
}

function render() {
  renderTree();
  renderCards();
}

classSelect?.addEventListener("change", render);

fillSelect();
renderCompChecks();
render();

loadTextSample(
  "../samples/ComponentVsInheritanceExample.cs",
  csharpSample,
  "// ComponentVsInheritanceExample.cs"
);
