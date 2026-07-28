/**
 * GPU パイプライン概説
 */
import { GFX_GPU_CONCEPTS_CONFIG as C } from "./maps/gfx-gpu-concepts-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("gpu-canvas")
);
const ctx = canvas.getContext("2d");
const stageList = document.getElementById("gpu-stages");
const detailEl = document.getElementById("gpu-detail");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const btnPlay = document.getElementById("btn-play");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

let stage = 0;
let auto = false;
/** @type {number | null} */
let timer = null;

function select(i) {
  stage = Math.max(0, Math.min(C.stages.length - 1, i));
  renderList();
  draw();
  const s = C.stages[stage];
  if (detailEl) {
    detailEl.innerHTML = `<h3>${s.label}</h3><p>${s.blurb}</p>
      <p class="footer-muted">段階 ${stage + 1} / ${C.stages.length}</p>`;
  }
  setStatus(s.label);
}

function renderList() {
  if (!stageList) return;
  stageList.innerHTML = C.stages
    .map(
      (s, i) =>
        `<button type="button" class="gpu-stage-btn${i === stage ? " is-active" : ""}" data-i="${i}">${i + 1}. ${s.label}</button>`
    )
    .join("");
  stageList.querySelectorAll(".gpu-stage-btn").forEach((b) => {
    b.addEventListener("click", () => {
      stopAuto();
      select(Number(/** @type {HTMLElement} */ (b).dataset.i));
    });
  });
}

function draw() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  // pipeline boxes
  const n = C.stages.length;
  const bw = 90;
  const gap = 18;
  const total = n * bw + (n - 1) * gap;
  let x0 = (W - total) / 2;
  const y = 80;
  for (let i = 0; i < n; i++) {
    const x = x0 + i * (bw + gap);
    const active = i === stage;
    const done = i < stage;
    ctx.fillStyle = active
      ? "rgba(107, 203, 143, 0.35)"
      : done
        ? "rgba(91, 159, 212, 0.2)"
        : "rgba(61, 79, 102, 0.5)";
    ctx.strokeStyle = active ? "#6bcb8f" : "#5a6a80";
    ctx.lineWidth = active ? 2.5 : 1;
    ctx.fillRect(x, y, bw, 50);
    ctx.strokeRect(x, y, bw, 50);
    ctx.fillStyle = "#e8eef7";
    ctx.font = "11px sans-serif";
    ctx.fillText(C.stages[i].label.split(" ")[0], x + 8, y + 30);
    if (i < n - 1) {
      ctx.strokeStyle = "#f2cc8f";
      ctx.beginPath();
      ctx.moveTo(x + bw, y + 25);
      ctx.lineTo(x + bw + gap, y + 25);
      ctx.stroke();
    }
  }

  // mini visualization by stage
  ctx.save();
  ctx.translate(W / 2, 220);
  if (stage === 0) {
    ctx.fillStyle = "#5b9fd4";
    ctx.fillRect(-40, -30, 80, 60);
    ctx.fillStyle = "#9aabbf";
    ctx.font = "12px sans-serif";
    ctx.fillText("Mesh + matrices", -40, 50);
  } else if (stage === 1) {
    ctx.strokeStyle = "#6bcb8f";
    ctx.beginPath();
    ctx.moveTo(-50, 20);
    ctx.lineTo(0, -40);
    ctx.lineTo(50, 20);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = "#9aabbf";
    ctx.fillText("clip space verts", -40, 50);
  } else if (stage === 2) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 12; col++) {
        const inside = row + col > 4 && row < 7;
        ctx.fillStyle = inside ? "rgba(242,204,143,0.5)" : "rgba(90,106,128,0.2)";
        ctx.fillRect(-60 + col * 10, -40 + row * 10, 9, 9);
      }
    }
    ctx.fillStyle = "#9aabbf";
    ctx.fillText("fragments", -30, 55);
  } else if (stage === 3) {
    const g = ctx.createLinearGradient(-50, 0, 50, 0);
    g.addColorStop(0, "#5b9fd4");
    g.addColorStop(1, "#e07a5f");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-50, 20);
    ctx.lineTo(0, -40);
    ctx.lineTo(50, 20);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#9aabbf";
    ctx.fillText("shaded pixels", -35, 50);
  } else if (stage === 4) {
    ctx.fillStyle = "#1a2332";
    ctx.fillRect(-70, -40, 140, 80);
    ctx.fillStyle = "#6bcb8f";
    ctx.fillRect(-50, -20, 100, 50);
    ctx.fillStyle = "#9aabbf";
    ctx.fillText("depth + blend", -35, 55);
  } else {
    ctx.fillStyle = "#222";
    ctx.fillRect(-80, -45, 160, 90);
    ctx.fillStyle = "#5b9fd4";
    ctx.fillRect(-60, -25, 120, 55);
    ctx.fillStyle = "#f2cc8f";
    ctx.font = "12px sans-serif";
    ctx.fillText("frame presented", -45, 50);
  }
  ctx.restore();

  ctx.fillStyle = "#9aabbf";
  ctx.font = "12px sans-serif";
  ctx.fillText("クリックまたは ← → で段階を進める（概念デモ）", 12, 18);
}

function stopAuto() {
  auto = false;
  if (timer != null) clearInterval(timer);
  timer = null;
  if (btnPlay) btnPlay.textContent = "自動再生";
}

btnPrev?.addEventListener("click", () => {
  stopAuto();
  select(stage - 1);
});
btnNext?.addEventListener("click", () => {
  stopAuto();
  select(stage + 1);
});
btnPlay?.addEventListener("click", () => {
  if (auto) {
    stopAuto();
    return;
  }
  auto = true;
  if (btnPlay) btnPlay.textContent = "停止";
  timer = setInterval(() => {
    if (stage >= C.stages.length - 1) {
      stopAuto();
      return;
    }
    select(stage + 1);
  }, 1200);
});

loadTextSample(
  "../samples/GfxGpuConceptsExample.cs",
  csharpSample,
  "// GfxGpuConceptsExample.cs"
);
select(0);
