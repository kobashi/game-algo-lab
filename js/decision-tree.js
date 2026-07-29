/**
 * 決定木（ルール AI）— 条件分岐で葉の行動を選ぶ
 */
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const hpEl = /** @type {HTMLInputElement} */ (document.getElementById("hp"));
const enemyEl = /** @type {HTMLInputElement} */ (
  document.getElementById("enemy-near")
);
const ammoEl = /** @type {HTMLInputElement} */ (document.getElementById("ammo"));
const hpVal = document.getElementById("hp-val");
const enemyVal = document.getElementById("enemy-val");
const ammoVal = document.getElementById("ammo-val");
const treeEl = document.getElementById("dt-tree");
const pathEl = document.getElementById("dt-path");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

/**
 * @typedef {{ type: 'cond', test: string, yes: DtNode, no: DtNode, label: string }
 *   | { type: 'leaf', action: string, label: string }} DtNode
 */

/**
 * @param {{ hp: number, enemyNear: boolean, ammo: number }} p
 * @returns {DtNode}
 */
export function buildTree() {
  /** @type {DtNode} */
  const tree = {
    type: "cond",
    test: "hp < 0.3",
    label: "HP < 30% ?",
    yes: { type: "leaf", action: "heal", label: "回復アイテムを使う" },
    no: {
      type: "cond",
      test: "enemyNear",
      label: "敵が近い ?",
      yes: {
        type: "cond",
        test: "ammo > 0",
        label: "弾あり ?",
        yes: { type: "leaf", action: "attack", label: "攻撃" },
        no: { type: "leaf", action: "flee", label: "逃走" },
      },
      no: { type: "leaf", action: "patrol", label: "巡回" },
    },
  };
  return tree;
}

/**
 * Evaluate tree; return path of node labels + final action.
 * @param {DtNode} node
 * @param {{ hp: number, enemyNear: boolean, ammo: number }} p
 */
export function evaluate(node, p) {
  /** @type {string[]} */
  const path = [];
  let cur = node;
  while (cur.type === "cond") {
    path.push(cur.label);
    let branch = false;
    if (cur.test === "hp < 0.3") branch = p.hp < 0.3;
    else if (cur.test === "enemyNear") branch = p.enemyNear;
    else if (cur.test === "ammo > 0") branch = p.ammo > 0;
    path.push(branch ? "→ YES" : "→ NO");
    cur = branch ? cur.yes : cur.no;
  }
  path.push(cur.label);
  return { path, action: cur.action, leaf: cur.label };
}

/**
 * @param {DtNode} node
 * @param {string[]} activePath labels that were visited
 */
function renderTreeHtml(node, activeSet, depth = 0) {
  const pad = depth * 16;
  if (node.type === "leaf") {
    const on = activeSet.has(node.label);
    return `<div class="dt-node dt-leaf${on ? " dt-on" : ""}" style="margin-left:${pad}px">🍃 ${node.label}</div>`;
  }
  const on = activeSet.has(node.label);
  return `<div class="dt-node dt-cond${on ? " dt-on" : ""}" style="margin-left:${pad}px">◆ ${node.label}</div>
    ${renderTreeHtml(node.yes, activeSet, depth + 1)}
    ${renderTreeHtml(node.no, activeSet, depth + 1)}`;
}

function readP() {
  return {
    hp: Number(hpEl?.value) || 0,
    enemyNear: !!enemyEl?.checked,
    ammo: Number(ammoEl?.value) || 0,
  };
}

function sync() {
  const p = readP();
  if (hpVal) hpVal.textContent = (p.hp * 100).toFixed(0) + "%";
  if (enemyVal) enemyVal.textContent = p.enemyNear ? "近い" : "遠い";
  if (ammoVal) ammoVal.textContent = String(p.ammo);
  const tree = buildTree();
  const r = evaluate(tree, p);
  const activeSet = new Set(
    r.path.filter((s) => !s.startsWith("→"))
  );
  if (treeEl) {
    treeEl.innerHTML =
      renderTreeHtml(tree, activeSet) +
      `<style>
        .dt-node{padding:4px 8px;margin:3px 0;border-radius:4px;font-size:13px;color:#9aabbf}
        .dt-leaf{color:#c5d0de}
        .dt-on{background:rgba(107,203,143,0.2);color:#6bcb8f;font-weight:600}
      </style>`;
  }
  if (pathEl) {
    pathEl.innerHTML = `<p class="result-verdict">行動: <strong>${r.leaf}</strong>（${r.action}）</p>
      <p class="result-note">${r.path.join(" · ")}</p>`;
  }
  setStatus(`action=${r.action} · hp=${(p.hp * 100).toFixed(0)}% enemy=${p.enemyNear} ammo=${p.ammo}`);
}

for (const el of [hpEl, enemyEl, ammoEl]) {
  el?.addEventListener("input", sync);
  el?.addEventListener("change", sync);
}

loadTextSample(
  "../samples/DecisionTreeExample.cs",
  csharpSample,
  "// DecisionTreeExample.cs"
);
if (hpEl) hpEl.value = "0.7";
if (ammoEl) ammoEl.value = "5";
if (enemyEl) enemyEl.checked = true;
sync();
