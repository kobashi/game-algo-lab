/**
 * アクセシビリティ基礎
 */
import { ACCESSIBILITY_BASICS_CONFIG as C } from "./maps/accessibility-basics-config.js";
import {
  createStatus,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("a11y-canvas")
);
const ctx = canvas.getContext("2d");
const paletteEl = /** @type {HTMLSelectElement} */ (
  document.getElementById("palette")
);
const subEl = /** @type {HTMLInputElement} */ (
  document.getElementById("subtitles")
);
const motionEl = /** @type {HTMLInputElement} */ (
  document.getElementById("reduce-motion")
);
const fontEl = /** @type {HTMLInputElement} */ (
  document.getElementById("large-font")
);
const subBox = document.getElementById("subtitle-box");
const preview = document.getElementById("a11y-preview");
const csharpSample = document.getElementById("csharp-sample");
const setStatus = createStatus(document.getElementById("status"));

let t = 0;
let px = 80;
let ex = 400;
/** @type {number | null} */
let rafId = null;

function palette() {
  return C.palettes[paletteEl?.value || "default"] || C.palettes.default;
}

function applyDom() {
  if (preview) {
    preview.classList.toggle("a11y-large", !!fontEl?.checked);
    preview.dataset.palette = paletteEl?.value || "default";
  }
  if (subBox) {
    subBox.hidden = !subEl?.checked;
    subBox.textContent = subEl?.checked
      ? "［字幕］敵が接近しています！ スペースでジャンプ"
      : "";
  }
  document.body.classList.toggle("a11y-reduce-motion", !!motionEl?.checked);
}

function draw(dt) {
  if (!ctx) return;
  const pal = palette();
  const reduce = !!motionEl?.checked;
  if (!reduce) t += dt;
  else t += dt * 0.05;

  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = pal.ground;
  ctx.fillRect(0, 200, canvas.width, 40);

  // bobbing
  const bob = reduce ? 0 : Math.sin(t * 4) * 8;
  px = 80 + (reduce ? 0 : Math.sin(t * 1.2) * 30);
  ex = 400 + (reduce ? 0 : Math.cos(t * 1.5) * 40);

  ctx.fillStyle = pal.player;
  ctx.fillRect(px, 160 + bob, 28, 36);
  ctx.fillStyle = pal.enemy;
  ctx.fillRect(ex, 164, 32, 32);

  ctx.fillStyle = pal.ground === "#ffffff" ? "#000" : "#9aabbf";
  ctx.font = fontEl?.checked ? "16px sans-serif" : "12px sans-serif";
  ctx.fillText(
    `palette=${paletteEl?.value} reduceMotion=${reduce} subtitles=${!!subEl?.checked}`,
    12,
    20
  );
}

function loop(ts) {
  if (!loop.last) loop.last = ts;
  let dt = (ts - loop.last) / 1000;
  loop.last = ts;
  if (dt > 0.05) dt = 0.05;
  applyDom();
  draw(dt);
  rafId = requestAnimationFrame(loop);
}
/** @type {number} */
loop.last = 0;

for (const el of [paletteEl, subEl, motionEl, fontEl]) {
  el?.addEventListener("change", () => {
    applyDom();
    setStatus("設定を反映");
  });
}

loadTextSample(
  "../samples/AccessibilityBasicsExample.cs",
  csharpSample,
  "// AccessibilityBasicsExample.cs"
);
applyDom();
rafId = requestAnimationFrame(loop);
setStatus("設定パネルを切り替えて表示の変化を観察");
