/**
 * AABB 衝突判定デモ（説明特化 UI）
 * - 2D ステージで矩形をドラッグ
 * - X/Y 軸投影で 1D 区間の重なりを同時表示
 * - 判定チェックリストをライブ／ステップでハイライト
 * ※ 経路探索マップは使わない
 */

const canvas = document.getElementById("aabb-canvas");
const ctx = canvas?.getContext("2d");
const projX = document.getElementById("proj-x");
const projY = document.getElementById("proj-y");
const ctxX = projX?.getContext("2d");
const ctxY = projY?.getContext("2d");

const statusEl = document.getElementById("status");
const storyEl = document.getElementById("aabb-story");
const verdictEl = document.getElementById("verdict");
const verdictText = document.getElementById("verdict-text");
const checkX = document.getElementById("check-x");
const checkY = document.getElementById("check-y");
const checkAnd = document.getElementById("check-and");
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

/** @typedef {{ x: number, y: number, w: number, h: number, color: string, label: string }} Box */

/** @type {Box} */
let boxA = { x: 80, y: 120, w: 110, h: 80, color: "#5b9fd4", label: "A プレイヤー" };
/** @type {Box} */
let boxB = { x: 320, y: 160, w: 140, h: 100, color: "#e07a5f", label: "B 障害物" };

const PAD = 8;
const MIN_SIZE = 36;
const HANDLE = 10;

/** @type {null | { which: 'A'|'B', mode: 'move'|'resize', ox: number, oy: number, start: Box }} */
let drag = null;

/** ステップ説明: 0=通常ライブ, 1=X強調, 2=Y強調, 3=結論 */
let explainStep = 0;
let running = false;
let timerId = null;
/** 自動デモ用 */
let demoT = 0;

const PRESETS = {
  apart: {
    A: { x: 60, y: 100, w: 100, h: 90 },
    B: { x: 380, y: 180, w: 120, h: 90 },
    story: "離れている — どちらの軸でも区間が重ならない（または片方だけ）。",
  },
  overlap: {
    A: { x: 200, y: 130, w: 120, h: 100 },
    B: { x: 260, y: 160, w: 140, h: 110 },
    story: "交差 — X も Y も区間が重なり、2D で重なり領域ができる。",
  },
  touch: {
    A: { x: 120, y: 140, w: 100, h: 80 },
    B: { x: 220, y: 140, w: 100, h: 80 },
    story: "辺が接する — 境界を含む判定（≥ ≤）では衝突あり。",
  },
  contain: {
    A: { x: 220, y: 140, w: 80, h: 70 },
    B: { x: 180, y: 110, w: 200, h: 160 },
    story: "包含 — 小さい矩形が完全に内側。両軸で重なるので衝突。",
  },
};

const INITIAL = {
  A: { x: 80, y: 120, w: 110, h: 80 },
  B: { x: 320, y: 160, w: 140, h: 100 },
};

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function bounds(box) {
  return {
    minX: box.x,
    minY: box.y,
    maxX: box.x + box.w,
    maxY: box.y + box.h,
  };
}

function testCollision(a, b) {
  const A = bounds(a);
  const B = bounds(b);
  const overlapX = A.maxX >= B.minX && A.minX <= B.maxX;
  const overlapY = A.maxY >= B.minY && A.minY <= B.maxY;
  return { overlapX, overlapY, colliding: overlapX && overlapY, A, B };
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
      "青 = プレイヤーの当たり判定、橙 = 障害物。ドラッグで動かして交差を観察。";
  }
  setStatus("リセットしました");
  refresh();
}

