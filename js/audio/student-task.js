/**
 * 学生が書いた関数を読み、動作テストの結果を出す。
 * この欄は教材用の実験で、ブラウザの外への安全境界ではない。
 */

const BANNED =
  /`|\b(import|fetch|document|window|globalThis|eval|Function|XMLHttpRequest|localStorage|navigator)\b/;

/**
 * @typedef {{
 *   ok: boolean,
 *   lines: string[],
 *   json?: object,
 *   preview?: ReturnType<typeof import("./audio-checks.js").checkSoundFor>["preview"],
 * }} StudentTaskResult
 */

/**
 * @param {string} source
 * @param {string[]} names
 */
export function compileFns(source, names) {
  const text = String(source ?? "");
  if (text.length > 8000) throw new Error("コードは 8000 字までです");
  if (BANNED.test(text)) throw new Error("この欄では、渡された引数から値を計算する関数だけを書きます");
  const factory = new Function(`${text}\n;return { ${names.join(", ")} };`);
  const bag = factory();
  for (const name of names) {
    if (typeof bag?.[name] !== "function") {
      throw new Error(`${name} を関数として定義します`);
    }
  }
  return bag;
}

/**
 * @param {HTMLElement} host
 * @param {{
 *   title: string,
 *   goal: string,
 *   predict: string,
 *   look: string,
 *   starter: string,
 *   names: string[],
 *   design?: boolean,
 *   eventName?: { label: string, placeholder?: string },
 *   runLabel?: string,
 *   saveJson?: boolean,
 *   onTest?: (report: StudentTaskResult | null) => void,
 *   quiz?: { q: string, choices: string[], answer: number, explain: string },
 *   run: (
 *     fns: Record<string, Function>,
 *     source: string,
 *     design: string,
 *     extra?: { eventName?: string },
 *   ) => StudentTaskResult,
 * }} task
 */
export function mountStudentTask(host, task) {
  host.classList.add("student-task");
  host.innerHTML = "";

  const title = document.createElement("h2");
  title.textContent = task.title;
  const goal = document.createElement("p");
  goal.textContent = task.goal;
  const predict = document.createElement("p");
  predict.innerHTML = `<strong>操作の前に。</strong> ${escapeText(task.predict)}`;
  const look = document.createElement("p");
  look.innerHTML = `<strong>結果の見方。</strong> ${escapeText(task.look)}`;
  host.append(title, goal, predict, look);

  if (task.quiz) {
    host.append(renderQuiz(task.quiz));
  }

  /** @type {HTMLInputElement | null} */
  let eventInput = null;
  if (task.eventName) {
    const nameLabel = document.createElement("label");
    nameLabel.className = "controls-label";
    nameLabel.textContent = task.eventName.label;
    eventInput = document.createElement("input");
    eventInput.type = "text";
    eventInput.className = "student-event";
    eventInput.spellcheck = false;
    eventInput.autocomplete = "off";
    eventInput.maxLength = 25;
    eventInput.placeholder = task.eventName.placeholder || "";
    eventInput.dataset.taskField = "event";
    nameLabel.appendChild(eventInput);
    host.append(nameLabel);
  }

  const label = document.createElement("label");
  label.className = "controls-label";
  label.textContent = "設計・実装";
  const area = document.createElement("textarea");
  area.className = "sfx-json";
  area.rows = 12;
  area.spellcheck = false;
  area.value = task.starter;
  area.dataset.taskField = "code";
  label.appendChild(area);

  /** @type {HTMLTextAreaElement | null} */
  let designArea = null;
  if (task.design) {
    const designLabel = document.createElement("label");
    designLabel.className = "controls-label";
    designLabel.textContent = "設計の意図";
    designArea = document.createElement("textarea");
    designArea.className = "sfx-json";
    designArea.rows = 4;
    designArea.placeholder = "どのゲームの状態を、どの音のパラメータに対応させたか";
    designLabel.appendChild(designArea);
    host.append(label, designLabel);
  } else {
    host.append(label);
  }

  const row = document.createElement("div");
  row.className = "control-row";
  const runBtn = document.createElement("button");
  runBtn.type = "button";
  runBtn.className = "btn btn-primary";
  runBtn.textContent = task.runLabel || "動作テスト";
  row.append(runBtn);
  if (task.saveJson !== false) {
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "btn btn-ghost";
    saveBtn.textContent = "結果を JSON で保存";
    saveBtn.addEventListener("click", () => {
      const report = execute();
      if (!report) return;
      const json = report.json || { v: 1, ok: report.ok, lines: report.lines };
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "audio-task.json";
      a.click();
      URL.revokeObjectURL(url);
    });
    row.append(saveBtn);
  }
  /** @type {HTMLButtonElement | null} */
  let handoffBtn = null;
  /** @type {HTMLParagraphElement | null} */
  let handoffNote = null;
  if (eventInput) {
    handoffBtn = document.createElement("button");
    handoffBtn.type = "button";
    handoffBtn.className = "btn btn-ghost";
    handoffBtn.textContent = "提出票へ入れる";
    row.append(handoffBtn);
    handoffNote = document.createElement("p");
    handoffNote.className = "footer-muted";
  }

  const result = document.createElement("pre");
  result.className = "student-result";
  result.setAttribute("role", "status");
  result.textContent = `関数を書き換えたら「${runBtn.textContent}」を押します。`;
  host.append(row, result);
  if (handoffNote) host.append(handoffNote);

  function execute() {
    try {
      const fns = compileFns(area.value, task.names);
      const report = task.run(fns, area.value, designArea?.value || "", {
        eventName: eventInput?.value ?? "",
      });
      result.dataset.state = report.ok ? "ok" : "fail";
      result.textContent = report.lines.join("\n");
      return report;
    } catch (err) {
      result.dataset.state = "fail";
      result.textContent = err instanceof Error ? err.message : "関数を読めませんでした";
      return null;
    }
  }

  runBtn.addEventListener("click", () => {
    const report = execute();
    task.onTest?.(report);
  });
  handoffBtn?.addEventListener("click", () => {
    const nameEl = document.getElementById("submit-event");
    const codeEl = document.getElementById("submit-code");
    if (!handoffNote || !eventInput) return;
    if (!(nameEl instanceof HTMLInputElement) || !(codeEl instanceof HTMLTextAreaElement)) {
      handoffNote.textContent = "提出票は、入門コースのページ（course=intro）に出ます。";
      return;
    }
    nameEl.value = eventInput.value;
    codeEl.value = area.value;
    nameEl.dispatchEvent(new Event("input", { bubbles: true }));
    codeEl.dispatchEvent(new Event("input", { bubbles: true }));
    handoffNote.textContent = "提出票の実装課題へ入れました。";
  });
}

/**
 * @param {string} text
 */
function escapeText(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/**
 * @param {{ q: string, choices: string[], answer: number, explain: string }} quiz
 */
function renderQuiz(quiz) {
  const box = document.createElement("div");
  box.className = "course-quiz-item";
  const q = document.createElement("p");
  q.className = "course-quiz-q";
  q.textContent = `確認。 ${quiz.q}`;
  const choices = document.createElement("div");
  choices.className = "course-quiz-choices";
  const feedback = document.createElement("p");
  feedback.className = "course-quiz-feedback";
  feedback.hidden = true;
  const buttons = quiz.choices.map((choice, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "course-quiz-choice";
    button.textContent = choice;
    button.addEventListener("click", () => {
      buttons.forEach((other, otherIndex) => {
        other.disabled = true;
        if (otherIndex === quiz.answer) other.dataset.state = "correct";
        else if (otherIndex === index) other.dataset.state = "wrong";
      });
      feedback.hidden = false;
      feedback.dataset.state = index === quiz.answer ? "correct" : "wrong";
      feedback.textContent = quiz.explain;
    });
    return button;
  });
  choices.append(...buttons);
  box.append(q, choices, feedback);
  return box;
}
