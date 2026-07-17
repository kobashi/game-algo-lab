/**
 * AABB 衝突判定デモ（説明特化 UI）
 * 共通基盤: js/platform
 */

import {
  createStatus,
  createPlayback,
  loadTextSample,
  mountSiteHeaderFromDataset,
} from "./platform/index.js";

mountSiteHeaderFromDataset();

const canvas = document.getElementById("aabb-canvas");
const ctx = canvas?.getContext("2d");
const projX = document.getElementById("proj-x");
const projY = document.getElementById("proj-y");

const storyEl = document.getElementById("aabb-story");
const verdictEl = document.getElementById("verdict");
const verdictText = document.getElementById("verdict-text");
const verdictAgree = document.getElementById("verdict-agree");
const formulaX = document.getElementById("formula-x");
const formulaY = document.getElementById("formula-y");
const badgeX = document.getElementById("proj-x-badge");
const badgeY = document.getElementById("proj-y-badge");
const numbersEl = document.getElementById("aabb-numbers");
const csharpSample = document.getElementById("csharp-sample");
const btnPlay = document.getElementById("btn-play");
const btnStep = document.getElementById("btn-step");
const btnReset = document.getElementById("btn-reset");
const speedEl = document.getElementById("speed");
const posResult = document.getElementById("pos-result");
const negResult = document.getElementById("neg-result");
const snippetPos = document.getElementById("snippet-pos");
const snippetNeg = document.getElementById("snippet-neg");
const complexityBody = document.getElementById("complexity-body");
const liveAgreeNote = document.getElementById("live-agree-note");
const sepXNote = document.getElementById("sep-x-note");
const sepYNote = document.getElementById("sep-y-note");
const methodPos = document.getElementById("method-positive");
const methodNeg = document.getElementById("method-negative");

const setStatus = createStatus(document.getElementById("status"));

/** @typedef {{ x: number, y: number, w: number, h: number, color: string, label: string }} Box */
/** @typedef {{ minX: number, minY: number, maxX: number, maxY: number }} Bounds */

/** @type {Box} */
let boxA = { x: 80, y: 120, w: 110, h: 80, color: "#5b9fd4", label: "A プレイヤー" };
/** @type {Box} */
let boxB = { x: 320, y: 160, w: 140, h: 100, color: "#e07a5f", label: "B 障害物" };

const PAD = 8;
const MIN_SIZE = 36;
const HANDLE = 10;

/** @type {null | { which: 'A'|'B', mode: 'move'|'resize', ox: number, oy: number }} */
let drag = null;

/**
 * 説明ステップ:
 * 0=ライブ全体
 * ポジティブ: 1=overlapX, 2=overlapY, 3=AND
 * ネガティブ: 4=separatedX, 5=separatedY, 6=NOT OR
 */
let explainStep = 0;
/** @type {'both'|'positive'|'negative'} */
let focusMode = "both";
let demoT = 0;

const PRESETS = {
  apart: {
    A: { x: 60, y: 100, w: 100, h: 90 },
    B: { x: 380, y: 180, w: 120, h: 90 },
    story: "離れている — 少なくとも1軸で分離（ネガティブが効きやすい例）。",
  },
  overlap: {
    A: { x: 200, y: 130, w: 120, h: 100 },
    B: { x: 260, y: 160, w: 140, h: 110 },
    story: "交差 — 両軸で重なる。ポジティブの AND が両方 true。",
  },
  touch: {
    A: { x: 120, y: 140, w: 100, h: 80 },
    B: { x: 220, y: 140, w: 100, h: 80 },
    story: "辺が接する — inclusive（≥≤）では衝突。分離は厳密 < >。",
  },
  contain: {
    A: { x: 220, y: 140, w: 80, h: 70 },
    B: { x: 180, y: 110, w: 200, h: 160 },
    story: "包含 — 小さい方が内側。両軸で重なるので衝突。",
  },
};

const INITIAL = {
  A: { x: 80, y: 120, w: 110, h: 80 },
  B: { x: 320, y: 160, w: 140, h: 100 },
};

