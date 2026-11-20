/**
 * 同じ長さの合成ループ。レイヤーは同時に開始し、曲の切り替えは別の音量。
 * @see docs/topics/sfx-events/SPEC.md
 */

export const LOOP_SECONDS = 2;

/**
 * @param {string} text
 */
function hashStr(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * @param {number} seed
 */
function makeLcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * ループの最初と最後の標本を揃えて、継ぎ目のクリックを小さくする。
 * @param {Float32Array} data
 * @param {number} [fade]
 */
export function closeLoop(data, fade = 128) {
  const n = data.length;
  if (n < 4) return data;
  const f = Math.min(fade, n >> 1);
  const head = data[0];
  for (let i = 0; i < f; i++) {
    const w = i / (f - 1);
    const idx = n - f + i;
    data[idx] = data[idx] * (1 - w) + head * w;
  }
  data[n - 1] = data[0];
  return data;
}

/**
 * @param {number} t
 * @param {number[]} hits
 * @param {number} decay
 * @param {number} freq
 */
function burst(t, hits, decay, freq) {
  let e = 0;
  for (const hit of hits) {
    let dt = t - hit;
    if (dt < 0) dt += LOOP_SECONDS;
    if (dt < 0.45) e += Math.exp(-dt * decay) * Math.sin(2 * Math.PI * freq * dt);
  }
  return e;
}

/**
 * 2 秒で周期が閉じる層。song は title / a / b、layer は bed / base / tension / battle。
 * @param {"title"|"a"|"b"} song
 * @param {string} layer
 * @param {number} sampleRate
 */
export function renderLayer(song, layer, sampleRate) {
  const n = Math.max(8, Math.round(sampleRate * LOOP_SECONDS));
  const out = new Float32Array(n);
  const rnd = makeLcg(hashStr(`${song}:${layer}`));
  const noise = new Float32Array(n);
  for (let i = 0; i < n; i++) noise[i] = rnd() * 2 - 1;

  const chord =
    song === "b"
      ? { bass: 82.5, mid: 123.5, high: 247 }
      : { bass: 110, mid: 165, high: 220 };

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    let v = 0;
    if (layer === "bed") {
      v += Math.sin(2 * Math.PI * 220 * t) * 0.11;
      v += Math.sin(2 * Math.PI * 165 * t) * 0.05;
      v += Math.sin(2 * Math.PI * 277 * t) * 0.035;
      v *= 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.5 * t);
    } else if (layer === "base") {
      const pulse = 0.72 + 0.28 * Math.sin(2 * Math.PI * 2 * t);
      v += Math.sin(2 * Math.PI * chord.bass * t) * 0.26 * pulse;
      const hat = Math.pow(Math.max(0, Math.sin(2 * Math.PI * 4 * t)), 16);
      v += noise[i] * hat * 0.07;
      v += burst(t, [0.04, 1.04], 14, song === "b" ? 70 : 58) * 0.42;
    } else if (layer === "tension") {
      const trem = 0.82 + 0.18 * Math.sin(2 * Math.PI * 1 * t);
      v += Math.sin(2 * Math.PI * chord.mid * t) * 0.16 * trem;
      v += Math.sin(2 * Math.PI * chord.high * t) * 0.09 * trem;
    } else if (layer === "battle") {
      const gate = Math.pow(Math.max(0, Math.sin(2 * Math.PI * 4 * t)), 2);
      v += Math.sin(2 * Math.PI * chord.high * t) * gate * 0.18;
      v += Math.sin(2 * Math.PI * chord.mid * 2 * t) * gate * 0.05;
    }
    out[i] = Math.max(-1, Math.min(1, v));
  }
  return closeLoop(out, 96);
}

/**
 * @param {"success"|"fail"} kind
 * @param {number} sampleRate
 */
export function renderJingle(kind, sampleRate) {
  const seconds = 0.85;
  const n = Math.round(sampleRate * seconds);
  const out = new Float32Array(n);
  const notes = kind === "fail" ? [392, 311, 196] : [523.25, 659.25, 783.99];
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const step = Math.min(notes.length - 1, Math.floor(t / 0.22));
    const local = t - step * 0.22;
    const env = Math.exp(-local * 4) * (t < 0.78 ? 1 : Math.max(0, (seconds - t) / 0.07));
    const f = notes[step];
    out[i] = Math.sin(2 * Math.PI * f * t) * env * 0.28;
  }
  return out;
}

