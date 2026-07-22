// Game Algo Lab — 双方向 BFS（Bidirectional Search）の核
// デモ: algorithms/bidirectional-search.html
//
// 前向き: S から / 後ろ向き: G から（複数ゴールなら全 G を同時に開始）
// 出会点で parent を接合して経路を復元する。

using System;
using System.Collections.Generic;

public static class BidirectionalSearchExample
{
    public readonly record struct Cell(int X, int Y);

    /// <summary>
    /// 無向グリッド上の最少歩数経路（4 近傍）。壁は walkable == false。
    /// </summary>
    public static List<Cell>? FindPath(
        bool[,] walkable,
        Cell start,
        IReadOnlyList<Cell> goals)
    {
        if (goals.Count == 0) return null;

        int h = walkable.GetLength(0);
        int w = walkable.GetLength(1);

        var queueF = new Queue<Cell>();
        var queueB = new Queue<Cell>();
        var parentF = new Dictionary<Cell, Cell?>();
        var parentB = new Dictionary<Cell, Cell?>();
        var seenF = new HashSet<Cell>();
        var seenB = new HashSet<Cell>();

        queueF.Enqueue(start);
        seenF.Add(start);
        parentF[start] = null;

        foreach (var g in goals)
        {
            if (!seenB.Add(g)) continue;
            queueB.Enqueue(g);
            parentB[g] = null;
        }

        // スタートがゴール集合に含まれる
        if (seenB.Contains(start))
            return new List<Cell> { start };

        ReadOnlySpan<(int dx, int dy)> dirs =
            stackalloc (int, int)[] { (1, 0), (-1, 0), (0, 1), (0, -1) };

        while (queueF.Count > 0 && queueB.Count > 0)
        {
            // 小さいフロンティア側を優先
            bool expandForward = queueF.Count <= queueB.Count;
            Cell? meet = expandForward
                ? Expand(queueF, seenF, parentF, seenB, walkable, w, h, dirs)
                : Expand(queueB, seenB, parentB, seenF, walkable, w, h, dirs);

            if (meet is Cell m)
                return JoinPath(parentF, parentB, m, goals);
        }

        return null;
    }

    static Cell? Expand(
        Queue<Cell> queue,
        HashSet<Cell> seenSelf,
        Dictionary<Cell, Cell?> parentSelf,
        HashSet<Cell> seenOther,
        bool[,] walkable,
        int w,
        int h,
        ReadOnlySpan<(int dx, int dy)> dirs)
    {
        if (queue.Count == 0) return null;
        Cell cur = queue.Dequeue();

        foreach (var (dx, dy) in dirs)
        {
            var next = new Cell(cur.X + dx, cur.Y + dy);
            if (next.X < 0 || next.X >= w || next.Y < 0 || next.Y >= h)
                continue;
            if (!walkable[next.Y, next.X]) continue;
            if (!seenSelf.Add(next)) continue;

            parentSelf[next] = cur;
            if (seenOther.Contains(next))
                return next;
            queue.Enqueue(next);
        }
        return null;
    }

    static List<Cell> JoinPath(
        Dictionary<Cell, Cell?> parentF,
        Dictionary<Cell, Cell?> parentB,
        Cell meet,
        IReadOnlyList<Cell> goals)
    {
        var front = new List<Cell>();
        Cell? c = meet;
        while (c is Cell x)
        {
            front.Add(x);
            c = parentF.TryGetValue(x, out var p) ? p : null;
        }
        front.Reverse(); // S … meet

        var back = new List<Cell>();
        c = parentB.TryGetValue(meet, out var pb) ? pb : null;
        while (c is Cell y)
        {
            back.Add(y);
            c = parentB.TryGetValue(y, out var p2) ? p2 : null;
        }
        // meet は front 末尾済み。back は meet の親から G へ
        front.AddRange(back);
        return front;
    }
}