/** 教材用: 静的複雑度メトリクス（実装に対応） */
const COMPLEXITY = [
  {
    metric: "考え方",
    pos: "重なりを肯定して AND",
    neg: "分離を肯定して OR → NOT",
    early: "分離を1つずつ調べ早期 false",
  },
  {
    metric: "比較演算（境界）",
    pos: "4（各軸 2）",
    neg: "4（各軸 2）",
    early: "最大 4（短絡で 1〜4）",
  },
  {
    metric: "論理演算子",
    pos: "&& ×3（軸内2 + 軸間1）",
    neg: "|| ×2 + ! ×1",
    early: "なし（if 連鎖）",
  },
  {
    metric: "分岐 / return",
    pos: "1 return",
    neg: "1 return",
    early: "return 最大 5（false×4 + true）",
  },
  {
    metric: "実行行数目安*",
    pos: "3 行",
    neg: "3 行",
    early: "5 行",
  },
  {
    metric: "サイクロマチック目安**",
    pos: "1 + 条件3 ≈ 4",
    neg: "1 + 条件3 ≈ 4",
    early: "1 + 分岐4 ≈ 5",
  },
  {
    metric: "早期打ち切り",
    pos: "&& の短絡のみ",
    neg: "|| の短絡のみ",
    early: "明示的（分離で即 false）",
  },
  {
    metric: "読みやすさ（主観）",
    pos: "定義に素直（衝突とは重なり）",
    neg: "分離軸の発想（物理・SAT に近い）",
    early: "ゲーム実装でよく見る形",
  },
];

const SNIPPET_POS = `// A. ポジティブ（重なり）
bool overlapX = a.MaxX >= b.MinX && a.MinX <= b.MaxX;
bool overlapY = a.MaxY >= b.MinY && a.MinY <= b.MaxY;
return overlapX && overlapY;`;

const SNIPPET_NEG = `// B. ネガティブ（分離）
bool sepX = a.MaxX < b.MinX || a.MinX > b.MaxX;
bool sepY = a.MaxY < b.MinY || a.MinY > b.MaxY;
return !(sepX || sepY);

// B′ 早期 return
if (a.MaxX < b.MinX) return false;
if (a.MinX > b.MaxX) return false;
if (a.MaxY < b.MinY) return false;
if (a.MinY > b.MaxY) return false;
return true;`;

function bounds(box) {
  return {
    minX: box.x,
    minY: box.y,
    maxX: box.x + box.w,
    maxY: box.y + box.h,
  };
}

// ========== 2 通りの核ロジック（教材の本体） ==========

/**
 * A. ポジティブ: 重なり判定
 * @param {Bounds} A
 * @param {Bounds} B
 */
function intersectsPositive(A, B) {
  const overlapX = A.maxX >= B.minX && A.minX <= B.maxX;
  const overlapY = A.maxY >= B.minY && A.minY <= B.maxY;
  return {
    overlapX,
    overlapY,
    colliding: overlapX && overlapY,
  };
}

/**
 * B. ネガティブ: 分離していなければ衝突
 * @param {Bounds} A
 * @param {Bounds} B
 */
function intersectsNegative(A, B) {
  const separatedX = A.maxX < B.minX || A.minX > B.maxX;
  const separatedY = A.maxY < B.minY || A.minY > B.maxY;
  return {
    separatedX,
    separatedY,
    colliding: !(separatedX || separatedY),
  };
}

/**
 * B′ 早期 return（比較用・実行結果は B と同じ）
 * @param {Bounds} A
 * @param {Bounds} B
 */
function intersectsNegativeEarlyOut(A, B) {
  if (A.maxX < B.minX) return false;
  if (A.minX > B.maxX) return false;
  if (A.maxY < B.minY) return false;
  if (A.minY > B.maxY) return false;
  return true;
}

