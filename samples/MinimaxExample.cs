// Game Algo Lab — Min-Max 探索の核（教材用）
// デモ: algorithms/minimax.html

using System;
using System.Collections.Generic;
using System.Linq;

public enum MmKind
{
    Max,  // 自分（最大化）
    Min,  // 相手（最小化）
    Leaf  // 終端評価
}

public sealed class MmNode
{
    public string Id { get; }
    public string Label { get; }
    public MmKind Kind { get; }
    public int? Score { get; } // Leaf のみ
    public List<MmNode> Children { get; } = new();

    public MmNode(string id, string label, MmKind kind, int? score = null)
    {
        Id = id;
        Label = label;
        Kind = kind;
        Score = score;
    }
}

public static class Minimax
{
    /// <summary>
    /// 節点 n の Minimax 値。
    /// MAX は子の最大、MIN は子の最小、葉は固定スコア。
    /// ※ α-β 枝刈りは含まない（全子を評価する素の Min-Max）
    /// </summary>
    public static int Evaluate(MmNode n)
    {
        if (n.Kind == MmKind.Leaf)
            return n.Score ?? 0;

        if (n.Kind == MmKind.Max)
        {
            int best = int.MinValue;
            foreach (var child in n.Children)
                best = Math.Max(best, Evaluate(child));
            return best;
        }

        // Min
        int worstForMax = int.MaxValue;
        foreach (var child in n.Children)
            worstForMax = Math.Min(worstForMax, Evaluate(child));
        return worstForMax;
    }

    /// <summary>
    /// 深さ制限つきの Minimax。読み切れない節点は評価関数で見積もる
    /// （ここでは配下の葉の平均。デモの既定と同じ考え方）。
    /// useZero=true にすると比較用に 0 固定へ切り替えられる —
    /// 深さを浅くすると根が常に 0 になり、手を選べなくなることを確認できる。
    /// </summary>
    public static double EvaluateWithDepthLimit(MmNode n, int depthLeft, bool useZero = false)
    {
        if (n.Kind == MmKind.Leaf)
            return n.Score ?? 0;

        if (depthLeft <= 0)
            return useZero ? 0.0 : AverageLeaf(n);

        if (n.Kind == MmKind.Max)
        {
            double best = double.NegativeInfinity;
            foreach (var child in n.Children)
                best = Math.Max(best, EvaluateWithDepthLimit(child, depthLeft - 1, useZero));
            return best;
        }

        double worstForMax = double.PositiveInfinity;
        foreach (var child in n.Children)
            worstForMax = Math.Min(worstForMax, EvaluateWithDepthLimit(child, depthLeft - 1, useZero));
        return worstForMax;
    }

    /// <summary>評価関数の例: 配下にある葉のスコアの平均。</summary>
    private static double AverageLeaf(MmNode n)
    {
        var leaves = new List<int>();
        void Collect(MmNode x)
        {
            if (x.Kind == MmKind.Leaf) leaves.Add(x.Score ?? 0);
            else foreach (var c in x.Children) Collect(c);
        }
        Collect(n);
        return leaves.Count == 0 ? 0.0 : (double)leaves.Sum() / leaves.Count;
    }
}
