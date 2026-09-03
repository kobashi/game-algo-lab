/**
 * URL クエリでデモの初期コントロールを指定する。
 *
 * applyParamsToControls は spec のキー順に適用する。
 * プリセット select が a/c/m などを上書きするトピックでは、
 * 呼び出し側が preset 系キーを個別パラメータより前に並べること。
 *
 * 共有 URL はコピーボタン押下時だけ生成する（history は書き換えない）。
 *
 * @see docs/PLATFORM.md
 */

import { createStatus } from "./dom.js";

const CHECKBOX_TRUE = new Set(["1", "true", "on"]);
const CHECKBOX_FALSE = new Set(["0", "false", "off"]);

/**
 * @typedef {"number" | "range" | "checkbox" | "select" | "text"} ParamKind
 * @typedef {{ el: HTMLElement | null, kind: ParamKind }} ParamEntry
 * @typedef {Record<string, ParamEntry>} ParamSpec
 * @typedef {{ key: string, value: string, reason: string, min?: number | null, max?: number | null, step?: number | null }} RejectedParam
 */

function currentSearch() {
  return typeof location !== "undefined" ? location.search : "";
}

function currentHref() {
  return typeof location !== "undefined" ? location.href : "http://localhost/";
}

/**
 * @param {string | URLSearchParams} search
 * @returns {URLSearchParams}
 */
function asSearchParams(search) {
  if (search instanceof URLSearchParams) return search;
  return new URLSearchParams(search ?? "");
}

/**
 * @param {ParamEntry} entry
 * @returns {number | null}
 */
