// Game Algo Lab — α-β 法の核（教材用）
// デモ: algorithms/alpha-beta.html

using System;
using System.Collections.Generic;

public enum AbKind
{
    Max,
    Min,
    Leaf
}

public sealed class AbNode
{
    public string Id { get; }
    public string Label { get; }
    public AbKind Kind { get; }
    public int? Score { get; }
    public List<AbNode> Children { get; } = new();

    public AbNode(string id, string label, AbKind kind, int? score = null)
    {
        Id = id;
        Label = label;
        Kind = kind;
        Score = score;
    }
}

public static class AlphaBeta
{
    /// <summary>
    /// α-β 付き Minimax。返す値は素の Minimax と同じ。
    /// 根: Evaluate(root, int.MinValue, int.MaxValue)
    /// </summary>
    public static int Evaluate(AbNode n, int alpha, int beta)
    {
        if (n.Kind == AbKind.Leaf)
            return n.Score ?? 0;

        if (n.Kind == AbKind.Max)
        {
            int v = int.MinValue;
            foreach (var child in n.Children)
            {
                v = Math.Max(v, Evaluate(child, alpha, beta));
                if (v >= beta)
                    return v; // β カット
                alpha = Math.Max(alpha, v);
            }
            return v;
        }

        // Min
        {
            int v = int.MaxValue;
            foreach (var child in n.Children)
            {
                v = Math.Min(v, Evaluate(child, alpha, beta));
                if (v <= alpha)
                    return v; // α カット
                beta = Math.Min(beta, v);
            }
            return v;
        }
    }
}