function evaluate() {
  const A = bounds(boxA);
  const B = bounds(boxB);
  const pos = intersectsPositive(A, B);
  const neg = intersectsNegative(A, B);
  const early = intersectsNegativeEarlyOut(A, B);
  return {
    A,
    B,
    ...pos,
    separatedX: neg.separatedX,
    separatedY: neg.separatedY,
    positive: pos.colliding,
    negative: neg.colliding,
    early,
    agree: pos.colliding === neg.colliding && neg.colliding === early,
  };
}

function clampBox(box) {
  const W = canvas.width;
  const H = canvas.height;
  box.w = Math.max(MIN_SIZE, Math.min(box.w, W - PAD * 2));
  box.h = Math.max(MIN_SIZE, Math.min(box.h, H - PAD * 2));
  box.x = Math.max(PAD, Math.min(box.x, W - PAD - box.w));
  box.y = Math.max(PAD, Math.min(box.y, H - PAD - box.h));
}

function applyPreset(name) {
  stopAuto();
  explainStep = 0;
  const p = PRESETS[name];
  if (!p) return;
  Object.assign(boxA, p.A);
  Object.assign(boxB, p.B);
  if (storyEl) storyEl.textContent = p.story;
  setStatus(`プリセット「${name}」を適用`);
  refresh();
}

function resetBoxes() {
  stopAuto();
  explainStep = 0;
  Object.assign(boxA, INITIAL.A);
  Object.assign(boxB, INITIAL.B);
  if (storyEl) {
    storyEl.textContent =
      "青 = プレイヤー、橙 = 障害物。A（重なり）と B（分離）の2通りで同じ結果になるか確認。";
  }
  setStatus("リセットしました");
  refresh();
}

// ----- 描画 -----
function drawStage() {
  if (!ctx || !canvas) return;
  const W = canvas.width;
  const H = canvas.height;
  const t = evaluate();

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(45, 58, 77, 0.55)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#6a7d94";
  ctx.font = "11px sans-serif";
  ctx.fillText("X →", W - 36, H - 10);
  ctx.fillText("Y ↓", 8, 16);

  if (t.positive) {
    const ox = Math.max(t.A.minX, t.B.minX);
    const oy = Math.max(t.A.minY, t.B.minY);
    const ow = Math.min(t.A.maxX, t.B.maxX) - ox;
    const oh = Math.min(t.A.maxY, t.B.maxY) - oy;
    ctx.fillStyle = "rgba(242, 204, 143, 0.35)";
    ctx.fillRect(ox, oy, ow, oh);
    ctx.strokeStyle = "#f2cc8f";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(ox, oy, ow, oh);
    ctx.setLineDash([]);
    ctx.fillStyle = "#f2cc8f";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("重なり", ox + 4, oy + 14);
  }

  drawBox(boxA, 1);
  drawBox(boxB, 1);

  if (explainStep === 1 || explainStep === 4) drawVGuides(t.A, t.B);
  if (explainStep === 2 || explainStep === 5) drawHGuides(t.A, t.B);

  ctx.font = "bold 12px sans-serif";
  ctx.fillStyle = t.positive ? "#6bcb8f" : "#9aabbf";
  ctx.fillText(
    t.positive
      ? "● 衝突  A≡B  (重なり AND ／ ¬分離)"
      : "○ 非衝突  A≡B",
    12,
    H - 14
  );
}

function drawBox(box, alpha) {
  if (!ctx) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = box.color + "55";
  ctx.strokeStyle = box.color;
  ctx.lineWidth = 2.5;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.strokeRect(box.x, box.y, box.w, box.h);
  ctx.fillStyle = box.color;
  ctx.font = "bold 12px sans-serif";
  ctx.fillText(box.label, box.x + 6, box.y + 16);
  ctx.font = "10px ui-monospace, Menlo, monospace";
  ctx.fillStyle = "#c5d0dc";
  ctx.fillText(
    `(${Math.round(box.x)},${Math.round(box.y)})`,
    box.x + 4,
    box.y + box.h - 6
  );
  ctx.fillStyle = "#e8eef6";
  ctx.fillRect(box.x + box.w - HANDLE, box.y + box.h - HANDLE, HANDLE, HANDLE);
  ctx.restore();
}

