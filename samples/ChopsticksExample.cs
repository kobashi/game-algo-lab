// Game Algo Lab — 割り箸（循環ゲームグラフ・後退解析）の核
// デモ: algorithms/chopsticks.html
//
// 局面は (手番側の手ペア a<=b, 相手側の手ペア c<=d)。左右の手は区別しないので
// 常にソート済み表現へ正規化する。全状態数は 15（手ペア）×15（手ペア）= 225
// （手番/相手の2局面を先手/後手ラベルで別々に数えないため、SPEC の上界 450 以下）。
//
// 期待される出力（デモの js/chopsticks.js と同じ後退解析を実装し、
// 実際に計算して確認済み。文献値ではなく本リポジトリの自前計算値）:
//   状態数: 225
//   標準（分割なし・5以上で死）:      初期局面 (1,1|1,1) = LOSE  勝ち146 負け79  引分0   到達可能92  波7
//   分割あり（5以上で死）:            初期局面 (1,1|1,1) = LOSE  勝ち141 負け70  引分14  到達可能191 波18
//   ちょうど5のみ死（分割なし）:      初期局面 (1,1|1,1) = LOSE  勝ち99  負け126 引分0   到達可能75  波5
//   分割あり + mod5:                  初期局面 (1,1|1,1) = DRAW  勝ち84  負け39  引分102 到達可能207 波14
//
// 「LOSE」は手番側（先に動く側）が最善手同士で負けることを意味する
// （直感に反するが、割り箸(1,1)対(1,1)からの先手必敗はよく知られた結果で、
//  このデモの後退解析でも独立実装との突き合わせで再現できている）。

using System;
using System.Collections.Generic;
using System.Linq;

public static class Chopsticks
{
    public const int HandMax = 4;

    public enum DeathRule { AtLeastFive, ExactlyFive }

    public sealed record Variant(bool Split, DeathRule Death, bool Mod5);

    public sealed record State((int, int) Mover, (int, int) Opp);

    public static (int, int) Normalize(int x, int y) => x <= y ? (x, y) : (y, x);

    /// <summary>0〜4 の全ソート済みペア（15通り）。</summary>
    public static IEnumerable<(int, int)> AllHandPairs()
    {
        for (int a = 0; a <= HandMax; a++)
            for (int b = a; b <= HandMax; b++)
                yield return (a, b);
    }

    /// <summary>全状態（15×15=225）。</summary>
    public static IEnumerable<State> AllStates()
    {
        var pairs = AllHandPairs().ToList();
        foreach (var mover in pairs)
            foreach (var opp in pairs)
                yield return new State(mover, opp);
    }

    public static string Key(State s) => $"{s.Mover.Item1},{s.Mover.Item2}|{s.Opp.Item1},{s.Opp.Item2}";

    /// <summary>
    /// タップされた手の結果本数。5を超える（exact5で6〜8になる）手は
    /// 「片手に5本を超えて指を掲げることはできない」という制約により不可能な手として null。
    /// mod5 が ON なら死の条件（deathRule）より優先し、余りに戻す（余り0=死）。
    /// </summary>
    public static int? ApplyHit(int target, int hit, Variant v)
    {
        int raw = target + hit;
        if (v.Mod5) return raw % 5;
        if (v.Death == DeathRule.ExactlyFive)
        {
            if (raw == 5) return 0;
            if (raw > 5) return null;
            return raw;
        }
        return raw >= 5 ? 0 : raw;
    }

    /// <summary>
    /// 合法手（タップ + 分割あり時の再分配）。合法手が0件の局面は手番側の負け
    /// （通常は mover=(0,0) のときのみ0件になるが、判定自体は「合法手0件=負け」という
    /// より一般的な基準にしている）。
    /// </summary>
    public static IEnumerable<State> Children(State s, Variant v)
    {
        var (a, b) = s.Mover;
        var (c, d) = s.Opp;

        var hitVals = new HashSet<int>(new[] { a, b }.Where(x => x > 0));
        var tgtVals = new HashSet<int>(new[] { c, d }.Where(x => x > 0));
        foreach (var hitVal in hitVals)
        {
            foreach (var tgtVal in tgtVals)
            {
                var result = ApplyHit(tgtVal, hitVal, v);
                if (result is null) continue;
                int other = tgtVal == c ? d : c;
                yield return new State(Normalize(result.Value, other), s.Mover);
            }
        }

        if (v.Split)
        {
            int sum = a + b;
            for (int x = 0; x <= HandMax; x++)
            {
                int y = sum - x;
                if (y < x || y > HandMax) continue;
                if (x == a && y == b) continue; // 現状と同じ（左右入替のみ含む）分配は不可
                yield return new State(s.Opp, (x, y));
            }
        }
    }

    public enum Label { Win, Lose, Draw }

    /// <summary>
    /// 後退解析（BFS ループ）。終局（合法手0件）を波0の LOSE として、
    /// 「ある手で相手LOSEに行ければWIN」「すべての手が相手WINに行けばLOSE」を
    /// 変化がなくなるまで繰り返す。最後まで残った局面は DRAW（ループ）。
    /// </summary>
    public static (Dictionary<string, Label> Labels, Dictionary<string, int?> Waves) RetrogradeAnalysis(Variant v)
    {
        var states = AllStates().ToList();
        var labels = new Dictionary<string, Label>();
        var waves = new Dictionary<string, int?>();

        foreach (var s in states)
        {
            if (!Children(s, v).Any())
            {
                labels[Key(s)] = Label.Lose;
                waves[Key(s)] = 0;
            }
        }

        int wave = 0;
        bool changed = true;
        while (changed)
        {
            wave++;
            changed = false;
            foreach (var s in states)
            {
                string key = Key(s);
                if (labels.ContainsKey(key)) continue;

                var children = Children(s, v).ToList();
                bool anyLose = false;
                bool allWin = children.Count > 0;
                foreach (var c in children)
                {
                    if (!labels.TryGetValue(Key(c), out var childLabel))
                    {
                        allWin = false;
                        continue;
                    }
                    if (childLabel == Label.Lose) { anyLose = true; break; }
                    if (childLabel != Label.Win) allWin = false;
                }

                if (anyLose)
                {
                    labels[key] = Label.Win;
                    waves[key] = wave;
                    changed = true;
                }
                else if (allWin)
                {
                    labels[key] = Label.Lose;
                    waves[key] = wave;
                    changed = true;
                }
            }
        }

        foreach (var s in states)
        {
            string key = Key(s);
            if (!labels.ContainsKey(key))
            {
                labels[key] = Label.Draw;
                waves[key] = null;
            }
        }

        return (labels, waves);
    }

    public static void Main()
    {
        var standard = new Variant(Split: false, Death: DeathRule.AtLeastFive, Mod5: false);
        var (labels, _) = RetrogradeAnalysis(standard);
        var init = new State((1, 1), (1, 1));
        Console.WriteLine($"状態数: {AllStates().Count()}"); // 225
        Console.WriteLine($"標準バリアント 初期局面(1,1)-(1,1) = {labels[Key(init)]}"); // Lose
    }
}
