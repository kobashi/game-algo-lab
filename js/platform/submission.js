/**
 * 提出票 — 入門コースの提出課題（計画書 docs/reviews/2026-09-27-intro-course-assignments-plan.md §2.1）
 *
 * `?course=intro` で開いたトピックページの演習節の下に「提出課題」の節を出す。
 * 1. 課題文（js/courses/intro-assignments.js）を表示する
 * 2. 学籍番号の末尾 1 桁 d を入れると、個人条件を表示する
 * 3. 「今の設定を入れる」で、「この設定のURLをコピー」と同じ URL を枠に入れる
 * 4. 観察・考察を書き、「提出用テキストをコピー」で LMS に貼るテキストを作る
 *
 * サイトはサーバーを持たない。書いた内容はそのブラウザにだけ下書き保存（localStorage）し、外には送らない。
 */

import { escapeHtml } from "./text.js";
import { readCourseParam, COURSE_ID } from "./course-nav.js";
import { currentShareUrl } from "./url-params.js";

const STORE_PREFIX = "gal-submit:";
const STORE_D = "gal-submit:d";
export const DISCUSS_MIN = 100;
export const DISCUSS_MAX = 200;

/** 軽量 Markdown（`` `code` `` / `**強調**`）→ HTML */
function inline(text) {
  return escapeHtml(String(text ?? ""))
    .replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, (_, b) => `<strong>${b}</strong>`);
}

