/**
 * 効果音ページの純関数。AudioContext には触らない。
 * @see docs/topics/sfx-events/SPEC.md
 */

export const SAFETY_VOICE_CAP = 32;

/**
 * @param {number} n
 * @param {number} lo
 * @param {number} hi
 */
export function clamp(n, lo, hi) {
  const x = Number(n);
  if (!Number.isFinite(x)) return lo;
  return Math.min(hi, Math.max(lo, x));
}

/**
 * @param {number} db
 */
export function dbToGain(db) {
  return Math.pow(10, Number(db) / 20);
}

/**
 * @param {number} gain
 */
export function gainToDb(gain) {
  return 20 * Math.log10(Math.max(Number(gain) || 0, 1e-8));
}

/**
 * 同時にあるダック要求のうち、いちばん小さい線形ゲインを返す。
 * 期間を過ぎた要求は 1 として無視する。
 *
 * @param {{ start: number, attack: number, hold: number, release: number, amountDb: number }[]} ducks
 * @param {number} now
 */
export function duckGainAt(ducks, now) {
  let g = 1;
  for (const d of ducks) {
    const a = Math.max(0, Number(d.attack) || 0);
    const h = Math.max(0, Number(d.hold) || 0);
    const r = Math.max(0.001, Number(d.release) || 0.001);
    const floor = dbToGain(-Math.abs(Number(d.amountDb) || 0));
    const t = now - d.start;
    if (!Number.isFinite(t) || t < 0) continue;
    let env = 1;
    if (t < a) env = a === 0 ? floor : 1 + (floor - 1) * (t / a);
    else if (t < a + h) env = floor;
    else if (t < a + h + r) env = floor + (1 - floor) * ((t - a - h) / r);
    else continue;
    if (env < g) g = env;
  }
  return g;
}

/**
 * 終わったダックを除いた配列を返す。
 * @param {{ start: number, attack: number, hold: number, release: number }[]} ducks
 * @param {number} now
 */
export function activeDucks(ducks, now) {
  return ducks.filter((d) => {
    const end =
      d.start +
      Math.max(0, d.attack) +
      Math.max(0, d.hold) +
      Math.max(0.001, d.release);
    return now < end;
  });
}

/**
 * @param {{ id: number, started: number, level: number }[]} voices
 * @param {"unlimited"|"reject"|"oldest"|"quietest"} policy
 * @param {number} cap
 * @param {number} [safetyCap]
 * @returns {{ action: "play"|"reject"|"steal", victim: { id: number, started: number, level: number } | null, safety: boolean }}
 */
export function decideVoice(voices, policy, cap, safetyCap = SAFETY_VOICE_CAP) {
  const limit = policy === "unlimited" ? safetyCap : Math.max(1, cap);
  if (voices.length < limit) return { action: "play", victim: null, safety: false };
  if (policy === "reject") return { action: "reject", victim: null, safety: false };
  const safety = policy === "unlimited";
  if (policy === "quietest") {
    let victim = voices[0];
    for (const u of voices) {
      const quieter = u.level < victim.level - 1e-6;
      const tie = Math.abs(u.level - victim.level) <= 1e-6 && u.started < victim.started;
      if (quieter || tie) victim = u;
    }
    return { action: "steal", victim, safety };
  }
  let victim = voices[0];
  for (const u of voices) if (u.started < victim.started) victim = u;
  return { action: "steal", victim, safety };
}

/**
 * アタックとリリースから、今の音量を推定する。Analyser は使わない。
 * @param {{ started: number, dur: number, gain: number, attack: number, release: number }} voice
 * @param {number} now
 */
export function voiceLevelAt(voice, now) {
  const t = now - voice.started;
  if (!(t >= 0) || t > voice.dur) return 0;
  const a = Math.max(0.001, voice.attack || 0.001);
  const rel = Math.max(0.001, voice.release || 0.001);
  if (t < a) return voice.gain * (t / a);
  const relStart = Math.max(a, voice.dur - rel);
  if (t < relStart) return voice.gain;
  const span = Math.max(0.001, voice.dur - relStart);
  return voice.gain * Math.max(0, 1 - (t - relStart) / span);
}

/** Tension 0〜100 をレイヤー音量 0〜1 にする。 */
export function tensionLayerGain(tension) {
  return clamp(tension, 0, 100) / 100;
}

/**
 * 体力が下がるほど閉じるローパス。50 以上は明るく、0 で約 400 Hz。
 * @param {number} health
 */
export function healthLowpassHz(health) {
  const h = clamp(health, 0, 100);
  if (h >= 50) {
    const t = (h - 50) / 50;
    return 6000 * Math.pow(18000 / 6000, t);
  }
  const t = h / 50;
  return 400 * Math.pow(6000 / 400, t);
}

/**
 * 50 以上は 0（鳴らない）。20〜50 は約 1.15〜0.60 秒、<20 はさらに短い。
 * @param {number} health
 */
export function heartbeatInterval(health) {
  const h = clamp(health, 0, 100);
  if (h >= 50) return 0;
  if (h >= 20) {
    const t = (50 - h) / 30;
    return 1.15 - t * 0.55;
  }
  const t = (20 - h) / 20;
  return 0.6 - t * 0.22;
}

/** 50 以上は 0、0 で 1。警告の強さ。 */
export function warningLevel(health) {
  const h = clamp(health, 0, 100);
  if (h >= 50) return 0;
  return (50 - h) / 50;
}

/**
 * AnalyserNode.getByteTimeDomainData の結果からピークと RMS を出す。
 * @param {Uint8Array} bytes
 */
export function levelFromTimeDomain(bytes) {
  let peak = 0;
  let sum = 0;
  const n = bytes.length || 1;
  for (let i = 0; i < bytes.length; i++) {
    const x = (bytes[i] - 128) / 128;
    const a = Math.abs(x);
    if (a > peak) peak = a;
    sum += x * x;
  }
  const rms = Math.sqrt(sum / n);
  return {
    peak,
    rms,
    peakDb: gainToDb(peak),
    rmsDb: gainToDb(rms),
  };
}

/**
 * AnalyserNode.getFloatTimeDomainData の結果。Peak と RMS は別々に返す。
 * @param {ArrayLike<number>} samples
 */
export function levelsFromFloat(samples) {
  let peak = 0;
  let sum = 0;
  const n = samples.length || 1;
  for (let i = 0; i < samples.length; i++) {
    const x = Number(samples[i]) || 0;
    const a = Math.abs(x);
    if (a > peak) peak = a;
    sum += x * x;
  }
  const rms = Math.sqrt(sum / n);
  return {
    peak,
    rms,
    peakDb: gainToDb(peak),
    rmsDb: gainToDb(rms),
  };
}

/** dB を -60〜0 のパーセントにする。 */
export function meterPercent(db) {
  const t = (clamp(db, -60, 0) + 60) / 60;
  return Math.round(t * 1000) / 10;
}
