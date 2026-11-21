/**
 * トピックごとの実装課題。観察用のボタンとは別で、初期コードはテストに通らない。
 */
import {
  checkCompressedDb,
  checkDuckAt,
  checkEqualPower,
  checkImpactSound,
  checkLandImpact,
  checkLayerGains,
  checkNextGrid,
  checkPickStop,
  checkRandomize,
  checkSoundFor,
  checkStepInterval,
  checkSustainGain,
  checkWarning,
  checkWrapPlayhead,
  scoreDesign,
} from "./audio-checks.js";
import { mountStudentTask } from "./student-task.js";

/** @type {Record<string, Parameters<typeof mountStudentTask>[1]>} */
export const TOPIC_TASKS = {
  "sfx-events": {
    title: "実装課題: 新しいイベントに音を割り当てる",
    goal: "ゲームがイベント名を出すだけで、鳴らす音は購読側の関数が決める。",
    predict: "イベント名を 1 つ足したとき、発行側のボタンを増やさなくても、その名前の音を決められるか。",
    look: "動作テストは、既存の 5 イベントが数を返し、それ以外の名前に安全な周波数・長さ・音量が付くかを見ます。スライダーの操作だけでは完了しません。",
    names: ["soundFor"],
    starter: `function soundFor(eventId) {
  if (eventId === "Jump") return { freq: 440, dur: 0.08, gain: 0.08 };
  if (eventId === "Land") return { freq: 180, dur: 0.12, gain: 0.08 };
  if (eventId === "Hit") return { freq: 220, dur: 0.1, gain: 0.1 };
  if (eventId === "Pickup") return { freq: 660, dur: 0.05, gain: 0.06 };
  if (eventId === "UI") return { freq: 880, dur: 0.03, gain: 0.05 };
  return { freq: 440, dur: 0.08, gain: 0.08 };
}
`,
    quiz: {
      q: "ミュートにすると、ログはどうなりますか。",
      choices: [
        "Emit も効果音も、どちらも残らない",
        "Emit は残り、効果音は鳴らない",
        "効果音は鳴り、Emit だけ消える",
      ],
      answer: 1,
      explain: "発行は続きます。止めるのは購読側の再生です。",
    },
    run(fns, source) {
      const report = checkSoundFor(/** @type {(id: string) => { freq: number, dur: number, gain: number }} */ (fns.soundFor), source);
      return { ...report, json: { v: 1, topic: "sfx-events", ok: report.ok, lines: report.lines } };
    },
  },
  "sfx-voice-limit": {
    title: "実装課題: 止めるボイスを決める",
    goal: "上限を超えたとき、新しい音を拒否するか、古い音を止めるか、小さい音を止めるかを自分で決める。",
    predict: "8 音が上限 4 に入るとき、reject と oldest と quietest で残る音は同じか。",
    look: "上のボタンは聞き比べです。テストは pickStop が、4 本のボイスから方針どおりの 1 本を返すかを見ます。",
    names: ["pickStop"],
    starter: `function pickStop(voices, policy) {
  return voices[0];
}
`,
    quiz: {
      q: "同時に鳴らせる数と、コンプレッサーの役割のちがいはどれですか。",
      choices: [
        "どちらも、鳴っている音の数を減らす",
        "発音数は音を始めるかどうか、コンプレッサーは鳴ったあとの山を下げる",
        "コンプレッサーは、新しい音を拒否する",
      ],
      answer: 1,
      explain: "ボイス上限は割り当てです。圧縮は、すでに鳴っている音量の山を扱います。",
    },
    run(fns) {
      const report = checkPickStop(/** @type {(voices: {id: number, started: number, level: number}[], policy: string) => {id: number} | null} */ (fns.pickStop));
      return { ...report, json: { v: 1, topic: "sfx-voice-limit", ok: report.ok, lines: report.lines } };
    },
  },
  "sfx-randomize": {
    title: "実装課題: 再現できるバリエーション",
    goal: "同じ効果音の機械的な繰り返しを抑え、シードが同じなら並びも同じにする。",
    predict: "バッグを使わない連打と、バッグを使う連打で、同じサンプルが続く回数はどう変わるか。",
    look: "テストは vary と takeVariant を呼びます。unit が同じなら結果も同じで、バッグは重複なく空になります。",
    names: ["vary", "takeVariant"],
    starter: `function vary(unit, pitchRange, volRange) {
  return { pitch: 1, vol: 0.08 };
}
function takeVariant(bag) {
  return bag[0];
}
`,
    quiz: {
      q: "シードを固定すると、何が再現できますか。",
      choices: [
        "聴いた人の音量設定",
        "同じ乱数の列から作ったピッチ、音量、サンプルの順",
        "次にプレイヤーが押すボタン",
      ],
      answer: 1,
      explain: "シードは乱数の始まりです。同じ始まりなら、同じ取り出し順になります。",
    },
    run(fns) {
      const report = checkRandomize(
        /** @type {(unit: number, pitchRange: number, volRange: number) => { pitch: number, vol: number }} */ (fns.vary),
        /** @type {(bag: number[]) => number} */ (fns.takeVariant)
      );
      return { ...report, json: { v: 1, topic: "sfx-randomize", ok: report.ok, lines: report.lines } };
    },
  },
  "audio-bus-ducking": {
    title: "実装課題: ダックの包絡と圧縮",
    goal: "重要な効果音のあいだ BGM を時間包絡で下げ、多重発音では指定した圧縮特性にする。",
    predict: "ダック中の BGM は、コンプレッサーを切っていても下がるか。",
    look: "duckAt は経過秒から線形ゲインを返します。compressedDb は、しきい値の下をそのまま、上を ratio で圧縮します。",
    names: ["duckAt", "compressedDb"],
    starter: `function duckAt(t, attack, hold, release, floorGain) {
  return 1;
}
function compressedDb(inputDb, threshold, ratio) {
  return inputDb;
}
`,
    quiz: {
      q: "イベントで BGM を下げる処理は、どれですか。",
      choices: [
        "DynamicsCompressor の ratio",
        "一定時間のゲイン包絡",
        "ボイス上限の Reject",
      ],
      answer: 1,
      explain: "ダッキングは、効果音に合わせて BGM のゲインを時間で動かす処理です。",
    },
    run(fns) {
      const duck = checkDuckAt(/** @type {(t: number, a: number, h: number, r: number, f: number) => number} */ (fns.duckAt));
      const comp = checkCompressedDb(/** @type {(i: number, t: number, r: number) => number} */ (fns.compressedDb));
      const lines = [...duck.lines, ...comp.lines];
      const ok = duck.ok && comp.ok;
      return { ok, lines, json: { v: 1, topic: "audio-bus-ducking", ok, lines } };
    },
  },
  "sfx-material": {
    title: "実装課題: 材質と衝突速度",
    goal: "材質で音色を選び、衝突速度を音量と周波数へ変換する。",
    predict: "同じ速度でも、金属と木で高さは揃うか。速度 0 の接触は鳴るか。",
    look: "impactSound(material, speed) が { freq, gain } を返します。material は metal または wood です。",
    names: ["impactSound"],
    starter: `function impactSound(material, speed) {
  return { freq: 200, gain: 0.1 };
}
`,
    quiz: {
      q: "衝突の直前に音へ渡すべきなのはどれですか。",
      choices: [
        "接触したあとの静止速度",
        "接触する直前の相対速度",
        "オブジェクトの名前の文字数",
      ],
      answer: 1,
      explain: "止まったあとの速度は 0 に近く、衝撃の強さは当たる直前の相対速度にあります。",
    },
    run(fns) {
      const report = checkImpactSound(/** @type {(m: string, s: number) => { freq: number, gain: number }} */ (fns.impactSound));
      return { ...report, json: { v: 1, topic: "sfx-material", ok: report.ok, lines: report.lines } };
    },
  },
  "audio-motion": {
    title: "実装課題: 足音と速度連動音",
    goal: "接地と速度から離散の足音を作り、速度から連続の持続音を作る。",
    predict: "ジャンプ中に足音は出るか。止まったとき持続音は残るか。",
    look: "stepInterval は秒を返します。0 は鳴らしません。sustainGain は 0〜0.3 です。曲線の実験は上の選択で、テストは下の関数です。",
    names: ["stepInterval", "sustainGain"],
    starter: `function stepInterval(speed, grounded) {
  return 0.5;
}
function sustainGain(speed) {
  return 0.1;
}
`,
    quiz: {
      q: "足音と、速度に追従するループ音のちがいはどれですか。",
      choices: [
        "どちらも、移動距離が一定になるたびに 1 回鳴る",
        "足音は接地中の離散イベントで、ループ音は速度を連続した音量や高さにする",
        "ループ音は、ジャンプボタンを押した瞬間だけ鳴る",
      ],
      answer: 1,
      explain: "連続な速度からイベントを切り出すのが足音で、パラメータを連続で動かすのが持続音です。",
    },
    run(fns) {
      const steps = checkStepInterval(/** @type {(s: number, g: boolean) => number} */ (fns.stepInterval));
      const sustain = checkSustainGain(/** @type {(s: number) => number} */ (fns.sustainGain));
      const lines = [...steps.lines, ...sustain.lines];
      const ok = steps.ok && sustain.ok;
      return { ok, lines, json: { v: 1, topic: "audio-motion", ok, lines } };
    },
  },
  "sfx-spatial": {
    title: "実装課題: 距離で警告する",
    goal: "キャラクターと敵の距離から、警告の音量と周期を決める。",
    predict: "敵が近づくと、警告は大きくなるか、小さくなるか。間隔は短くなるか。",
    look: "warning(distance) は { gain, interval } を返します。距離の単位はピクセルです。",
    names: ["warning"],
    starter: `function warning(distance) {
  return { gain: 0.1, interval: 0.5 };
}
`,
    quiz: {
      q: "距離減衰とステレオパンが別々にしていることはどれですか。",
      choices: [
        "減衰は大きさ、パンは左右",
        "どちらも左右だけを変える",
        "パンは音の長さを変える",
      ],
      answer: 0,
      explain: "遠いほど小さくし、音源がリスナーのどちら側かに応じて左右を分けます。",
    },
    run(fns) {
      const report = checkWarning(/** @type {(d: number) => { gain: number, interval: number }} */ (fns.warning));
      return { ...report, json: { v: 1, topic: "sfx-spatial", ok: report.ok, lines: report.lines } };
    },
  },
  "bgm-loop": {
    title: "実装課題: ループの再生位置",
    goal: "イントロのあと、loopStart から loopEnd のあいだだけを繰り返す。",
    predict: "再生位置が loopEnd ちょうどのとき、次の位置はイントロの先頭に戻るか。",
    look: "wrapPlayhead(t, loopStart, loopEnd) は、ラップしたあとの秒を返します。",
    names: ["wrapPlayhead"],
    starter: `function wrapPlayhead(t, loopStart, loopEnd) {
  return t;
}
`,
    quiz: {
      q: "一時停止して再開するとき、基準にするものはどれですか。",
      choices: [
        "停止していた壁時計の長さを、再生位置へ足す",
        "再開した AudioContext の時刻を新しい原点にし、止めた再生位置から続ける",
        "毎回、曲の先頭へ戻す",
      ],
      answer: 1,
      explain: "鳴っている時間は AudioContext の時刻です。止めていたあいだは進めません。",
    },
    run(fns) {
      const report = checkWrapPlayhead(/** @type {(t: number, a: number, b: number) => number} */ (fns.wrapPlayhead));
      return { ...report, json: { v: 1, topic: "bgm-loop", ok: report.ok, lines: report.lines } };
    },
  },
  "bgm-quantize": {
    title: "実装課題: 次の拍へ予約する",
    goal: "ゲームの時刻を、次の拍の境界まで遅らせて音楽のグリッドに乗せる。",
    predict: "拍の途中で起きたイベントは、その場で鳴るか、次の拍まで待つか。",
    look: "nextGrid(now, beatSec) は、now 以上で拍の境界にある時刻を返します。",
    names: ["nextGrid"],
    starter: `function nextGrid(now, beatSec) {
  return now + 0.1;
}
`,
    quiz: {
      q: "拍に揃えると、ゲームの出来事はどうなりますか。",
      choices: [
        "起きた瞬間より、次の拍まで音が遅れることがある",
        "BPM がゲームのフレームレートになる",
        "小節の長さは常に 1 秒になる",
      ],
      answer: 0,
      explain: "音楽の時刻とゲームの時刻は別です。揃えるとは、次の境界まで予約することです。",
    },
    run(fns) {
      const report = checkNextGrid(/** @type {(now: number, beat: number) => number} */ (fns.nextGrid));
      return { ...report, json: { v: 1, topic: "bgm-quantize", ok: report.ok, lines: report.lines } };
    },
  },
  "bgm-transition-compare": {
    title: "実装課題: 等パワーの交差",
    goal: "切替の途中でも音量のエネルギーが落ちにくい交差を作る。",
    predict: "線形で半分ずつ混ぜたときと、等パワーで混ぜたとき、真ん中の音量は同じに聞こえるか。",
    look: "equalPower(t) は 0〜1 の t から { from, to } を返します。from は出ていく曲、to は入ってくる曲です。",
    names: ["equalPower"],
    starter: `function equalPower(t) {
  const u = Math.max(0, Math.min(1, t));
  return { from: 1 - u, to: u };
}
`,
    quiz: {
      q: "フェードの途中でもう一度切り替えるとき、始まりの音量はどれですか。",
      choices: [
        "最初の曲の 100% からやり直す",
        "今聞こえている 2 曲の音量から、反対の目標へ進む",
        "両方を一度 0 にしてから始める",
      ],
      answer: 1,
      explain: "途中のミックスを始点にすると、もう一度押した瞬間に音量が飛びません。",
    },
    run(fns) {
      const report = checkEqualPower(/** @type {(t: number) => { from: number, to: number }} */ (fns.equalPower));
      return { ...report, json: { v: 1, topic: "bgm-transition-compare", ok: report.ok, lines: report.lines } };
    },
  },
  "bgm-interactive": {
    title: "実装課題: 3 つの状態の BGM",
    goal: "通常・警戒・戦闘で、ベースを残したままレイヤーを足し引きする。",
    predict: "戦闘が終わって通常へ戻るとき、ベースも止まるか。",
    look: "layerGains(state) は { base, tension, battle } を 0〜1 で返します。state は normal、alert、battle です。",
    names: ["layerGains"],
    starter: `function layerGains(state) {
  return { base: 1, tension: 1, battle: 1 };
}
`,
    quiz: {
      q: "次の小節でレイヤーを足す理由はどれですか。",
      choices: [
        "拍の途中で入ると、リズムが割れやすい",
        "小節を待たないと AudioContext が始まらない",
        "レイヤーは 1 小節に 1 音しか鳴らせない",
      ],
      answer: 0,
      explain: "状態はすぐ変わってよいです。聞こえる追加は、次の小節の頭に予約します。",
    },
    run(fns) {
      const report = checkLayerGains(/** @type {(s: string) => { base: number, tension: number, battle: number }} */ (fns.layerGains));
      return { ...report, json: { v: 1, topic: "bgm-interactive", ok: report.ok, lines: report.lines } };
    },
  },
  "audio-adaptive-lab": {
    title: "総合課題",
    goal: "移動、着地、敵の距離、同時発音、BGM の状態を、1 つのゲームの音として設計する。",
    predict: "足音・着地・警告・発音数・BGM のうち、スライダーだけで決まるものはどれか。",
    look: "点数は、下の関数と設計の文章だけから付きます。100 点のうち、足音 25、着地 15、警告 20、発音数 15、BGM 15、設計 10 です。",
    names: ["stepInterval", "landImpact", "warning", "pickStop", "layerGains"],
    design: true,
    starter: `function stepInterval(speed, grounded) {
  return 0.5;
}
function landImpact(speed) {
  return { freq: 200, gain: 0.1 };
}
function warning(distance) {
  return { gain: 0.1, interval: 0.5 };
}
function pickStop(voices, policy) {
  return voices[0];
}
function layerGains(state) {
  return { base: 1, tension: 1, battle: 1 };
}
`,
    quiz: {
      q: "この総合課題でテストが読むものはどれですか。",
      choices: [
        "ページ上のスライダーの位置",
        "学生が書いた関数と、設計の文章",
        "ブラウザの音量ミキサー",
      ],
      answer: 1,
      explain: "聞いて確かめる操作と、採点される実装は別です。",
    },
    run(fns, _source, design) {
      const steps = checkStepInterval(/** @type {(s: number, g: boolean) => number} */ (fns.stepInterval));
      const land = checkLandImpact(/** @type {(s: number) => { freq: number, gain: number }} */ (fns.landImpact));
      const warn = checkWarning(/** @type {(d: number) => { gain: number, interval: number }} */ (fns.warning));
      const voices = checkPickStop(/** @type {(v: {id: number, started: number, level: number}[], p: string) => {id: number} | null} */ (fns.pickStop));
      const music = checkLayerGains(/** @type {(s: string) => { base: number, tension: number, battle: number }} */ (fns.layerGains));
      const note = scoreDesign(design);
      const scores = {
        footsteps: steps.ok ? 25 : 0,
        landing: land.ok ? 15 : 0,
        warning: warn.ok ? 20 : 0,
        voices: voices.ok ? 15 : 0,
        bgm: music.ok ? 15 : 0,
        design: note.points,
      };
      const total = Object.values(scores).reduce((sum, n) => sum + n, 0);
      const lines = [
        `足音 ${scores.footsteps} / 25`,
        ...steps.lines,
        `着地 ${scores.landing} / 15`,
        ...land.lines,
        `警告 ${scores.warning} / 20`,
        ...warn.lines,
        `発音数 ${scores.voices} / 15`,
        ...voices.lines,
        `BGM ${scores.bgm} / 15`,
        ...music.lines,
        `設計 ${scores.design} / 10`,
        ...note.lines,
        `合計 ${total} / 100`,
      ];
      return {
        ok: total === 100,
        lines,
        json: {
          v: 1,
          topic: "audio-adaptive-lab",
          scores: { ...scores, total },
          design,
          lines,
        },
      };
    },
  },
};

/**
 * @param {string} topicId
 */
export function mountTopicTask(topicId) {
  const host = document.getElementById("student-task");
  const task = TOPIC_TASKS[topicId];
  if (!host || !task) return;
  mountStudentTask(host, task);
}
