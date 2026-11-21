/**
 * 学生が書いた関数への動作テスト。
 * 失敗したときは規則だけを返し、期待する数値は書かない。
 */

/**
 * @param {unknown} value
 */
function finite(value) {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * @param {string[]} lines
 * @param {boolean} ok
 * @param {string} message
 */
function say(lines, ok, message) {
  if (!ok) lines.push(message);
  return ok;
}

const SOUND_BUILTIN = ["Jump", "Land", "Hit", "Pickup", "UI"];
const SOUND_NAME = /^[A-Za-z][A-Za-z0-9_]{1,24}$/;

/**
 * ソースに書かれていない名前を、未登録の呼び出しに使う。
 * @param {string} eventName
 * @param {string} source
 */
function unlistedName(eventName, source) {
  const text = String(source ?? "");
  const taken = new Set([...SOUND_BUILTIN, eventName]);
  for (const seed of ["Unlisted", "Spare", "Unused", "OtherEvent"]) {
    if (!taken.has(seed) && !text.includes(seed)) return seed;
  }
  for (let n = 2; n < 50; n++) {
    const seed = `Other${n}`;
    if (!taken.has(seed) && !text.includes(seed)) return seed;
  }
  return "OtherEvent";
}

/**
 * @param {unknown} value
 * @returns {{ freq: number, dur: number, gain: number } | null}
 */
function asTone(value) {
  if (!value || typeof value !== "object") return null;
  const tone = /** @type {{ freq?: unknown, dur?: unknown, gain?: unknown }} */ (value);
  if (!finite(tone.freq) || !finite(tone.dur) || !finite(tone.gain)) return null;
  return { freq: tone.freq, dur: tone.dur, gain: tone.gain };
}

/**
 * @param {unknown} value
 */
function toneInRange(value) {
  const tone = asTone(value);
  return (
    !!tone &&
    tone.freq >= 40 &&
    tone.freq <= 2000 &&
    tone.dur >= 0.02 &&
    tone.dur <= 1 &&
    tone.gain >= 0 &&
    tone.gain <= 0.3
  );
}

/**
 * @param {unknown} a
 * @param {unknown} b
 */
function sameTone(a, b) {
  const left = asTone(a);
  const right = asTone(b);
  if (!left || !right) return false;
  return left.freq === right.freq && left.dur === right.dur && left.gain === right.gain;
}

/**
 * @param {Function} fn
 * @param {string} id
 */
function callTone(fn, id) {
  try {
    return fn(id);
  } catch {
    return null;
  }
}

/**
 * 入力されたイベント名を関数へ渡し、未登録の名前と戻り値を比べる。
 * source は、採点する名前を探すためではなく、未登録の呼び出し名をソースに無いものから選ぶために使う。
 * @param {(eventId: string) => { freq?: number, dur?: number, gain?: number } | null} fn
 * @param {string} eventName
 * @param {string} [source]
 */
export function checkSoundFor(fn, eventName, source = "") {
  const lines = [];
  let ok = true;
  for (const id of SOUND_BUILTIN) {
    const tone = callTone(fn, id);
    const good = !!asTone(tone);
    ok = say(lines, good, `${id} は周波数・長さ・音量の数を返します`) && ok;
  }
  const name = String(eventName ?? "").trim();
  if (!SOUND_NAME.test(name) || SOUND_BUILTIN.includes(name)) {
    ok = false;
    lines.push(
      "新しいイベント名は、英字から始まる 2〜25 文字の英数字で、Jump、Land、Hit、Pickup、UI 以外にします"
    );
  } else {
    const tone = callTone(fn, name);
    const good = toneInRange(tone);
    ok =
      say(
        lines,
        good,
        `${name} の周波数は 40〜2000、長さは 0.02〜1 秒、音量は 0〜0.3 にします`
      ) && ok;
    const other = callTone(fn, unlistedName(name, source));
    const distinct = !sameTone(tone, other);
    ok =
      say(
        lines,
        distinct,
        `${name} の音は、未登録の名前が返す値と区別します。未登録の名前には音を返さないか、別の音を返します`
      ) && ok;
    if (good && distinct) lines.push(`${name} に効果音を割り当てられました`);
  }
  return { ok, lines };
}

/**
 * @param {(voices: {id: number, started: number, level: number}[], policy: string) => {id: number} | null} fn
 */
export function checkPickStop(fn) {
  const lines = [];
  let ok = true;
  const voices = [
    { id: 1, started: 10, level: 0.5 },
    { id: 2, started: 20, level: 0.1 },
    { id: 3, started: 30, level: 0.8 },
    { id: 4, started: 40, level: 0.2 },
  ];
  const rejected = fn(voices, "reject");
  ok = say(lines, rejected == null, "reject のときは、どのボイスも止めません") && ok;
  const oldest = fn(voices, "oldest");
  ok =
    say(
      lines,
      !!oldest && oldest.id === voices.reduce((a, b) => (a.started < b.started ? a : b)).id,
      "oldest は、開始がいちばん早いボイスを返します"
    ) && ok;
  const quiet = fn(voices, "quietest");
  ok =
    say(
      lines,
      !!quiet && quiet.id === voices.reduce((a, b) => (a.level < b.level ? a : b)).id,
      "quietest は、レベルがいちばん小さいボイスを返します"
    ) && ok;
  if (ok) lines.push("上限に達したとき、指定した優先順位で止めるボイスを選べました");
  return { ok, lines };
}

/**
 * @param {(unit: number, pitchRange: number, volRange: number) => { pitch: number, vol: number }} vary
 * @param {(bag: number[]) => number} takeVariant
 */
export function checkRandomize(vary, takeVariant) {
  const lines = [];
  let ok = true;
  const low = vary(0, 1, 1);
  const high = vary(1, 1, 1);
  const again = vary(0, 1, 1);
  ok =
    say(
      lines,
      !!low && !!high && low.pitch !== high.pitch && low.vol !== high.vol,
      "unit が変わると、ピッチと音量も範囲の中で変わります"
    ) && ok;
  ok =
    say(
      lines,
      !!low && !!again && low.pitch === again.pitch && low.vol === again.vol,
      "同じ unit は、同じピッチと音量になります"
    ) && ok;
  const bag = [0, 1, 2];
  const a = takeVariant(bag);
  const b = takeVariant(bag);
  const c = takeVariant(bag);
  const got = [a, b, c].slice().sort((x, y) => x - y);
  ok =
    say(
      lines,
      bag.length === 0 && got[0] === 0 && got[1] === 1 && got[2] === 2,
      "バッグからは、残っている番号を重複なく取り、取り終えると空になります"
    ) && ok;
  if (ok) lines.push("同じ音の繰り返しを抑え、同じ条件では同じ並びを再現できます");
  return { ok, lines };
}

/**
 * アタックで下がり、ホールドは床、リリースで 1 に戻る線形包絡。
 * @param {number} t
 * @param {number} attack
 * @param {number} hold
 * @param {number} release
 * @param {number} floorGain
 */
export function duckEnvelope(t, attack, hold, release, floorGain) {
  const a = Math.max(0, attack);
  const h = Math.max(0, hold);
  const r = Math.max(0.001, release);
  const floor = floorGain;
  if (!(t >= 0)) return 1;
  if (t < a) return a === 0 ? floor : 1 + (floor - 1) * (t / a);
  if (t < a + h) return floor;
  if (t < a + h + r) return floor + (1 - floor) * ((t - a - h) / r);
  return 1;
}

/**
 * @param {(t: number, attack: number, hold: number, release: number, floorGain: number) => number} fn
 */
export function checkDuckAt(fn) {
  const lines = [];
  let ok = true;
  const samples = [0, 0.02, 0.05, 0.2, 0.4, 0.7, 1];
  for (const t of samples) {
    const want = duckEnvelope(t, 0.05, 0.25, 0.4, 0.15);
    const got = fn(t, 0.05, 0.25, 0.4, 0.15);
    if (!finite(got) || Math.abs(got - want) > 0.02) ok = false;
  }
  ok =
    say(
      lines,
      ok,
      "アタックで床まで下がり、ホールドのあいだは床のまま、リリースで 1 に戻ります"
    ) && ok;
  if (ok) lines.push("指定した時間包絡で BGM を減衰させ、戻せます");
  return { ok, lines };
}

/**
 * @param {(inputDb: number, threshold: number, ratio: number) => number} fn
 */
export function checkCompressedDb(fn) {
  const lines = [];
  let ok = true;
  const under = fn(-30, -24, 4);
  const over = fn(-12, -24, 4);
  ok = say(lines, finite(under) && Math.abs(under - -30) < 0.05, "しきい値以下の入力はそのまま出します") && ok;
  const expect = -24 + (-12 - -24) / 4;
  ok =
    say(
      lines,
      finite(over) && Math.abs(over - expect) < 0.05,
      "しきい値を超えた分は、ratio で割ってしきい値に足します"
    ) && ok;
  if (ok) lines.push("指定した圧縮特性を、しきい値の前後で分けられました");
  return { ok, lines };
}

/**
 * @param {(material: string, speed: number) => { freq?: number, gain?: number }} fn
 */
export function checkImpactSound(fn) {
  const lines = [];
  let ok = true;
  const metal = fn("metal", 8);
  const wood = fn("wood", 8);
  const slow = fn("wood", 2);
  const fast = fn("wood", 12);
  const still = fn("wood", 0);
  ok =
    say(
      lines,
      !!metal && !!wood && finite(metal.freq) && finite(wood.freq) && metal.freq > wood.freq,
      "同じ速さでは、金属の周波数を木より高くします"
    ) && ok;
  ok =
    say(
      lines,
      !!slow && !!fast && finite(slow.gain) && finite(fast.gain) && fast.gain > slow.gain,
      "速い衝突の音量を、遅い衝突より大きくします"
    ) && ok;
  ok =
    say(
      lines,
      !!still && finite(still.gain) && still.gain < 0.02,
      "速さ 0 の衝突は、ほとんど鳴らさない音量にします"
    ) && ok;
  if (ok) lines.push("材質と衝突速度から、音色と衝撃の強さを音へ変換できました");
  return { ok, lines };
}

/**
 * @param {(speed: number, grounded: boolean) => number} fn
 */
export function checkStepInterval(fn) {
  const lines = [];
  let ok = true;
  const air = fn(80, false);
  const slow = fn(10, true);
  const mid = fn(40, true);
  const fast = fn(100, true);
  ok = say(lines, air === 0, "空中のときは足音の間隔を 0（鳴らさない）にします") && ok;
  ok = say(lines, slow === 0, "遅すぎる移動では足音を出しません") && ok;
  ok =
    say(
      lines,
      finite(mid) && mid > 0 && finite(fast) && fast > 0 && fast < mid,
      "接地して十分速いときだけ足音を出し、速いほど間隔を短くします"
    ) && ok;
  if (ok) lines.push("速度と接地から、足音の間隔を作れました");
  return { ok, lines };
}

/**
 * @param {(speed: number) => number} fn
 */
export function checkSustainGain(fn) {
  const lines = [];
  let ok = true;
  const rest = fn(0);
  const walk = fn(40);
  const run = fn(120);
  ok = say(lines, finite(rest) && rest <= 0.001, "止まっているときの持続音は 0 です") && ok;
  ok =
    say(
      lines,
      finite(walk) && finite(run) && run > walk && walk >= 0 && run <= 0.3,
      "速いほど持続音は大きくなり、0.3 は超えません"
    ) && ok;
  if (ok) lines.push("速度に連動する持続音の音量を作れました");
  return { ok, lines };
}

/**
 * @param {(distance: number) => { gain?: number, interval?: number }} fn
 */
export function checkWarning(fn) {
  const lines = [];
  let ok = true;
  const near = fn(100);
  const far = fn(400);
  const gone = fn(900);
  ok =
    say(
      lines,
      !!near && !!far && finite(near.gain) && finite(far.gain) && near.gain > far.gain,
      "近いときの警告を、遠いときより大きくします"
    ) && ok;
  ok =
    say(
      lines,
      !!near && !!far && finite(near.interval) && finite(far.interval) && near.interval < far.interval,
      "近いときの警告の間隔を、遠いときより短くします"
    ) && ok;
  ok =
    say(lines, !!gone && finite(gone.gain) && gone.gain === 0, "十分遠い警告は音量 0 にします") && ok;
  if (ok) lines.push("距離に応じた警告音の音量と周期を作れました");
  return { ok, lines };
}

/**
 * @param {(state: string) => { base?: number, tension?: number, battle?: number }} fn
 */
export function checkLayerGains(fn) {
  const lines = [];
  let ok = true;
  const states = ["normal", "alert", "battle"];
  for (const state of states) {
    const g = fn(state);
    const values = [g?.base, g?.tension, g?.battle];
    const inRange = values.every((n) => finite(n) && n >= 0 && n <= 1);
    ok = say(lines, inRange, `${state} の各レイヤーは 0〜1 の数です`) && ok;
    ok = say(lines, finite(g?.base) && /** @type {number} */ (g?.base) > 0, `${state} でもベースは鳴らし続けます`) && ok;
  }
  const normal = fn("normal");
  const alert = fn("alert");
  const battle = fn("battle");
  ok =
    say(
      lines,
      finite(normal?.tension) &&
        normal.tension === 0 &&
        finite(normal?.battle) &&
        normal.battle === 0,
      "通常はベースだけにします"
    ) && ok;
  ok =
    say(
      lines,
      finite(alert?.tension) && alert.tension > 0 && finite(alert?.battle) && alert.battle === 0,
      "警戒はテンションを足し、戦闘レイヤーは 0 のままにします"
    ) && ok;
  ok =
    say(lines, finite(battle?.battle) && battle.battle > 0, "戦闘は戦闘レイヤーを足します") && ok;
  if (ok) lines.push("通常・警戒・戦闘で、レイヤーの音量を切り替えられました");
  return { ok, lines };
}

/**
 * @param {(t: number, loopStart: number, loopEnd: number) => number} fn
 */
export function checkWrapPlayhead(fn) {
  const lines = [];
  let ok = true;
  const inside = fn(1.2, 1, 3);
  const edge = fn(3, 1, 3);
  const past = fn(3.5, 1, 3);
  ok = say(lines, inside === 1.2, "ループの内側では、再生位置をそのままにします") && ok;
  ok = say(lines, edge === 1, "ループの終端は、ループの先頭へ戻します") && ok;
  ok =
    say(
      lines,
      finite(past) && past >= 1 && past < 3,
      "終端を少し過ぎた位置は、ループの先頭より前へ戻さず、ループ区間の中へ写します"
    ) && ok;
  if (ok) lines.push("イントロのあと、ループ区間の中だけで再生位置をたどれました");
  return { ok, lines };
}

/**
 * @param {(now: number, beatSec: number) => number} fn
 */
export function checkNextGrid(fn) {
  const lines = [];
  let ok = true;
  const early = fn(0.1, 0.5);
  const onBeat = fn(1, 0.5);
  ok =
    say(
      lines,
      finite(early) && early >= 0.1 && Math.abs(early / 0.5 - Math.round(early / 0.5)) < 1e-6 && early - 0.1 <= 0.5,
      "今より前には戻さず、次の拍までの遅れは 1 拍以内で、拍の境界に揃えます"
    ) && ok;
  ok = say(lines, onBeat === 1, "ちょうど拍の上にいるときは、その拍を返します") && ok;
  if (ok) lines.push("ゲームの時刻を、次の拍へ予約できました");
  return { ok, lines };
}

/**
 * @param {(t: number) => { from?: number, to?: number }} fn
 */
export function checkEqualPower(fn) {
  const lines = [];
  let ok = true;
  const a = fn(0);
  const b = fn(1);
  const m = fn(0.5);
  ok =
    say(
      lines,
      !!a && finite(a.from) && finite(a.to) && Math.abs(a.from - 1) < 0.05 && Math.abs(a.to) < 0.05,
      "始まりは、出ていく曲をほぼ 1、入ってくる曲をほぼ 0 にします"
    ) && ok;
  ok =
    say(
      lines,
      !!b && finite(b.from) && finite(b.to) && Math.abs(b.from) < 0.05 && Math.abs(b.to - 1) < 0.05,
      "終わりは、出ていく曲をほぼ 0、入ってくる曲をほぼ 1 にします"
    ) && ok;
  const power =
    !!m && finite(m.from) && finite(m.to) ? m.from * m.from + m.to * m.to : 0;
  ok =
    say(lines, power >= 0.9 && power <= 1.1, "真ん中では、2 つの音量の二乗和がほぼ 1 になります") && ok;
  if (ok) lines.push("等パワーのクロスフェードを作れました");
  return { ok, lines };
}

/**
 * @param {(speed: number) => { freq?: number, gain?: number }} fn
 */
export function checkLandImpact(fn) {
  const lines = [];
  let ok = true;
  const still = fn(0);
  const soft = fn(40);
  const hard = fn(180);
  ok = say(lines, !!still && finite(still.gain) && still.gain < 0.02, "着地速度 0 は、ほとんど無音にします") && ok;
  ok =
    say(
      lines,
      !!soft && !!hard && finite(soft.gain) && finite(hard.gain) && hard.gain > soft.gain,
      "着地が速いほど、衝撃音を大きくします"
    ) && ok;
  if (ok) lines.push("着地速度を衝撃音へ変換できました");
  return { ok, lines };
}

/**
 * @param {string} design
 */
export function scoreDesign(design) {
  const text = String(design || "").trim();
  const ok = text.length >= 40;
  return {
    ok,
    points: ok ? 10 : 0,
    lines: ok
      ? ["設計の意図を、聞き手がたどれる長さで書けました"]
      : ["どの音を、どのゲームの状態から決めたかを、文章で説明します"],
  };
}
