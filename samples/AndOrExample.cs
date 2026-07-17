// Game Algo Lab — AND-OR 探索の核（教材用・完全なゲームロジックではない）
// デモ: algorithms/and-or.html

using System;
using System.Collections.Generic;

public enum NodeKind
{
    Or,   // どれか1つ成功すればよい
    And,  // すべて成功が必要
    Leaf  // 終端（成功 or 失敗が決まっている）
}

public sealed class AndOrNode
{
    public string Id { get; }
    public string Label { get; }
    public NodeKind Kind { get; }
    public bool? LeafValue { get; } // Leaf のときだけ使用
    public List<AndOrNode> Children { get; } = new();

    public AndOrNode(string id, string label, NodeKind kind, bool? leafValue = null)
    {
        Id = id;
        Label = label;
        Kind = kind;
        LeafValue = leafValue;
    }
}

public static class AndOrSearch
{
    /// <summary>
    /// 節点 n が「解ける」か（真偽）。
    /// OR: 子のいずれかが true / AND: すべての子が true / Leaf: 固定値
    /// </summary>
    public static bool Solve(AndOrNode n)
    {
        if (n.Kind == NodeKind.Leaf)
            return n.LeafValue ?? false;

        if (n.Kind == NodeKind.Or)
        {
            foreach (var child in n.Children)
            {
                if (Solve(child))
                    return true;
            }
            return false;
        }

        // And
        foreach (var child in n.Children)
        {
            if (!Solve(child))
                return false;
        }
        return true;
    }

    // 利用例:
    // var root = BuildDungeonTree();
    // bool canClear = Solve(root);
}
