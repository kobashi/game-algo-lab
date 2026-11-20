/**
 * 1つの AudioContext と、BGM / SFX / Master の経路。
 * @see docs/topics/sfx-events/SPEC.md
 */

/**
 * 既存の自動化を打ち切ってから、短い追従で目標へ近づける。
 * @param {AudioParam} param
 * @param {number} value
 * @param {number} [timeConstant]
 */
/**
 * @param {BaseAudioContext} ctx
 * @param {AudioParam} param
 * @param {number} value
 * @param {number} [timeConstant]
 */
export function rampParam(ctx, param, value, timeConstant = 0.03) {
  const now = ctx.currentTime;
  const current = Number.isFinite(param.value) ? param.value : value;
  param.cancelScheduledValues(now);
  param.setValueAtTime(current, now);
  param.setTargetAtTime(value, now, Math.max(0.005, timeConstant));
}

/**
 * 直線で近づける。ダックの包絡など、時定数だと遅れる量に使う。
 * @param {BaseAudioContext} ctx
 * @param {AudioParam} param
 * @param {number} value
 * @param {number} seconds
 */
export function rampLinear(ctx, param, value, seconds) {
  const now = ctx.currentTime;
  const current = Number.isFinite(param.value) ? param.value : value;
  const dur = Math.max(0.005, seconds);
  param.cancelScheduledValues(now);
  param.setValueAtTime(current, now);
  param.linearRampToValueAtTime(value, now + dur);
}

/**
 * @returns {ReturnType<typeof build> | null}
 */
export function createAudioEngine() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  return build(new AC());
}

/**
 * @param {AudioContext} ctx
 */
function build(ctx) {
  const bgmIn = ctx.createGain();
  const bgmFilter = ctx.createBiquadFilter();
  bgmFilter.type = "lowpass";
  bgmFilter.frequency.value = 18000;
  bgmFilter.Q.value = 0.7;
  const bgmHealth = ctx.createGain();
  const bgmDuck = ctx.createGain();
  const bgmUser = ctx.createGain();
  const bgmSolo = ctx.createGain();
  const bgmAnalyser = ctx.createAnalyser();
  bgmAnalyser.fftSize = 1024;
  bgmAnalyser.smoothingTimeConstant = 0.65;

  const sfxIn = ctx.createGain();
  const sfxUser = ctx.createGain();
  const sfxSolo = ctx.createGain();
  const sfxPre = ctx.createAnalyser();
  sfxPre.fftSize = 1024;
  sfxPre.smoothingTimeConstant = 0.55;
  const sfxDry = ctx.createGain();
  const sfxComp = ctx.createDynamicsCompressor();
  const sfxWet = ctx.createGain();
  const sfxSum = ctx.createGain();
  const sfxPost = ctx.createAnalyser();
  sfxPost.fftSize = 1024;
  sfxPost.smoothingTimeConstant = 0.55;

  const masterIn = ctx.createGain();
  const masterPre = ctx.createAnalyser();
  masterPre.fftSize = 1024;
  masterPre.smoothingTimeConstant = 0.6;
  const masterDry = ctx.createGain();
  const masterComp = ctx.createDynamicsCompressor();
  const masterWet = ctx.createGain();
  const masterSum = ctx.createGain();
  const safety = ctx.createDynamicsCompressor();
  const masterUser = ctx.createGain();
  const masterGate = ctx.createGain();
  const masterAnalyser = ctx.createAnalyser();
  masterAnalyser.fftSize = 2048;
  masterAnalyser.smoothingTimeConstant = 0.15;

  bgmIn.connect(bgmFilter);
  bgmFilter.connect(bgmHealth);
  bgmHealth.connect(bgmDuck);
  bgmDuck.connect(bgmUser);
  bgmUser.connect(bgmSolo);
  bgmSolo.connect(bgmAnalyser);
  bgmAnalyser.connect(masterIn);

  sfxIn.connect(sfxUser);
  sfxUser.connect(sfxSolo);
  sfxSolo.connect(sfxPre);
  sfxPre.connect(sfxDry);
  sfxPre.connect(sfxComp);
  sfxComp.connect(sfxWet);
  sfxDry.connect(sfxSum);
  sfxWet.connect(sfxSum);
  sfxSum.connect(sfxPost);
  sfxPost.connect(masterIn);

  masterIn.connect(masterPre);
  masterPre.connect(masterDry);
  masterPre.connect(masterComp);
  masterComp.connect(masterWet);
  masterDry.connect(masterSum);
  masterWet.connect(masterSum);
  masterSum.connect(safety);
  safety.connect(masterUser);
  masterUser.connect(masterGate);
  masterGate.connect(masterAnalyser);
  masterAnalyser.connect(ctx.destination);

  // 教材のコンプレッサーは既定でバイパス。保護リミッタだけ常に通す。
  sfxDry.gain.value = 1;
  sfxWet.gain.value = 0;
  masterDry.gain.value = 1;
  masterWet.gain.value = 0;
  bgmHealth.gain.value = 1;
  bgmDuck.gain.value = 1;
  bgmUser.gain.value = 0.4;
  sfxUser.gain.value = 0.55;
  masterUser.gain.value = 0.45;
  bgmSolo.gain.value = 1;
  sfxSolo.gain.value = 1;
  masterGate.gain.value = 1;

  applyCompressor(sfxComp, {
    threshold: -24,
    knee: 12,
    ratio: 4,
    attack: 0.005,
    release: 0.15,
  });
  applyCompressor(masterComp, {
    threshold: -14,
    knee: 8,
    ratio: 3,
    attack: 0.008,
    release: 0.2,
  });
  applyCompressor(safety, {
    threshold: -2.5,
    knee: 0,
    ratio: 20,
    attack: 0.003,
    release: 0.12,
  });

  /**
   * @param {"sfx"|"master"} which
   * @param {boolean} on
   */
  function setBypass(which, on) {
    const dry = which === "sfx" ? sfxDry.gain : masterDry.gain;
    const wet = which === "sfx" ? sfxWet.gain : masterWet.gain;
    rampLinear(ctx, dry, on ? 0 : 1, 0.02);
    rampLinear(ctx, wet, on ? 1 : 0, 0.02);
  }

  return {
    ctx,
    bgmIn,
    bgmFilter,
    bgmHealth,
    bgmDuck,
    bgmUser,
    bgmSolo,
    bgmAnalyser,
    sfxIn,
    sfxUser,
    sfxSolo,
    sfxPre,
    sfxPost,
    sfxComp,
    masterPre,
    masterComp,
    masterUser,
    masterGate,
    masterAnalyser,
    safety,
    setBypass,
    setSfxCompressor(p) {
      applyCompressor(sfxComp, p);
    },
    setMasterCompressor(p) {
      applyCompressor(masterComp, p);
    },
    resume() {
      if (ctx.state === "suspended") return ctx.resume();
      return Promise.resolve();
    },
    close() {
      return ctx.close();
    },
  };
}

/**
 * @param {DynamicsCompressorNode} node
 * @param {{ threshold: number, knee: number, ratio: number, attack: number, release: number }} p
 */
function applyCompressor(node, p) {
  const now = node.context.currentTime;
  setParam(node.threshold, p.threshold, now);
  setParam(node.knee, p.knee, now);
  setParam(node.ratio, p.ratio, now);
  setParam(node.attack, p.attack, now);
  setParam(node.release, p.release, now);
}

/**
 * @param {AudioParam} param
 * @param {number} value
 * @param {number} now
 */
function setParam(param, value, now) {
  param.cancelScheduledValues(now);
  param.setValueAtTime(value, now);
}
