/**
 * 場面、体力、緊張、ダッキング。音のノードはマネージャへ頼む。
 * @see docs/topics/sfx-events/SPEC.md
 */

import {
  activeDucks,
  duckGainAt,
  gainToDb,
  healthLowpassHz,
  heartbeatInterval,
  tensionLayerGain,
  warningLevel,
} from "./audio-math.js";
import { rampLinear, rampParam } from "./audio-engine.js";

/**
 * @param {{
 *   engine: {
 *     ctx: AudioContext,
 *     bgmFilter: BiquadFilterNode,
 *     bgmHealth: GainNode,
 *     bgmDuck: GainNode,
 *   },
 *   bgm: {
 *     crossfadeTo: (id: string, seconds: number) => void,
 *     fadeOut: (seconds: number) => void,
 *     setLayerGain: (song: string, layer: string, value: number) => void,
 *     setRate: (rate: number) => void,
 *     currentId: () => string,
 *     isRunning: () => boolean,
 *   },
 *   sfx: {
 *     heartbeat: (amount: number) => void,
 *     jingle: (kind: "success"|"fail") => void,
 *   },
 *   get: () => {
 *     health: number,
 *     tension: number,
 *     gameState: string,
 *     timeScale: number,
 *     bgmFollow: boolean,
 *     crossfade: number,
 *     duckAmount: number,
 *     duckAttack: number,
 *     duckHold: number,
 *     duckRelease: number,
 *     layerManual: boolean,
 *     battleLayer: number,
 *   },
 * }} deps
 */
export function createDirector(deps) {
  const { engine, bgm, sfx, get } = deps;
  /** @type {{ start: number, attack: number, hold: number, release: number, amountDb: number }[]} */
  let ducks = [];
  let smoothTension = 0;
  let nextHeart = 0;
  let heartArmed = false;
  let lastState = "title";
  let manualHold = false;
  let haveApplied = false;
  let lastClock = engine.ctx.currentTime;

  function songFor(state) {
    if (state === "title") return "title";
    if (state === "battle") return "b";
    if (state === "normal") return "a";
    return "";
  }

  /**
   * @param {string} state
   * @param {{ force?: boolean, fromUser?: boolean }} [opt]
   */
  function applyState(state, opt = {}) {
    if (manualHold && !opt.force && !opt.fromUser) return;
    if (opt.fromUser) manualHold = false;
    if (!opt.force && state === lastState && haveApplied) return;
    const prev = lastState;
    lastState = state;
    haveApplied = true;
    const s = get();
    const xf = Math.max(0.02, Number(s.crossfade) || 0.02);
    if (state === "success" || state === "fail") {
      if (prev === state && !opt.force) return;
      bgm.fadeOut(Math.max(0.35, Math.min(xf, 1.2)));
      sfx.jingle(state === "fail" ? "fail" : "success");
      return;
    }
    const song = songFor(state);
    if (!song) return;
    if (!opt.force && bgm.currentId() === song && bgm.isRunning()) return;
    bgm.crossfadeTo(song, xf);
  }

  function update() {
    const now = engine.ctx.currentTime;
    const dt = Math.min(0.1, Math.max(0, now - lastClock));
    lastClock = now;
    const s = get();

    ducks = activeDucks(ducks, now);
    const duck = duckGainAt(ducks, now);
    rampLinear(engine.ctx, engine.bgmDuck.gain, duck, 0.016);

    const target = s.layerManual ? smoothTension : s.tension;
    const k = 1 - Math.exp(-dt / 0.16);
    smoothTension += (target - smoothTension) * (Number.isFinite(k) ? k : 1);
    if (!s.layerManual) {
      const layer = tensionLayerGain(smoothTension);
      bgm.setLayerGain("a", "base", 1);
      bgm.setLayerGain("b", "base", 1);
      bgm.setLayerGain("a", "tension", layer);
      bgm.setLayerGain("b", "tension", layer);
      bgm.setLayerGain("a", "battle", 0);
      bgm.setLayerGain("b", "battle", 0);
      bgm.setLayerGain("title", "bed", 1);
    }

    rampParam(engine.ctx, engine.bgmFilter.frequency, healthLowpassHz(s.health), 0.08);
    const atten = 1 - warningLevel(s.health) * 0.4;
    rampParam(engine.ctx, engine.bgmHealth.gain, atten, 0.08);

    const interval = heartbeatInterval(s.health);
    if (interval <= 0) {
      heartArmed = false;
      nextHeart = now;
    } else if (!heartArmed) {
      heartArmed = true;
      nextHeart = now + 0.05;
    }
    if (interval > 0 && now >= nextHeart) {
      sfx.heartbeat(warningLevel(s.health));
      nextHeart = now + interval;
    }

    bgm.setRate(s.bgmFollow ? s.timeScale : 1);

    return {
      duck,
      duckDb: gainToDb(duck),
      smoothTension,
      lowpass: healthLowpassHz(s.health),
      warning: warningLevel(s.health),
      heartbeat: interval,
      manualHold,
      lastState,
    };
  }

  return {
    update,
    applyState,
    holdManual() {
      manualHold = true;
    },
    clearHold() {
      manualHold = false;
      haveApplied = false;
      lastState = get().gameState;
    },
    releaseManual() {
      manualHold = false;
      haveApplied = false;
      applyState(get().gameState, { force: true });
    },
    isManual() {
      return manualHold;
    },
    duck() {
      const s = get();
      ducks.push({
        start: engine.ctx.currentTime,
        attack: Math.max(0, s.duckAttack),
        hold: Math.max(0, s.duckHold),
        release: Math.max(0.05, s.duckRelease),
        amountDb: Math.max(0, s.duckAmount),
      });
    },
    smoothedTension() {
      return smoothTension;
    },
  };
}