// ----- 描画: 2D ステージ -----
function drawStage() {
  if (!ctx || !canvas) return;
  const W = canvas.width;
  const H = canvas.height;
  const { overlapX, overlapY, colliding, A, B } = testCollision(boxA, boxB);

  ctx.clearRect(0, 0, W, H);

  // グリッド背景（探索マップではなく方眼紙）
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

  // 軸ヒント
  ctx.fillStyle = "#6a7d94";
  ctx.font = "11px sans-serif";
  ctx.fillText("X →", W - 36, H - 10);
  ctx.fillText("Y ↓", 8, 16);

  // 重なり領域
  if (colliding) {
    const ox = Math.max(A.minX, B.minX);
    const oy = Math.max(A.minY, B.minY);
    const ow = Math.min(A.maxX, B.maxX) - ox;
    const oh = Math.min(A.maxY, B.maxY) - oy;
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

  drawBox(boxA, explainStep === 1 || explainStep === 2 ? 0.95 : 1);
  drawBox(boxB, explainStep === 1 || explainStep === 2 ? 0.95 : 1);

  // 投影ガイド線（ステップ中）
  if (explainStep === 1) {
    drawVGuides(A, B);
  }
  if (explainStep === 2) {
    drawHGuides(A, B);
  }

  // 状態バッジ
  ctx.font = "bold 13px sans-serif";
  ctx.fillStyle = colliding ? "#6bcb8f" : "#9aabbf";
  ctx.fillText(
    colliding ? "● 衝突中 (overlapX ∧ overlapY)" : "○ 非衝突",
    12,
    H - 14
  );

  void overlapX;
  void overlapY;
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

  // ラベル
  ctx.fillStyle = box.color;
  ctx.font = "bold 12px sans-serif";
  ctx.fillText(box.label, box.x + 6, box.y + 16);

  // 角 min / max
  ctx.font = "10px ui-monospace, Menlo, monospace";
  ctx.fillStyle = "#c5d0dc";
  ctx.fillText(
    `(${Math.round(box.x)},${Math.round(box.y)})`,
    box.x + 4,
    box.y + box.h - 6
  );
  ctx.fillText(
    `max(${Math.round(box.x + box.w)},${Math.round(box.y + box.h)})`,
    box.x + box.w - 88,
    box.y + 14
  );

  // リサイズハンドル
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

// ----- 投影レール -----
function drawProjection1D(c, isX) {
  if (!c) return;
  const g = c.getContext("2d");
  if (!g) return;
  const W = c.width;
  const H = c.height;
  const { A, B, overlapX, overlapY } = testCollision(boxA, boxB);
  const overlap = isX ? overlapX : overlapY;

  g.clearRect(0, 0, W, H);
  g.fillStyle = "#0a0e14";
  g.fillRect(0, 0, W, H);

  const margin = 24;
  const trackY = H / 2;
  const worldMin = 0;
  const worldMax = isX ? canvas.width : canvas.height;
  const scale = (W - margin * 2) / (worldMax - worldMin);

  const toPx = (v) => margin + (v - worldMin) * scale;

  // 軸線
  g.strokeStyle = "#3d4f66";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(margin, trackY);
  g.lineTo(W - margin, trackY);
  g.stroke();

  const a0 = isX ? A.minX : A.minY;
  const a1 = isX ? A.maxX : A.maxY;
  const b0 = isX ? B.minX : B.minY;
  const b1 = isX ? B.maxX : B.maxY;

  // 区間 A
  drawInterval(g, toPx(a0), toPx(a1), trackY - 10, boxA.color, "A");
  // 区間 B
  drawInterval(g, toPx(b0), toPx(b1), trackY + 6, boxB.color, "B");

  // 重なり区間
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

// ----- UI パネル -----
function updatePanels() {
  const { overlapX, overlapY, colliding, A, B } = testCollision(boxA, boxB);

  if (verdictEl && verdictText) {
    verdictEl.dataset.state = colliding ? "yes" : "no";
    verdictText.textContent = colliding ? "衝突している" : "非衝突";
  }

  setMark(checkX, overlapX, explainStep === 1);
  setMark(checkY, overlapY, explainStep === 2);
  setMark(checkAnd, colliding, explainStep === 3);

  document.querySelectorAll(".aabb-check-item").forEach((el) => {
    const step = el.getAttribute("data-step");
    el.classList.toggle(
      "is-focus",
      (step === "x" && explainStep === 1) ||
        (step === "y" && explainStep === 2) ||
        (step === "and" && explainStep === 3)
    );
    el.classList.toggle(
      "is-pass",
      (step === "x" && overlapX) ||
        (step === "y" && overlapY) ||
        (step === "and" && colliding)
    );
    el.classList.toggle(
      "is-fail",
      (step === "x" && !overlapX) ||
        (step === "y" && !overlapY) ||
        (step === "and" && !colliding)
    );
  });

  if (badgeX) {
    badgeX.textContent = overlapX ? "重なる" : "重ならない";
    badgeX.dataset.on = overlapX ? "1" : "0";
  }
  if (badgeY) {
    badgeY.textContent = overlapY ? "重なる" : "重ならない";
    badgeY.dataset.on = overlapY ? "1" : "0";
  }

  if (formulaX) {
    formulaX.textContent = `overlapX = (${fmt(A.maxX)} ≥ ${fmt(B.minX)}) ∧ (${fmt(A.minX)} ≤ ${fmt(B.maxX)}) → ${overlapX}`;
  }
  if (formulaY) {
    formulaY.textContent = `overlapY = (${fmt(A.maxY)} ≥ ${fmt(B.minY)}) ∧ (${fmt(A.minY)} ≤ ${fmt(B.maxY)}) → ${overlapY}`;
  }

  if (numbersEl) {
    numbersEl.innerHTML = `
      <table class="aabb-table">
        <thead><tr><th></th><th>minX</th><th>minY</th><th>maxX</th><th>maxY</th></tr></thead>
        <tbody>
          <tr class="row-a"><td>A</td><td>${fmt(A.minX)}</td><td>${fmt(A.minY)}</td><td>${fmt(A.maxX)}</td><td>${fmt(A.maxY)}</td></tr>
          <tr class="row-b"><td>B</td><td>${fmt(B.minX)}</td><td>${fmt(B.minY)}</td><td>${fmt(B.maxX)}</td><td>${fmt(B.maxY)}</td></tr>
        </tbody>
      </table>
    `;
  }
}

function setMark(el, ok, focus) {
  if (!el) return;
  el.textContent = ok ? "✓" : "✗";
  el.classList.toggle("ok", ok);
  el.classList.toggle("ng", !ok);
  el.classList.toggle("focus", focus);
}

function fmt(n) {
  return String(Math.round(n));
}

function refresh() {
  drawStage();
  drawProjection1D(projX, true);
  drawProjection1D(projY, false);
  updatePanels();
}

// ----- ポインタ操作 -----
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
  // B を優先して手前感（後から描画している方）
  const order = [
    { which: "B", box: boxB },
    { which: "A", box: boxA },
  ];
  for (const o of order) {
    if (hitHandle(o.box, x, y)) {
      drag = {
        which: o.which,
        mode: "resize",
        ox: x,
        oy: y,
        start: { ...o.box },
      };
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
        start: { ...o.box },
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
  const { colliding } = testCollision(boxA, boxB);
  setStatus(
    `${drag.which} を${drag.mode === "move" ? "移動" : "リサイズ"}中… ` +
      (colliding ? "→ 衝突" : "→ 非衝突")
  );
  refresh();
}

function onPointerUp(e) {
  if (drag) {
    drag = null;
    try {
      canvas.releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
    setStatus("ドラッグ終了 — 投影とチェックリストを確認");
  }
}

// ----- 判定ステップ / 自動デモ -----
function stepExplain() {
  stopAuto();
  explainStep = (explainStep % 3) + 1;
  const { overlapX, overlapY, colliding } = testCollision(boxA, boxB);
  if (explainStep === 1) {
    setStatus(
      `① X 軸: overlapX = ${overlapX}（投影レールと縦ガイドを見てください）`
    );
  } else if (explainStep === 2) {
    setStatus(
      `② Y 軸: overlapY = ${overlapY}（投影レールと横ガイドを見てください）`
    );
  } else {
    setStatus(
      `③ 結論: colliding = ${overlapX} ∧ ${overlapY} = ${colliding}`
    );
  }
  refresh();
}

function stopAuto() {
  running = false;
  if (btnPlay) btnPlay.textContent = "自動デモ";
  if (timerId !== null) {
    clearTimeout(timerId);
    timerId = null;
  }
}

function demoFrame() {
  // 障害物は固定、プレイヤーが往復して交差
  demoT += 0.035;
  const base = 80 + Math.sin(demoT) * 160 + 80;
  boxA.x = base;
  boxA.y = 120 + Math.cos(demoT * 0.7) * 40;
  clampBox(boxA);
  explainStep = 0;
  const { colliding } = testCollision(boxA, boxB);
  setStatus(
    `自動デモ中… プレイヤーが移動 ${colliding ? "【衝突】" : "【非衝突】"}`
  );
  refresh();
}

function scheduleDemo() {
  if (!running) return;
  const delay = Number(speedEl?.value) || 120;
  timerId = setTimeout(() => {
    if (!running) return;
    demoFrame();
    scheduleDemo();
  }, delay);
}

function togglePlay() {
  if (running) {
    stopAuto();
    setStatus("自動デモを停止");
    return;
  }
  running = true;
  if (btnPlay) btnPlay.textContent = "停止";
  demoT = 0;
  scheduleDemo();
}

async function loadCsharp() {
  if (!csharpSample) return;
  try {
    const res = await fetch("../samples/AabbExample.cs");
    if (!res.ok) throw new Error(String(res.status));
    csharpSample.textContent = await res.text();
  } catch {
    csharpSample.textContent =
      "// samples/AabbExample.cs を読み込めませんでした。";
  }
}

// イベント
canvas?.addEventListener("pointerdown", onPointerDown);
canvas?.addEventListener("pointermove", onPointerMove);
canvas?.addEventListener("pointerup", onPointerUp);
canvas?.addEventListener("pointercancel", onPointerUp);

btnPlay?.addEventListener("click", togglePlay);
btnStep?.addEventListener("click", stepExplain);
btnReset?.addEventListener("click", resetBoxes);

document.querySelectorAll("[data-preset]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const name = btn.getAttribute("data-preset");
    if (name) applyPreset(name);
  });
});

// キャンバスの CSS 幅に合わせた描画解像度（ぼやけ防止は簡易）
function fitCanvas() {
  // 固定論理サイズを維持（ドラッグ座標と一致）
  refresh();
}

window.addEventListener("resize", fitCanvas);

resetBoxes();
loadCsharp();
