/**
 * AnalyserNode からレベルと実測波形を描く。全サンプルは取り出さない。
 * @see docs/topics/sfx-events/SPEC.md
 */

import { levelFromTimeDomain, meterPercent } from "./audio-math.js";

/**
 * @param {AnalyserNode} analyser
 * @param {Uint8Array} scratch
 */
export function readLevel(analyser, scratch) {
  const buf =
    scratch.length === analyser.fftSize
      ? scratch
      : new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(buf);
  return levelFromTimeDomain(buf);
}

/**
 * @param {HTMLElement | null} bar
 * @param {HTMLElement | null} label
 * @param {{ rmsDb: number }} level
 */
export function paintMeter(bar, label, level) {
  const pct = meterPercent(level.rmsDb);
  if (bar) {
    const fill = bar.querySelector("span");
    if (fill instanceof HTMLElement) fill.style.width = `${pct}%`;
  }
  if (label) {
    const db = Number.isFinite(level.rmsDb) ? level.rmsDb.toFixed(1) : "—";
    label.textContent = `${db} dBFS`;
  }
}

/**
 * @param {CanvasRenderingContext2D} g
 * @param {HTMLCanvasElement} canvas
 * @param {Uint8Array} bytes
 */
export function drawScope(g, canvas, bytes) {
  const w = canvas.width;
  const h = canvas.height;
  g.fillStyle = "#0a0e14";
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(90,106,128,0.45)";
  g.beginPath();
  g.moveTo(0, h / 2);
  g.lineTo(w, h / 2);
  g.stroke();
  g.beginPath();
  g.strokeStyle = "#8fd18f";
  const n = bytes.length;
  for (let i = 0; i < w; i++) {
    const idx = Math.min(n - 1, Math.floor((i / w) * n));
    const x = (bytes[idx] - 128) / 128;
    const y = h / 2 - x * (h * 0.42);
    if (i === 0) g.moveTo(i, y);
    else g.lineTo(i, y);
  }
  g.stroke();
  g.fillStyle = "#9aabbf";
  g.font = "11px sans-serif";
  g.fillText("実測（Master・Analyser）", 8, 14);
}

/**
 * 模式図。パラメータから計算し、実測とは別だとラベルに書く。
 * @param {CanvasRenderingContext2D} g
 * @param {HTMLCanvasElement} canvas
 * @param {{ freq: number, dur: number, gain: number, wave: string, attack: number, release: number }} tone
 */
export function drawSchematic(g, canvas, tone) {
  const w = canvas.width;
  const h = canvas.height;
  g.fillStyle = "#0a0e14";
  g.fillRect(0, 0, w, h);
  const mid = h / 2;
  g.strokeStyle = "rgba(90,106,128,0.5)";
  g.beginPath();
  g.moveTo(0, mid);
  g.lineTo(w, mid);
  g.stroke();

  const freq = Math.max(1, tone.freq);
  const dur = Math.max(0.02, tone.dur);
  const gain = Math.max(0, tone.gain);
  const attack = Math.max(0, tone.attack);
  const release = Math.max(0.005, tone.release);

  /**
   * @param {number} t
   */
  function envAt(t) {
    const a = Math.min(attack, dur * 0.45);
    const rel = Math.min(release, Math.max(0.008, dur - a));
    if (t < a) return gain * (t / Math.max(0.004, a));
    if (t > dur) return 0;
    const relStart = Math.max(a, dur - rel);
    if (t < relStart) return gain;
    return gain * Math.max(0, 1 - (t - relStart) / Math.max(0.001, dur - relStart));
  }

  /**
   * @param {number} t
   */
  function oscAt(t) {
    const p = (freq * t) % 1;
    if (tone.wave === "sine") return Math.sin(2 * Math.PI * p);
    if (tone.wave === "sawtooth") return 2 * p - 1;
    if (tone.wave === "triangle") return p < 0.5 ? 4 * p - 1 : 3 - 4 * p;
    if (tone.wave === "noise") {
      const n = Math.sin(t * 1700 + freq) * Math.sin(t * 430 + freq * 0.17);
      return Math.max(-1, Math.min(1, n));
    }
    return Math.sign(Math.sin(2 * Math.PI * p)) || 0;
  }

  g.beginPath();
  g.strokeStyle = "#5b9fd4";
  for (let i = 0; i < w; i++) {
    const t = (i / (w - 1)) * dur;
    const y = mid - oscAt(t) * envAt(t) * (h * 0.42) / 0.3;
    if (i === 0) g.moveTo(i, y);
    else g.lineTo(i, y);
  }
  g.stroke();
  g.beginPath();
  g.strokeStyle = "#f2cc8f";
  for (let i = 0; i < w; i++) {
    const t = (i / (w - 1)) * dur;
    const y = mid - envAt(t) * (h * 0.42) / 0.3;
    if (i === 0) g.moveTo(i, y);
    else g.lineTo(i, y);
  }
  g.stroke();
  g.fillStyle = "#9aabbf";
  g.font = "11px sans-serif";
  g.fillText(`模式図  青=波形  黄=包絡  ${freq}Hz ${dur.toFixed(2)}s`, 8, 14);
}
