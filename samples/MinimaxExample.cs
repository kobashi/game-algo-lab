// Game Algo Lab — Min-Max 探索の核（教材用）
// デモ: algorithms/minimax.html

using System;
using System.Collections.Generic;

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
}
