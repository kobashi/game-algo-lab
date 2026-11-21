/**
 * 連続量を音のパラメータへ写す。AudioContext には触らない。
 * @see docs/topics/audio-motion/SPEC.md
 */

/**
 * @param {number} t
 */
function clamp01(t) {
  const x = Number(t);
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

/**
 * 0〜1 を outMin〜outMax へ直線で写す。
 * @param {number} t
 * @param {number} outMin
 * @param {number} outMax
 */
export function mapLinear(t, outMin, outMax) {
  const u = clamp01(t);
  return outMin + (outMax - outMin) * u;
}

/**
 * 0〜1 を正の範囲へ指数で写す。
 * @param {number} t
 * @param {number} outMin
 * @param {number} outMax
 */
export function mapExponential(t, outMin, outMax) {
  const u = clamp01(t);
  const a = Math.max(1e-4, Math.abs(outMin));
  const b = Math.max(a * 1.0001, Math.abs(outMax));
  const sign = outMax < 0 ? -1 : 1;
  return sign * a * Math.pow(b / a, u);
}

/**
 * 端で傾きが 0 になるスムーズステップ。
 * @param {number} t
 * @param {number} outMin
 * @param {number} outMax
 */
export function mapSmoothstep(t, outMin, outMax) {
  const u = clamp01(t);
  const s = u * u * (3 - 2 * u);
  return outMin + (outMax - outMin) * s;
}

/**
 * しきい値の手前と先で値を切り替える。
 * @param {number} t
 * @param {number} threshold
 * @param {number} below
 * @param {number} above
 */
export function mapThreshold(t, threshold, below, above) {
  return Number(t) >= Number(threshold) ? above : below;
}

/**
 * 目標へ時定数で近づける。dt と timeConstant は秒。
 * @param {number} current
 * @param {number} target
 * @param {number} dt
 * @param {number} timeConstant
 */
export function smoothToward(current, target, dt, timeConstant) {
  const tc = Math.max(0.001, Number(timeConstant) || 0.001);
  const step = Math.max(0, Number(dt) || 0);
  const k = 1 - Math.exp(-step / tc);
  const c = Number(current);
  const g = Number(target);
  if (!Number.isFinite(c)) return g;
  if (!Number.isFinite(g)) return c;
  return c + (g - c) * k;
}
