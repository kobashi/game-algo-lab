/**
 * 学生が書いた関数を読み、動作テストの結果を出す。
 * この欄は教材用の実験で、ブラウザの外への安全境界ではない。
 */

const BANNED =
  /`|\b(import|fetch|document|window|globalThis|eval|Function|XMLHttpRequest|localStorage|navigator)\b/;

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
 *   quiz?: { q: string, choices: string[], answer: number, explain: string },
 *   run: (fns: Record<string, Function>, source: string, design: string) => { ok: boolean, lines: string[], json?: object },
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

  const label = document.createElement("label");
  label.className = "controls-label";
  label.textContent = "設計・実装";
  const area = document.createElement("textarea");
  area.className = "sfx-json";
  area.rows = 12;
  area.spellcheck = false;
  area.value = task.starter;
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
  runBtn.textContent = "動作テスト";
  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "btn btn-ghost";
  saveBtn.textContent = "結果を JSON で保存";
  row.append(runBtn, saveBtn);

  const result = document.createElement("pre");
  result.className = "student-result";
  result.textContent = "まだテストしていません。上の実験で音を聞いたあと、関数を書き換えてからテストします。";
  host.append(row, result);

  /** @type {object | null} */
  let lastJson = null;

  function execute() {
    try {
      const fns = compileFns(area.value, task.names);
      const report = task.run(fns, area.value, designArea?.value || "");
      lastJson = report.json || {
        v: 1,
        ok: report.ok,
        lines: report.lines,
      };
      result.dataset.state = report.ok ? "ok" : "fail";
      result.textContent = report.lines.join("\n");
    } catch (err) {
      lastJson = null;
      result.dataset.state = "fail";
      result.textContent = err instanceof Error ? err.message : "関数を読めませんでした";
    }
  }

  runBtn.addEventListener("click", execute);
  saveBtn.addEventListener("click", () => {
    execute();
    if (!lastJson) return;
    const blob = new Blob([JSON.stringify(lastJson, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audio-task.json";
    a.click();
    URL.revokeObjectURL(url);
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
