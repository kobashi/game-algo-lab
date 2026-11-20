/**
 * OneShot の生成と発音数。終了したノードは参照を残さない。
 * @see docs/topics/sfx-events/SPEC.md
 */

import {
  SAFETY_VOICE_CAP,
  decideVoice,
  voiceLevelAt,
} from "./audio-math.js";
import { renderJingle } from "./bgm-manager.js";

/**
 * @param {{ ctx: AudioContext, sfxIn: GainNode }} engine
 * @param {{ log: (msg: string) => void, now: () => number }} hooks
 */
export function createSfxManager(engine, hooks) {
  const ctx = engine.ctx;
  /** @type {Set<Voice>} */
  const voices = new Set();
  /** @type {Map<string, number>} */
  const lastAt = new Map();
  let seq = 0;
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const noiseData = noise.getChannelData(0);
  let seed = 0x12345678;
  for (let i = 0; i < noiseData.length; i++) {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    noiseData[i] = seed / 4294967296 * 2 - 1;
  }
  const jingles = {
    success: bufferFrom(renderJingle("success", ctx.sampleRate)),
    fail: bufferFrom(renderJingle("fail", ctx.sampleRate)),
  };

  /**
   * @param {Float32Array} data
   */
  function bufferFrom(data) {
    const buffer = ctx.createBuffer(1, data.length, ctx.sampleRate);
    buffer.getChannelData(0).set(data);
    return buffer;
  }

  /**
   * @typedef {{
   *   id: number,
   *   eventId: string,
   *   freq: number,
   *   dur: number,
   *   gain: number,
   *   attack: number,
   *   release: number,
   *   wave: string,
   *   system: boolean,
   *   started: number,
   *   done: boolean,
   *   env: GainNode,
   *   source: AudioBufferSourceNode | OscillatorNode,
   * }} Voice
   */

  /**
   * @param {Voice} voice
   * @param {string} [reason]
   */
  function release(voice, reason) {
    if (voice.done) return;
    voice.done = true;
    voices.delete(voice);
    try {
      voice.source.stop();
    } catch {
      /* already stopped */
    }
    try {
      voice.source.disconnect();
    } catch {
      /* already disconnected */
    }
    try {
      voice.env.disconnect();
    } catch {
      /* already disconnected */
    }
    if (reason) hooks.log(reason);
  }

  function studentVoices() {
    return [...voices].filter((v) => !v.system);
  }

  /**
   * @param {{
   *   freq: number,
   *   dur: number,
   *   gain: number,
   *   wave?: string,
   *   attack?: number,
   *   release?: number,
   *   rate?: number,
   *   eventId?: string,
   *   system?: boolean,
   *   burst?: boolean,
   *   cooldown?: boolean,
   *   cap?: number,
   *   policy?: "unlimited"|"reject"|"oldest"|"quietest",
   * }} opts
   */
  function play(opts) {
    const freq = Number(opts.freq) || 440;
    const dur = Math.max(0.02, Number(opts.dur) || 0.08);
    const gain = Math.max(0, Number(opts.gain) || 0);
    const wave = opts.wave || "square";
    const attack = Math.max(0, Number(opts.attack) || 0);
    const releaseTime = Math.max(0.005, Number(opts.release) || dur);
    const rate = Math.max(0.2, Math.min(3, Number(opts.rate) || 1));
    const heard = Math.max(0.025, dur / rate);
    const eventId = opts.eventId || "SE";
    const system = !!opts.system;
    const now = ctx.currentTime;

    if (!system && opts.cooldown && !opts.burst) {
      const prev = lastAt.get(eventId) ?? -1;
      if (now - prev < 0.05) {
        hooks.log(`SE cooldown ${freq}Hz`);
        return null;
      }
    }
    if (!system) lastAt.set(eventId, now);

    if (!system) {
      const list = studentVoices().map((v) => ({
        id: v.id,
        started: v.started,
        level: voiceLevelAt(v, now),
        voice: v,
      }));
      const decision = decideVoice(
        list,
        opts.policy || "unlimited",
        opts.cap ?? 16,
        SAFETY_VOICE_CAP
      );
      if (decision.action === "reject") {
        hooks.log(`SE reject ${freq}Hz（上限 ${opts.cap}）`);
        return null;
      }
      if (decision.action === "steal" && decision.victim) {
        const victim = list.find((v) => v.id === decision.victim.id)?.voice;
        if (victim) {
          const why = decision.safety
            ? `SE safety stop ${victim.freq}Hz（上限 ${SAFETY_VOICE_CAP}）`
            : opts.policy === "quietest"
              ? `SE stop quietest ${victim.freq}Hz`
              : `SE stop oldest ${victim.freq}Hz`;
          release(victim, why);
        }
      }
    } else if ([...voices].filter((v) => v.system).length >= 6) {
      const oldest = [...voices].filter((v) => v.system).sort((a, b) => a.started - b.started)[0];
      if (oldest) release(oldest);
    }

    const env = ctx.createGain();
    env.connect(engine.sfxIn);
    const t0 = ctx.currentTime;
    const a = Math.min(Math.max(0.004, attack), heard * 0.4);
    const rel = Math.min(Math.max(0.008, releaseTime), heard - a - 0.004);
    const peak = Math.max(0.0008, gain);
    const end = t0 + heard;
    const relAt = end - rel;
    env.gain.setValueAtTime(0.0008, t0);
    env.gain.linearRampToValueAtTime(peak, t0 + a);
    env.gain.setValueAtTime(peak, relAt);
    env.gain.exponentialRampToValueAtTime(0.0008, end);

    /** @type {AudioBufferSourceNode | OscillatorNode} */
    let source;
    if (wave === "noise") {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      src.playbackRate.setValueAtTime(rate, t0);
      src.connect(env);
      src.start(t0);
      src.stop(end + 0.02);
      source = src;
    } else {
      const osc = ctx.createOscillator();
      const type = wave === "sine" || wave === "sawtooth" || wave === "triangle" ? wave : "square";
      osc.type = type;
      // OscillatorNode には playbackRate が無い。倍率は周波数に掛け、長さは heard で縮める。
      osc.frequency.setValueAtTime(freq * rate, t0);
      osc.connect(env);
      osc.start(t0);
      osc.stop(end + 0.02);
      source = osc;
    }

    /** @type {Voice} */
    const voice = {
      id: ++seq,
      eventId,
      freq,
      dur: heard,
      gain,
      attack: a,
      release: rel,
      wave,
      system,
      started: t0,
      done: false,
      env,
      source,
    };
    voices.add(voice);
    source.onended = () => release(voice);
    return voice;
  }

  function stopAll() {
    for (const voice of [...voices]) release(voice);
  }

  /**
   * @param {"success"|"fail"} kind
   */
  function jingle(kind) {
    const buffer = jingles[kind] || jingles.success;
    const env = ctx.createGain();
    env.connect(engine.sfxIn);
    const t0 = ctx.currentTime;
    const dur = buffer.duration;
    env.gain.setValueAtTime(0.0008, t0);
    env.gain.linearRampToValueAtTime(0.2, t0 + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0008, t0 + Math.max(0.05, dur - 0.02));
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(env);
    src.start(t0);
    /** @type {Voice} */
    const voice = {
      id: ++seq,
      eventId: kind === "fail" ? "Fail" : "Success",
      freq: kind === "fail" ? 196 : 523,
      dur,
      gain: 0.2,
      attack: 0.02,
      release: 0.2,
      wave: "jingle",
      system: true,
      started: t0,
      done: false,
      env,
      source: src,
    };
    voices.add(voice);
    src.onended = () => release(voice);
    hooks.log(`SE jingle ${kind}`);
    return voice;
  }

  return {
    play,
    stopAll,
    jingle,
    /**
     * @param {number} amount 0〜1
     */
    heartbeat(amount) {
      const w = Math.max(0, Math.min(1, amount));
      play({
        freq: 78,
        dur: 0.16,
        gain: 0.05 + 0.12 * w,
        wave: "sine",
        attack: 0.005,
        release: 0.12,
        rate: 1,
        eventId: "heartbeat",
        system: true,
      });
      if (w > 0.25) {
        play({
          freq: 1400,
          dur: 0.05,
          gain: 0.025 * w,
          wave: "sine",
          attack: 0.004,
          release: 0.04,
          rate: 1,
          eventId: "warning",
          system: true,
        });
      }
    },
    list() {
      const now = ctx.currentTime;
      return [...voices].map((v) => ({
        id: v.id,
        eventId: v.eventId,
        freq: v.freq,
        wave: v.wave,
        system: v.system,
        level: voiceLevelAt(v, now),
        age: Math.max(0, now - v.started),
      }));
    },
    studentCount() {
      return studentVoices().length;
    },
  };
}