function boundOf(entry, attr) {
  const el = entry.el;
  if (!el) return null;
  const raw = el[attr];
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * step 属性が数値で 0 より大きいときだけ返す。
 * "any"・未指定は検査しない（DOM の既定 step=1 には従わない）。
 * @param {ParamEntry} entry
 * @returns {number | null}
 */
function stepOf(entry) {
  const el = entry.el;
  if (!el) return null;
  let raw = "";
  if (typeof el.getAttribute === "function") {
    const attr = el.getAttribute("step");
    raw = attr == null ? "" : attr;
  } else {
    raw = el.step == null ? "" : String(el.step);
  }
  if (raw === "" || raw.toLowerCase() === "any") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * (n - base) が step の整数倍か。step=0.01 / 0.5 の誤差を吸収する。
 * @param {number} n
 * @param {number} base
 * @param {number} step
 */
function fitsStep(n, base, step) {
  const q = (n - base) / step;
  const nearest = Math.round(q);
  const recon = base + nearest * step;
  const tol = Math.max(Math.abs(step) * 1e-6, 1e-10);
  return Math.abs(n - recon) <= tol;
}

/**
 * @param {ParamEntry} entry
 * @returns {string | null}
 */
function serializeControl(entry) {
  const el = entry.el;
  if (!el) return null;
  if (entry.kind === "checkbox") {
    return /** @type {HTMLInputElement} */ (el).checked ? "1" : "0";
  }
  return String(/** @type {HTMLInputElement} */ (el).value);
}

/**
 * @param {ParamKind} kind
 * @param {string} a
 * @param {string} b
 */
function sameParamValue(kind, a, b) {
  if (kind === "number" || kind === "range") {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na === nb;
  }
  return String(a) === String(b);
}

/**
 * @param {ParamEntry} entry
 * @param {string} raw
 * @returns {boolean}
 */
function selectHasValue(entry, raw) {
  const el = entry.el;
  if (!el) return false;
  const opts = /** @type {HTMLSelectElement} */ (el).options;
  if (opts && opts.length != null) {
    return Array.from(opts).some((o) => o.value === raw);
  }
  if (typeof el.querySelectorAll === "function") {
    return Array.from(el.querySelectorAll("option")).some(
      (o) => /** @type {HTMLOptionElement} */ (o).value === raw
    );
  }
  return false;
}

/**
 * @param {HTMLElement} el
 */
function dispatchInputAndChange(el) {
  const opts = { bubbles: true };
  el.dispatchEvent(new Event("input", opts));
  el.dispatchEvent(new Event("change", opts));
}

/**
 * @param {RejectedParam} r
 */
function describeRejection(r) {
  if (r.reason === "range") {
    const span =
      r.min != null && r.max != null
        ? `${r.min}〜${r.max}`
        : r.min != null
          ? `${r.min}以上`
          : r.max != null
            ? `${r.max}以下`
            : "指定範囲";
    return `URLパラメータ ${r.key}=${r.value} は範囲外（${span}）のため無視しました。`;
  }
  if (r.reason === "step") {
    const step = r.step;
    const base = r.min != null ? r.min : 0;
    return `URLパラメータ ${r.key}=${r.value} は刻み幅${step}に合わないため無視しました（${base}から${step}刻み）。`;
  }
  if (r.reason === "option") {
    return `URLパラメータ ${r.key}=${r.value} は選択肢にないため無視しました。`;
  }
  if (r.reason === "checkbox") {
    return `URLパラメータ ${r.key}=${r.value} はオン/オフとして解釈できないため無視しました。`;
  }
  return `URLパラメータ ${r.key}=${r.value} は数値として解釈できないため無視しました。`;
}

/**
 * @param {RejectedParam[]} rejected
 * @returns {string}
 */
export function formatRejectedMessage(rejected) {
  if (!rejected.length) return "";
  return `⚠ ${rejected.map(describeRejection).join(" ")}`;
}

function showRejectedWarning(rejected) {
  const msg = formatRejectedMessage(rejected);
  if (!msg) return msg;
  if (typeof document !== "undefined") {
    const el = document.getElementById("status");
    if (el) createStatus(el)(msg);
  }
  return msg;
}

/**
 * spec のキー順に URL パラメータをコントロールへ適用する。
 * キーが無い項目は触らない。不正値は clamp せず却下して警告する。
 *
 * @param {ParamSpec} spec
 * @param {string | URLSearchParams} [search]
 * @returns {{ applied: string[], rejected: RejectedParam[], warning: string | null }}
 */
export function applyParamsToControls(spec, search = currentSearch()) {
  const params = asSearchParams(search);
  /** @type {string[]} */
  const applied = [];
  /** @type {RejectedParam[]} */
  const rejected = [];

  for (const [key, entry] of Object.entries(spec)) {
    if (!params.has(key)) continue;
    const raw = params.get(key) ?? "";
    const el = entry?.el;
    if (!el) {
      rejected.push({ key, value: raw, reason: "parse" });
      continue;
    }
    const kind = entry.kind;

    if (kind === "checkbox") {
      const token = raw.trim().toLowerCase();
      if (CHECKBOX_TRUE.has(token)) {
        /** @type {HTMLInputElement} */ (el).checked = true;
        dispatchInputAndChange(el);
        applied.push(key);
      } else if (CHECKBOX_FALSE.has(token)) {
        /** @type {HTMLInputElement} */ (el).checked = false;
        dispatchInputAndChange(el);
        applied.push(key);
      } else {
        rejected.push({ key, value: raw, reason: "checkbox" });
      }
      continue;
    }

    if (kind === "select") {
      if (!selectHasValue(entry, raw)) {
        rejected.push({ key, value: raw, reason: "option" });
        continue;
      }
      /** @type {HTMLSelectElement} */ (el).value = raw;
      dispatchInputAndChange(el);
      applied.push(key);
      continue;
    }

    if (kind === "text") {
      /** @type {HTMLInputElement} */ (el).value = raw;
      dispatchInputAndChange(el);
      applied.push(key);
      continue;
    }

    if (kind === "number" || kind === "range") {
      const trimmed = raw.trim();
      const n = trimmed === "" ? NaN : Number(trimmed);
      const min = boundOf(entry, "min");
      const max = boundOf(entry, "max");
      if (!Number.isFinite(n)) {
        rejected.push({ key, value: raw, reason: "parse", min, max });
        continue;
      }
      if ((min != null && n < min) || (max != null && n > max)) {
        rejected.push({ key, value: raw, reason: "range", min, max });
        continue;
      }
      const step = stepOf(entry);
      const base = min != null ? min : 0;
      if (step != null && !fitsStep(n, base, step)) {
        rejected.push({ key, value: raw, reason: "step", min, max, step });
        continue;
      }
      /** @type {HTMLInputElement} */ (el).value = String(n);
      dispatchInputAndChange(el);
      applied.push(key);
      continue;
    }

    rejected.push({ key, value: raw, reason: "parse" });
  }

  const warning = rejected.length ? showRejectedWarning(rejected) : null;
  return { applied, rejected, warning };
}

/**
 * @param {ParamSpec} spec
 * @returns {Record<string, string>}
 */
export function captureParamDefaults(spec) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const [key, entry] of Object.entries(spec)) {
    const ser = serializeControl(entry);
    if (ser != null) out[key] = ser;
  }
  return out;
}