function drawVGuides(A, B) {
  if (!ctx) return;
  ctx.strokeStyle = "rgba(91, 159, 212, 0.5)";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  for (const x of [A.minX, A.maxX, B.minX, B.maxX]) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawHGuides(A, B) {
  if (!ctx) return;
  ctx.strokeStyle = "rgba(224, 122, 95, 0.5)";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  for (const y of [A.minY, A.maxY, B.minY, B.maxY]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawProjection1D(c, isX) {
  if (!c || !canvas) return;
  const g = c.getContext("2d");
  if (!g) return;
  const W = c.width;
  const H = c.height;
  const t = evaluate();
  const overlap = isX ? t.overlapX : t.overlapY;

  g.clearRect(0, 0, W, H);
  g.fillStyle = "#0a0e14";
  g.fillRect(0, 0, W, H);

  const margin = 24;
  const trackY = H / 2;
  const worldMax = isX ? canvas.width : canvas.height;
  const scale = (W - margin * 2) / worldMax;
  const toPx = (v) => margin + v * scale;

  g.strokeStyle = "#3d4f66";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(margin, trackY);
  g.lineTo(W - margin, trackY);
  g.stroke();

  const a0 = isX ? t.A.minX : t.A.minY;
  const a1 = isX ? t.A.maxX : t.A.maxY;
  const b0 = isX ? t.B.minX : t.B.minY;
  const b1 = isX ? t.B.maxX : t.B.maxY;

  drawInterval(g, toPx(a0), toPx(a1), trackY - 10, boxA.color, "A");
  drawInterval(g, toPx(b0), toPx(b1), trackY + 6, boxB.color, "B");

  if (overlap) {
    const o0 = Math.max(a0, b0);
    const o1 = Math.min(a1, b1);
    g.fillStyle = "rgba(242, 204, 143, 0.45)";
    g.fillRect(toPx(o0), trackY - 4, toPx(o1) - toPx(o0), 8);
    g.strokeStyle = "#f2cc8f";
    g.strokeRect(toPx(o0), trackY - 4, toPx(o1) - toPx(o0), 8);
  }

  g.fillStyle = "#9aabbf";
  g.font = "10px sans-serif";
  g.fillText(isX ? "minX … maxX" : "minY … maxY", margin, 12);
}

function drawInterval(g, x0, x1, y, color, label) {
  const h = 8;
  g.fillStyle = color + "99";
  g.strokeStyle = color;
  g.lineWidth = 2;
  g.fillRect(x0, y, Math.max(2, x1 - x0), h);
  g.strokeRect(x0, y, Math.max(2, x1 - x0), h);
  g.fillStyle = color;
  g.font = "bold 10px sans-serif";
  g.fillText(label, x0 + 2, y - 2);
}

function setMark(el, ok, focus) {
  if (!el) return;
  el.textContent = ok ? "✓" : "✗";
  el.classList.toggle("ok", ok);
  el.classList.toggle("ng", !ok);
  el.classList.toggle("focus", focus);
}

function setItemFocus(listRoot, stepAttr, active) {
  if (!listRoot) return;
  listRoot.querySelectorAll(".aabb-check-item").forEach((el) => {
    el.classList.toggle("is-focus", active && el.getAttribute("data-step") === stepAttr);
  });
}

function fmt(n) {
  return String(Math.round(n));
}

function updatePanels() {
  const t = evaluate();

  if (verdictEl && verdictText) {
    verdictEl.dataset.state = t.positive ? "yes" : "no";
    verdictText.textContent = t.positive ? "衝突している" : "非衝突";
  }
  if (verdictAgree) {
    verdictAgree.textContent = t.agree ? "A ≡ B ≡ B′" : "⚠ 不一致（定義を確認）";
    verdictAgree.dataset.ok = t.agree ? "1" : "0";
  }

  // ポジティブ
  setMark(document.getElementById("check-px"), t.overlapX, explainStep === 1);
  setMark(document.getElementById("check-py"), t.overlapY, explainStep === 2);
  setMark(document.getElementById("check-pand"), t.positive, explainStep === 3);
  setItemFocus(document.getElementById("checklist-pos"), "px", explainStep === 1);
  setItemFocus(document.getElementById("checklist-pos"), "py", explainStep === 2);
  setItemFocus(document.getElementById("checklist-pos"), "pand", explainStep === 3);
  document.querySelectorAll("#checklist-pos .aabb-check-item").forEach((el) => {
    const step = el.getAttribute("data-step");
    const pass =
      (step === "px" && t.overlapX) ||
      (step === "py" && t.overlapY) ||
      (step === "pand" && t.positive);
    el.classList.toggle("is-pass", pass);
    el.classList.toggle("is-fail", !pass);
  });

  // ネガティブ（分離が true = 非衝突側）
  // マーク: 分離していれば「分離✓」だが教材では真偽をそのまま
  setMark(document.getElementById("check-nx"), !t.separatedX, explainStep === 4);
  setMark(document.getElementById("check-ny"), !t.separatedY, explainStep === 5);
  setMark(document.getElementById("check-nand"), t.negative, explainStep === 6);
  // 注: check-nx shows !separatedX (overlap on X) as ok for "not separated"
  // For pedagogy of negative path, also show separated truth in notes
  if (sepXNote) {
    sepXNote.textContent = t.separatedX
      ? " → 分離している（X だけで非衝突にできる）"
      : " → 分離していない（X では切れない）";
  }
  if (sepYNote) {
    sepYNote.textContent = t.separatedY
      ? " → 分離している（Y だけで非衝突にできる）"
      : " → 分離していない（Y では切れない）";
  }
  setItemFocus(document.getElementById("checklist-neg"), "nx", explainStep === 4);
  setItemFocus(document.getElementById("checklist-neg"), "ny", explainStep === 5);
  setItemFocus(document.getElementById("checklist-neg"), "nand", explainStep === 6);
  document.querySelectorAll("#checklist-neg .aabb-check-item").forEach((el) => {
    const step = el.getAttribute("data-step");
    let pass = false;
    if (step === "nx") pass = !t.separatedX;
    if (step === "ny") pass = !t.separatedY;
    if (step === "nand") pass = t.negative;
    el.classList.toggle("is-pass", pass);
    el.classList.toggle("is-fail", !pass);
  });

  if (posResult) {
    posResult.textContent = t.positive ? "衝突" : "非衝突";
    posResult.dataset.on = t.positive ? "1" : "0";
  }
  if (negResult) {
    negResult.textContent = t.negative ? "衝突" : "非衝突";
    negResult.dataset.on = t.negative ? "1" : "0";
  }

  if (badgeX) {
    badgeX.textContent = t.overlapX ? "重なる / 非分離" : "重ならない / 分離";
    badgeX.dataset.on = t.overlapX ? "1" : "0";
  }
  if (badgeY) {
    badgeY.textContent = t.overlapY ? "重なる / 非分離" : "重ならない / 分離";
    badgeY.dataset.on = t.overlapY ? "1" : "0";
  }

  if (formulaX) {
    formulaX.textContent =
      `overlapX=${t.overlapX}  ·  separatedX=${t.separatedX}  ` +
      `(${fmt(t.A.maxX)}≥${fmt(t.B.minX)} ∧ ${fmt(t.A.minX)}≤${fmt(t.B.maxX)})`;
  }
  if (formulaY) {
    formulaY.textContent =
      `overlapY=${t.overlapY}  ·  separatedY=${t.separatedY}  ` +
      `(${fmt(t.A.maxY)}≥${fmt(t.B.minY)} ∧ ${fmt(t.A.minY)}≤${fmt(t.B.maxY)})`;
  }

  if (numbersEl) {
    numbersEl.innerHTML = `
      <table class="aabb-table">
        <thead><tr><th></th><th>minX</th><th>minY</th><th>maxX</th><th>maxY</th></tr></thead>
        <tbody>
          <tr class="row-a"><td>A</td><td>${fmt(t.A.minX)}</td><td>${fmt(t.A.minY)}</td><td>${fmt(t.A.maxX)}</td><td>${fmt(t.A.maxY)}</td></tr>
          <tr class="row-b"><td>B</td><td>${fmt(t.B.minX)}</td><td>${fmt(t.B.minY)}</td><td>${fmt(t.B.maxX)}</td><td>${fmt(t.B.maxY)}</td></tr>
        </tbody>
      </table>
      <p class="aabb-eq-live">A(pos)=<strong>${t.positive}</strong> · B(neg)=<strong>${t.negative}</strong> · B′=<strong>${t.early}</strong> · ${
      t.agree ? "一致 ✓" : "不一致"
    }</p>
    `;
  }

  if (snippetPos) snippetPos.textContent = SNIPPET_POS;
  if (snippetNeg) snippetNeg.textContent = SNIPPET_NEG;

  if (liveAgreeNote) {
    liveAgreeNote.textContent = t.agree
      ? `実行時: 現在の矩形では A・B・B′ の結果はすべて ${t.positive}（一致）。`
      : "実行時: 結果が一致しません。境界条件の定義を確認してください。";
  }

  // フォーカス強調
  methodPos?.classList.toggle(
    "is-dim",
    focusMode === "negative" || (explainStep >= 4 && explainStep <= 6)
  );
  methodNeg?.classList.toggle(
    "is-dim",
    focusMode === "positive" || (explainStep >= 1 && explainStep <= 3)
  );
  if (focusMode === "both" && explainStep === 0) {
    methodPos?.classList.remove("is-dim");
    methodNeg?.classList.remove("is-dim");
  }
  if (explainStep >= 1 && explainStep <= 3) {
    methodPos?.classList.remove("is-dim");
    methodNeg?.classList.add("is-dim");
  }
  if (explainStep >= 4 && explainStep <= 6) {
    methodNeg?.classList.remove("is-dim");
    methodPos?.classList.add("is-dim");
  }
}

function renderComplexityTable() {
  if (!complexityBody) return;
  complexityBody.innerHTML = COMPLEXITY.map(
    (row) => `
    <tr>
      <th scope="row">${row.metric}</th>
      <td>${row.pos}</td>
      <td>${row.neg}</td>
      <td>${row.early}</td>
    </tr>`
  ).join("");
}

function refresh() {
  drawStage();
  drawProjection1D(projX, true);
  drawProjection1D(projY, false);
  updatePanels();
}

// ----- ポインタ -----
function canvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * sx,
    y: (e.clientY - rect.top) * sy,
  };
}

function hitHandle(box, x, y) {
  return (
    x >= box.x + box.w - HANDLE - 2 &&
    x <= box.x + box.w + 2 &&
    y >= box.y + box.h - HANDLE - 2 &&
    y <= box.y + box.h + 2
  );
}

function hitBox(box, x, y) {
  return x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
}

function onPointerDown(e) {
  if (!canvas) return;
  stopAuto();
  explainStep = 0;
  const { x, y } = canvasPos(e);
  const order = [
    { which: "B", box: boxB },
    { which: "A", box: boxA },
  ];
  for (const o of order) {
    if (hitHandle(o.box, x, y)) {
      drag = { which: o.which, mode: "resize", ox: x, oy: y };
      canvas.setPointerCapture?.(e.pointerId);
      return;
    }
  }
  for (const o of order) {
    if (hitBox(o.box, x, y)) {
      drag = {
        which: o.which,
        mode: "move",
        ox: x - o.box.x,
        oy: y - o.box.y,
      };
      canvas.setPointerCapture?.(e.pointerId);
      return;
    }
  }
}

function onPointerMove(e) {
  if (!drag) return;
  const { x, y } = canvasPos(e);
  const box = drag.which === "A" ? boxA : boxB;
  if (drag.mode === "move") {
    box.x = x - drag.ox;
    box.y = y - drag.oy;
  } else {
    box.w = x - box.x;
    box.h = y - box.y;
  }
  clampBox(box);
  const t = evaluate();
  setStatus(
    `${drag.which} 編集中… A=${t.positive} B=${t.negative}` +
      (t.agree ? "（一致）" : "（不一致）")
  );
  refresh();
}

function onPointerUp(e) {
  if (!drag) return;
  drag = null;
  try {
    canvas.releasePointerCapture?.(e.pointerId);
  } catch {
    /* ignore */
  }
  setStatus("ドラッグ終了 — 下の A/B ロジックと複雑度表を確認");
}

// ----- ステップ説明 -----
function stepExplain() {
  stopAuto();
  if (focusMode === "positive") {
    explainStep = explainStep >= 1 && explainStep < 3 ? explainStep + 1 : 1;
  } else if (focusMode === "negative") {
    explainStep = explainStep >= 4 && explainStep < 6 ? explainStep + 1 : 4;
  } else {
    // both: 1→2→3→4→5→6→0
    if (explainStep === 0) explainStep = 1;
    else if (explainStep >= 6) explainStep = 0;
    else explainStep += 1;
  }

  const t = evaluate();
  const msgs = {
    0: "ライブ表示",
    1: `A① overlapX = ${t.overlapX}`,
    2: `A② overlapY = ${t.overlapY}`,
    3: `A③ return overlapX && overlapY → ${t.positive}`,
    4: `B① separatedX = ${t.separatedX}`,
    5: `B② separatedY = ${t.separatedY}`,
    6: `B③ return !(sepX || sepY) → ${t.negative}`,
  };
  setStatus(msgs[explainStep] ?? "");
  refresh();
}

function demoFrame() {
  demoT += 0.035;
  boxA.x = 80 + Math.sin(demoT) * 160 + 80;
  boxA.y = 120 + Math.cos(demoT * 0.7) * 40;
  clampBox(boxA);
  explainStep = 0;
  const t = evaluate();
  setStatus(
    `自動デモ… 衝突=${t.positive}（A≡B: ${t.agree ? "yes" : "no"}）`
  );
  refresh();
  return true; // 手動停止まで継続
}

const playback = createPlayback({
  btnPlay: /** @type {HTMLButtonElement | null} */ (btnPlay),
  speedEl: /** @type {HTMLInputElement | null} */ (speedEl),
  onTick: () => demoFrame(),
  defaultDelayMs: 120,
  labelPlay: "自動デモ",
  labelPause: "停止",
});

function stopAuto() {
  playback.stop();
}

// イベント
canvas?.addEventListener("pointerdown", onPointerDown);
canvas?.addEventListener("pointermove", onPointerMove);
canvas?.addEventListener("pointerup", onPointerUp);
canvas?.addEventListener("pointercancel", onPointerUp);

btnPlay?.addEventListener("click", () => {
  if (playback.running) {
    stopAuto();
    setStatus("自動デモを停止");
    return;
  }
  demoT = 0;
  playback.start();
});
btnStep?.addEventListener("click", stepExplain);
btnReset?.addEventListener("click", resetBoxes);

document.querySelectorAll("[data-preset]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const name = btn.getAttribute("data-preset");
    if (name) applyPreset(name);
  });
});

document.querySelectorAll("[data-focus]").forEach((btn) => {
  btn.addEventListener("click", () => {
    focusMode = /** @type {'both'|'positive'|'negative'} */ (
      btn.getAttribute("data-focus") || "both"
    );
    document.querySelectorAll("[data-focus]").forEach((b) => {
      const on = b === btn;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    explainStep = 0;
    setStatus(
      focusMode === "positive"
        ? "焦点: A ポジティブ（重なり）—「判定を1段」で ①→②→③"
        : focusMode === "negative"
          ? "焦点: B ネガティブ（分離）—「判定を1段」で ①→②→③"
          : "焦点: 両方 —「判定を1段」で A のあと B"
    );
    refresh();
  });
});

renderComplexityTable();
resetBoxes();
loadTextSample(
  "../samples/AabbExample.cs",
  csharpSample,
  "// samples/AabbExample.cs を読み込めませんでした。"
);