/**
 * @param {{ ctx: AudioContext, bgmIn: GainNode }} engine
 */
export function createBgmManager(engine) {
  const ctx = engine.ctx;
  const sr = ctx.sampleRate;
  /** @type {Record<string, { gain: GainNode, layers: Record<string, { gain: GainNode, source: AudioBufferSourceNode | null, mix: number }>, buffers: Record<string, AudioBuffer> }>} */
  const songs = {};
  const plan = {
    title: ["bed"],
    a: ["base", "tension", "battle"],
    b: ["base", "tension", "battle"],
  };

  for (const id of Object.keys(plan)) {
    const songGain = ctx.createGain();
    songGain.gain.value = 0;
    songGain.connect(engine.bgmIn);
    /** @type {Record<string, { gain: GainNode, source: AudioBufferSourceNode | null, mix: number }>} */
    const layers = {};
    /** @type {Record<string, AudioBuffer>} */
    const buffers = {};
    for (const layer of plan[id]) {
      const g = ctx.createGain();
      const mix = layer === "base" || layer === "bed" ? 1 : 0;
      g.gain.value = mix;
      g.connect(songGain);
      const data = renderLayer(/** @type {"title"|"a"|"b"} */ (id), layer, sr);
      const buffer = ctx.createBuffer(1, data.length, sr);
      buffer.getChannelData(0).set(data);
      buffers[layer] = buffer;
      layers[layer] = { gain: g, source: null, mix };
    }
    songs[id] = { gain: songGain, layers, buffers };
  }

  let current = "";
  let outgoing = "";
  let running = false;
  let paused = false;
  let loopOn = true;
  let rate = 1;
  let pos = 0;
  let lastClock = ctx.currentTime;
  let fadeDoneAt = 0;

  function songGainValue(id) {
    return songs[id] ? songs[id].gain.gain.value : 0;
  }

  function stopLayers(id) {
    const song = songs[id];
    if (!song) return;
    for (const layer of Object.values(song.layers)) {
      const src = layer.source;
      layer.source = null;
      if (!src) continue;
      src.onended = null;
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
      try {
        src.disconnect();
      } catch {
        /* already disconnected */
      }
    }
  }

  /**
   * @param {string} id
   * @param {number} when
   * @param {number} offset
   */
  function startLayers(id, when, offset) {
    const song = songs[id];
    if (!song) return;
    stopLayers(id);
    const off = Math.max(0, Math.min(LOOP_SECONDS - 0.001, offset));
    for (const [name, layer] of Object.entries(song.layers)) {
      const src = ctx.createBufferSource();
      src.buffer = song.buffers[name];
      src.loop = loopOn;
      src.loopStart = 0;
      src.loopEnd = LOOP_SECONDS;
      src.playbackRate.setValueAtTime(rate, when);
      src.connect(layer.gain);
      src.start(when, off);
      layer.source = src;
    }
  }

  function tick() {
    const now = ctx.currentTime;
    const dt = Math.min(0.1, Math.max(0, now - lastClock));
    lastClock = now;
    if (running && !paused) pos = (pos + dt * rate) % LOOP_SECONDS;
    if (outgoing && fadeDoneAt && now >= fadeDoneAt) {
      stopLayers(outgoing);
      const g = songs[outgoing].gain.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(0, now);
      outgoing = "";
      fadeDoneAt = 0;
    }
  }

  /**
   * @param {string} id
   * @param {number} seconds
   */
  function crossfadeTo(id, seconds) {
    if (!songs[id]) return;
    tick();
    const now = ctx.currentTime;
    const dur = Math.max(0.02, seconds);
    if (current === id && running && !paused) {
      rampTo(songs[id].gain.gain, 1, dur);
      return;
    }
    if (current === id && paused) {
      resume();
      return;
    }
    const from = current;
    const keep = new Set([id]);
    if (from && from !== id) keep.add(from);
    for (const other of Object.keys(songs)) {
      if (keep.has(other)) continue;
      stopLayers(other);
      const g = songs[other].gain.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(0, now);
    }
    if (from && from !== id) {
      outgoing = from;
      fadeDoneAt = now + dur + 0.02;
      rampTo(songs[from].gain.gain, 0, dur);
    } else {
      outgoing = "";
      fadeDoneAt = 0;
    }
    current = id;
    const startAt = paused || !running ? pos : pos;
    startLayers(id, now, startAt);
    const g = songs[id].gain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(0, now);
    g.linearRampToValueAtTime(1, now + dur);
    running = true;
    paused = false;
  }

  function pause() {
    if (!running || paused || !current) return;
    tick();
    stopLayers(current);
    if (outgoing) stopLayers(outgoing);
    outgoing = "";
    paused = true;
  }

  function resume() {
    if (!paused || !current) return;
    const now = ctx.currentTime;
    startLayers(current, now, pos);
    const g = songs[current].gain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(1, now);
    paused = false;
    running = true;
    lastClock = now;
  }

  function stop() {
    tick();
    for (const id of Object.keys(songs)) {
      stopLayers(id);
      const g = songs[id].gain.gain;
      const now = ctx.currentTime;
      g.cancelScheduledValues(now);
      g.setValueAtTime(0, now);
    }
    current = "";
    outgoing = "";
    running = false;
    paused = false;
    pos = 0;
    fadeDoneAt = 0;
  }

  /**
   * @param {number} seconds
   */
  function fadeOut(seconds) {
    if (!current) return;
    const dur = Math.max(0.02, seconds);
    const now = ctx.currentTime;
    outgoing = current;
    fadeDoneAt = now + dur + 0.02;
    rampTo(songs[current].gain.gain, 0, dur);
    current = "";
    running = false;
    paused = false;
  }

  /**
   * @param {AudioParam} param
   * @param {number} value
   * @param {number} seconds
   */
  function rampTo(param, value, seconds) {
    const now = ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + Math.max(0.02, seconds));
  }

  return {
    tick,
    crossfadeTo,
    pause,
    resume,
    stop,
    fadeOut,
    /**
     * @param {boolean} on
     */
    setLoop(on) {
      loopOn = on;
      for (const song of Object.values(songs)) {
        for (const layer of Object.values(song.layers)) {
          if (layer.source) layer.source.loop = on;
        }
      }
    },
    /**
     * @param {number} next
     */
    setRate(next) {
      const r = Math.max(0.2, Math.min(2, next));
      if (Math.abs(r - rate) < 0.001) return;
      rate = r;
      const now = ctx.currentTime;
      for (const song of Object.values(songs)) {
        for (const layer of Object.values(song.layers)) {
          if (!layer.source) continue;
          layer.source.playbackRate.cancelScheduledValues(now);
          layer.source.playbackRate.setValueAtTime(layer.source.playbackRate.value, now);
          layer.source.playbackRate.linearRampToValueAtTime(rate, now + 0.05);
        }
      }
    },
    /**
     * @param {string} songId
     * @param {string} layer
     * @param {number} value
     */
    setLayerGain(songId, layer, value) {
      const song = songs[songId];
      if (!song || !song.layers[layer]) return;
      const v = Math.max(0, Math.min(1, value));
      if (Math.abs(song.layers[layer].mix - v) < 0.002) return;
      song.layers[layer].mix = v;
      rampTo(song.layers[layer].gain.gain, v, 0.08);
    },
    position() {
      return pos;
    },
    loopSeconds: LOOP_SECONDS,
    currentId() {
      return current;
    },
    isRunning() {
      return running && !paused;
    },
    isPaused() {
      return paused;
    },
    snapshot() {
      /** @type {Record<string, number>} */
      const songGains = {};
      for (const id of Object.keys(songs)) songGains[id] = songGainValue(id);
      const active = current || "a";
      const layers = songs[active]
        ? Object.fromEntries(
            Object.entries(songs[active].layers).map(([k, v]) => [k, v.mix])
          )
        : {};
      return { current, outgoing, running, paused, pos, rate, songGains, layers, loopOn };
    },
  };
}