/** 提出用テキストでは記号を外す */
function plain(text) {
  return String(text ?? "").replace(/`([^`]+)`/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1");
}

/**
 * 学籍番号の末尾 1 桁として読めるか
 * @param {unknown} v
 * @returns {number | null}
 */
export function parseDigit(v) {
  const s = String(v ?? "").trim();
  return /^[0-9]$/.test(s) ? Number(s) : null;
}

/**
 * 提出 URL の確認。そのトピックのページか、条件（パラメータ）が付いているか
 * @param {string} raw
 * @param {string} topicId
 * @returns {{ ok: boolean, warn: string | null }}
 */
export function checkSubmissionUrl(raw, topicId) {
  const s = String(raw ?? "").trim();
  if (!s) return { ok: false, warn: "URL が空です" };
  let url;
  try {
    url = new URL(s);
  } catch {
    return { ok: false, warn: "URL として読めません" };
  }
  if (!url.pathname.endsWith(`/${topicId}.html`)) {
    return { ok: false, warn: `このページ（${topicId}）の URL ではありません` };
  }
  const keys = [...url.searchParams.keys()].filter((k) => k !== "course");
  if (!keys.length) return { ok: true, warn: "条件（パラメータ）が付いていません。既定のままです" };
  return { ok: true, warn: null };
}

/**
 * LMS に貼る提出用テキスト
 * @param {import("../courses/intro-assignments.js").Assignment} a
 * @param {string} topicId
 * @param {{ d: number | null, urls: Record<string, string>, observe: string, discuss: string }} data
 */
export function buildSubmissionText(a, topicId, data) {
  const lines = [`【入門コース 提出課題 ${a.number}: ${topicId} — ${a.title}】`];
  if (a.personal) {
    lines.push(data.d == null ? "個人条件: （学籍番号の末尾が未入力）" : `個人条件: d=${data.d} → ${plain(a.personal(data.d))}`);
  }
  for (const u of a.urls) {
    lines.push(`URL ${u.id}（${plain(u.label)}）: ${(data.urls[u.id] || "").trim() || "（未入力）"}`);
  }
  lines.push(`観察: ${data.observe.trim() || "（未入力）"}`);
  lines.push(`考察: ${data.discuss.trim() || "（未入力）"}`);
  return lines.join("\n");
}

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 保存できない環境（プライベートモードなど）では下書きを残さない
  }
}

/**
 * @param {import("../courses/intro-assignments.js").Assignment} a
 * @param {string} topicId
 */
function sectionHtml(a, topicId) {
  const urlRows = a.urls
    .map(
      (u) => `
          <div class="submission-url" data-url-id="${u.id}">
            <label class="controls-label" for="submit-url-${u.id}">URL ${u.id}（${inline(u.label)}）</label>
            <div class="submission-url-row">
              <input type="url" id="submit-url-${u.id}" class="submission-input" spellcheck="false" autocomplete="off" placeholder="「今の設定を入れる」で入る" />
              <button type="button" class="btn btn-ghost btn-sm submission-take" data-url-id="${u.id}">今の設定を入れる</button>
            </div>
            <p class="submission-warn" id="submit-url-${u.id}-warn" aria-live="polite"></p>
          </div>`
    )
    .join("");
  return `
    <section class="ds-section submission-section" aria-labelledby="submission-heading">
      <h2 id="submission-heading">提出課題</h2>
      <p class="section-lead section-lead-compact exercise-title">課題 ${a.number}. ${escapeHtml(a.title)}</p>
      <div class="exercise-card">
        <p class="exercise-line"><strong>問い:</strong> ${inline(a.question)}</p>
        ${a.condition ? `<p class="exercise-line"><strong>条件:</strong> ${inline(a.condition)}</p>` : ""}
        ${
          a.personal
            ? `<div class="submission-personal">
          <label class="controls-label" for="submit-d">学籍番号の末尾 1 桁</label>
          <input type="number" id="submit-d" class="mc-num" min="0" max="9" step="1" inputmode="numeric" />
          <p class="exercise-line" id="submit-cond" aria-live="polite"></p>
        </div>`
            : `<p class="exercise-line"><strong>個人条件:</strong> なし（条件は自分で決める）</p>`
        }
        <p class="exercise-label">提出するもの</p>
        <ul class="exercise-list">
          ${a.urls.map((u) => `<li>URL ${u.id}: ${inline(u.label)}</li>`).join("\n          ")}
          <li>観察: ${inline(a.observe)}</li>
          <li>考察（${DISCUSS_MIN}〜${DISCUSS_MAX} 字）: A と B で何が違ったか（数値で）と、なぜそうなるか</li>
        </ul>
        ${a.example ? `<p class="exercise-line">URL の形の例: ${inline(a.example)}（「…」は自分で決める値）</p>` : ""}
        <details class="lesson-details exercise-details">
          <summary>考察に書くことの候補</summary>
          <div class="lesson-box-nested">
            <ul class="exercise-list">${a.discuss.map((t) => `<li>${inline(t)}</li>`).join("")}</ul>
          </div>
        </details>

        <div class="submission-form">
          <p class="exercise-label">提出票</p>
          <p class="section-lead section-lead-compact">
            上のデモで条件を決めたら「今の設定を入れる」。書いた内容はこのブラウザにだけ保存され、外には送られません。
            最後に「提出用テキストをコピー」して、LMS の提出欄に貼ってください。
          </p>
          ${urlRows}
          <label class="controls-label" for="submit-observe">観察</label>
          <textarea id="submit-observe" class="submission-text" rows="3"></textarea>
          <div class="submission-url-row">
            <button type="button" class="btn btn-ghost btn-sm" id="submit-paste-status">今の状態表示を観察に足す</button>
          </div>
          <label class="controls-label" for="submit-discuss">考察（${DISCUSS_MIN}〜${DISCUSS_MAX} 字）</label>
          <textarea id="submit-discuss" class="submission-text" rows="5"></textarea>
          <p class="submission-count" id="submit-count" aria-live="polite"></p>
          <div class="submission-url-row">
            <button type="button" class="btn btn-primary" id="submit-copy">提出用テキストをコピー</button>
          </div>
          <p class="submission-warn" id="submit-msg" aria-live="polite"></p>
          <textarea id="submit-output" class="submission-text submission-output" rows="8" readonly hidden aria-label="提出用テキスト"></textarea>
        </div>
      </div>
    </section>`;
}

/**
 * @param {import("../courses/intro-assignments.js").Assignment | undefined} a
 * @param {string} topicId
 * @param {Document | null} [doc]
 */
export function mountSubmission(a, topicId, doc = typeof document !== "undefined" ? document : null) {
  if (!doc || !a) return;
  if (readCourseParam() !== COURSE_ID) return;
  if (doc.getElementById("submission-heading")) return;

  const html = sectionHtml(a, topicId);
  const exercise = doc.getElementById("exercise-heading")?.closest("section");
  const code = doc.querySelector(".code-section");
  if (exercise) exercise.insertAdjacentHTML("afterend", html);
  else if (code) code.insertAdjacentHTML("beforebegin", html);
  else return;

  const $ = (id) => /** @type {HTMLInputElement | HTMLTextAreaElement | null} */ (doc.getElementById(id));
  const storeKey = STORE_PREFIX + topicId;
  const draft = load(storeKey, { urls: {}, observe: "", discuss: "" });
  const dEl = $("submit-d");
  const condEl = doc.getElementById("submit-cond");
  const observeEl = $("submit-observe");
  const discussEl = $("submit-discuss");
  const countEl = doc.getElementById("submit-count");
  const msgEl = doc.getElementById("submit-msg");
  const outEl = $("submit-output");

  const readDraft = () => ({
    urls: Object.fromEntries(a.urls.map((u) => [u.id, $(`submit-url-${u.id}`)?.value ?? ""])),
    observe: observeEl?.value ?? "",
    discuss: discussEl?.value ?? "",
  });
  const persist = () => save(storeKey, readDraft());

  function showCond() {
    if (!a.personal || !condEl) return;
    const d = parseDigit(dEl?.value);
    condEl.innerHTML =
      d == null ? "末尾の数字（0〜9）を入れると、あなたの条件が出ます。" : `<strong>あなたの条件:</strong> ${inline(a.personal(d))}`;
  }
  function checkUrl(id) {
    const el = $(`submit-url-${id}`);
    const warnEl = doc.getElementById(`submit-url-${id}-warn`);
    if (!el || !warnEl) return;
    const v = el.value.trim();
    warnEl.textContent = v ? checkSubmissionUrl(v, topicId).warn ?? "" : "";
  }
  function showCount() {
    if (!countEl || !discussEl) return;
    const n = [...discussEl.value.replace(/\s/g, "")].length;
    countEl.textContent = `${n} 字${n && (n < DISCUSS_MIN || n > DISCUSS_MAX) ? `（目安は ${DISCUSS_MIN}〜${DISCUSS_MAX} 字）` : ""}`;
  }

  // 下書きを戻す
  for (const u of a.urls) {
    const el = $(`submit-url-${u.id}`);
    if (el) el.value = draft.urls?.[u.id] ?? "";
    checkUrl(u.id);
  }
  if (observeEl) observeEl.value = draft.observe ?? "";
  if (discussEl) discussEl.value = draft.discuss ?? "";
  if (dEl) {
    const d = load(STORE_D, null);
    if (parseDigit(d) != null) dEl.value = String(d);
    dEl.addEventListener("input", () => {
      const v = parseDigit(dEl.value);
      if (v != null) save(STORE_D, v);
      showCond();
    });
  }
  showCond();
  showCount();

  doc.querySelectorAll(".submission-take").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = /** @type {HTMLElement} */ (btn).dataset.urlId || "";
      const url = currentShareUrl();
      const el = $(`submit-url-${id}`);
      if (!el) return;
      if (!url) {
        const w = doc.getElementById(`submit-url-${id}-warn`);
        if (w) w.textContent = "このページでは URL を作れません";
        return;
      }
      el.value = url;
      checkUrl(id);
      persist();
    });
  });
  for (const u of a.urls) {
    $(`submit-url-${u.id}`)?.addEventListener("input", () => {
      checkUrl(u.id);
      persist();
    });
  }
  observeEl?.addEventListener("input", persist);
  discussEl?.addEventListener("input", () => {
    showCount();
    persist();
  });
  doc.getElementById("submit-paste-status")?.addEventListener("click", () => {
    const st = doc.getElementById("status")?.textContent?.trim();
    if (!st || !observeEl) return;
    observeEl.value = observeEl.value ? `${observeEl.value.trimEnd()}\n${st}` : st;
    persist();
  });

  doc.getElementById("submit-copy")?.addEventListener("click", async () => {
    const data = { d: parseDigit(dEl?.value), ...readDraft() };
    const text = buildSubmissionText(a, topicId, data);
    const warns = [];
    if (a.personal && data.d == null) warns.push("学籍番号の末尾が未入力");
    for (const u of a.urls) {
      const r = checkSubmissionUrl(data.urls[u.id], topicId);
      if (r.warn) warns.push(`URL ${u.id}: ${r.warn}`);
    }
    if (!data.observe.trim()) warns.push("観察が未入力");
    if (!data.discuss.trim()) warns.push("考察が未入力");
    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      copied = false;
    }
    if (outEl) {
      outEl.value = text;
      outEl.hidden = copied;
      if (!copied) outEl.select();
    }
    if (msgEl) {
      msgEl.textContent =
        (copied ? "コピーしました。LMS の提出欄に貼ってください。" : "コピーできませんでした。下の欄のテキストを選んでコピーしてください。") +
        (warns.length ? `（確認: ${warns.join("、")}）` : "");
    }
  });
}
