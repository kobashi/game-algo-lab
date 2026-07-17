// Game Algo Lab — モンテカルロ評価（ランダムプレイアウト平均）の核
// デモ: algorithms/monte-carlo.html

using System;
using System.Collections.Generic;

public enum McKind
{
    Max,
    Min,
    Leaf
}

public sealed class McNode
{
    public string Id { get; }
    public string Label { get; }
    public McKind Kind { get; }
    public int? Score { get; }
    public List<McNode> Children { get; } = new();

    public McNode(string id, string label, McKind kind, int? score = null)
    {
        Id = id;
        Label = label;
        Kind = kind;
        Score = score;
    }
}

public static class MonteCarloEval
{
    /// <summary>
    /// 根から葉まで子を一様ランダムに選び、葉のスコアを N 回平均する。
    /// ※ 最善プレイ前提の Minimax 値とは一般に一致しない。
    /// </summary>
    public static double Estimate(McNode root, int n, Random rng)
    {
        if (n <= 0) throw new ArgumentOutOfRangeException(nameof(n));
        double sum = 0;
        for (int i = 0; i < n; i++)
            sum += Playout(root, rng);
        return sum / n;
    }

    public static int Playout(McNode n, Random rng)
    {
        while (n.Kind != McKind.Leaf)
        {
            int i = rng.Next(n.Children.Count);
            n = n.Children[i];
        }
        return n.Score ?? 0;
    }
}
