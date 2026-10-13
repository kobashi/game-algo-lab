/**
 * 入門コースのスライダーを、矢印キーで 0.1 ずつ動かせるようにする。
 * もともと 0.1 より細かい目盛りは変えない。
 *
 * mountTopicShellFromDataset から、入門 14 本だけで呼ぶ。
 * applyParamsToControls より前に step を変える（共有 URL の刻み検査が 0.1 を受け付けるため）。
 */

import { getCourseOrder } from "../courses/intro-stages.js";

export const RANGE_FINE_STEP = 0.1;

/**
 * step 属性を数値にする。未指定はブラウザ既定の 1。"any" は null。
 * @param {string | null | undefined} stepAttr
 * @returns {number | null}
 */
export function parseRangeStep(stepAttr) {
  if (stepAttr == null || stepAttr === "") return 1;
  if (String(stepAttr).toLowerCase() === "any") return null;
  const n = Number(stepAttr);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * 0.1 より粗い目盛りだけ "0.1" にする。細かい目盛りと "any" は null（変えない）。
 * @param {number | null} step
 * @returns {string | null}
 */
export function fineStepAttribute(step) {
  if (step == null) return null;
  if (step > RANGE_FINE_STEP + 1e-9) return String(RANGE_FINE_STEP);
  return null;
}

/**
 * @param {boolean} hasFiner 0.1 より細かいスライダーがページにある
 * @returns {string}
 */
export function rangeFineHint(hasFiner) {
  const base = "スライダーを選んで、矢印キーで 0.1 ずつ微調整できます。";
  if (!hasFiner) return base;
  return `${base}0.1 より細かい目盛りのものは、その刻みのままです。`;
}

/**
 * 0.1 刻みの表示。整数はそのまま、それ以外は小数第1位。
 * @param {number} n
 * @returns {string}
 */
export function formatTenths(n) {
  if (!Number.isFinite(n)) return "—";
  const q = Math.round(n * 10) / 10;
  return Number.isInteger(q) ? String(q) : q.toFixed(1);
}

/**
 * 矢印キーをスライダーや入力欄に渡すとき true。
 * @param {Event | null | undefined} event
 * @returns {boolean}
 */
export function isFieldKeyTarget(event) {
  const t = event?.target;
  if (!t || typeof t.closest !== "function") return false;
  return !!t.closest("input, textarea, select, [contenteditable='true']");
}

/**
 * 数値の表示がまだ無いスライダーに、今の値を出す。
 * @param {HTMLInputElement} el
 */
function ensureReadout(el) {
  const id = el.id;
  if (!id) return;
  if (document.getElementById(`${id}-val`)) return;
  if (id === "restitution" && document.getElementById("rest-val")) return;
  const span = document.createElement("span");
  span.className = "range-fine-val";
  const write = () => {
    span.textContent = formatTenths(Number(el.value));
  };
  write();
  el.insertAdjacentElement("afterend", span);
  el.addEventListener("input", write);
}

/**
 * @param {string} text
 * @param {HTMLInputElement} range
 */
function placeHint(text, range) {
  const p = document.createElement("p");
  p.className = "range-fine-hint";
  p.textContent = text;
  const row = range.closest(".gl-params, .controls-group, .mc-params, .control-row");
  if (row?.parentElement) {
    row.parentElement.insertBefore(p, row);
    return;
  }
  // カメラとキャンバスは、ラベルとスライダーが aside の直下に並ぶ
  const parent = range.parentElement;
  if (!parent) return;
  const prev = range.previousElementSibling;
  const before = prev && prev.tagName === "LABEL" ? prev : range;
  parent.insertBefore(p, before);
}

/**
 * 入門コースのデモだけ。粗いスライダーの step を 0.1 にし、説明を 1 行出す。
 * @param {string} topicId
 */
export function mountIntroRangeFineTune(topicId) {
  if (typeof document === "undefined") return;
  if (!getCourseOrder().includes(topicId)) return;
  const ranges = /** @type {HTMLInputElement[]} */ ([
    ...document.querySelectorAll("input[type='range']"),
  ]);
  if (ranges.length === 0 || document.querySelector(".range-fine-hint")) return;

  const parsed = ranges.map((el) => parseRangeStep(el.getAttribute("step")));
  const hasFiner = parsed.some((step) => step != null && step < RANGE_FINE_STEP - 1e-9);
  ranges.forEach((el, i) => {
    const next = fineStepAttribute(parsed[i]);
    if (next != null) el.step = next;
    ensureReadout(el);
  });
  placeHint(rangeFineHint(hasFiner), ranges[0]);
}