/**
 * 現在のコントロール値から共有 URL を組み立てる。
 * 既定値と同じキーは付けない（ただし既定オンの checkbox をオフにした
 * `0` は既定と異なるので残る）。
 *
 * @param {ParamSpec} spec
 * @param {string} [base]
 * @param {Record<string, string>} [defaults]
 * @returns {string}
 */
export function buildShareUrl(
  spec,
  base = currentHref(),
  defaults = {}
) {
  const url = new URL(base, currentHref());
  url.search = "";
  url.hash = "";
  for (const [key, entry] of Object.entries(spec)) {
    if (!entry?.el) continue;
    const current = serializeControl(entry);
    if (current == null) continue;
    const def = defaults[key];
    if (def != null && sameParamValue(entry.kind, current, def)) continue;
    url.searchParams.set(key, current);
  }
  return url.toString();
}

/**
 * @param {HTMLElement} button
 * @param {string} url
 * @returns {HTMLInputElement}
 */
function ensureFallbackInput(button, url) {
  const parent = button.parentElement || button;
  let input = /** @type {HTMLInputElement | null} */ (
    parent.querySelector?.(".url-share-fallback")
  );
  if (!input) {
    input = document.createElement("input");
    input.type = "text";
    input.className = "url-share-fallback";
    input.readOnly = true;
    input.setAttribute("aria-label", "共有用URL");
    parent.appendChild(input);
  }
  input.value = url;
  input.hidden = false;
  input.focus();
  input.select();
  return input;
}

/**
 * 「この設定のURLをコピー」ボタンを接続する。
 * 呼び出した時点のコントロール値を既定として覚えるので、
 * applyParamsToControls より先に呼ぶこと。
 *
 * @param {{
 *   spec: ParamSpec,
 *   button?: HTMLElement | null,
 *   statusEl?: HTMLElement | null,
 *   defaults?: Record<string, string>,
 * }} options
 */
export function mountShareLink(options) {
  const spec = options.spec;
  const button = options.button ?? null;
  const setStatus = createStatus(
    options.statusEl ??
      (typeof document !== "undefined"
        ? document.getElementById("status")
        : null)
  );
  const defaults = options.defaults ?? captureParamDefaults(spec);
  if (!button) return;

  button.addEventListener("click", async () => {
    const url = buildShareUrl(spec, currentHref(), defaults);
    let copied = false;
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      try {
        await navigator.clipboard.writeText(url);
        copied = true;
      } catch {
        copied = false;
      }
    }
    if (copied) {
      const fallback = button.parentElement?.querySelector?.(
        ".url-share-fallback"
      );
      if (fallback) /** @type {HTMLElement} */ (fallback).hidden = true;
      setStatus("URLをコピーしました");
      return;
    }
    ensureFallbackInput(button, url);
    setStatus(
      "クリップボードにコピーできないため、下のURLを選択してコピーしてください"
    );
  });
}
