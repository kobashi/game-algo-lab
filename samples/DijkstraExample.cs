// Game Algo Lab — ダイクストラ法の C# 実装例
// 受講生向けサンプル。Web デモと 1:1 対応は不要です。
// 優先度 = g（スタートからの経路コスト）のみ。

using System;
using System.Collections.Generic;

public static class DijkstraExample
{
    public readonly record struct Cell(int X, int Y);

    /// <summary>
    /// マス進入コスト cost[y,x] を使ったダイクストラ（非負コスト想定）。
    /// </summary>
    public static List<Cell>? FindPath(
        bool[,] walkable,
        int[,] cost,
        Cell start,
        Cell goal)
    {
        int h = walkable.GetLength(0);
        int w = walkable.GetLength(1);

        var open = new List<Cell> { start };
        var openSet = new HashSet<Cell> { start };
        var closed = new HashSet<Cell>();
        var gScore = new Dictionary<Cell, int> { [start] = 0 };
        var parent = new Dictionary<Cell, Cell?> { [start] = null };

        ReadOnlySpan<(int dx, int dy)> dirs =
            stackalloc (int, int)[] { (1, 0), (-1, 0), (0, 1), (0, -1) };

        while (open.Count > 0)
        {
            // g 最小を選択
            int bestI = 0;
            for (int i = 1; i < open.Count; i++)
                if (gScore[open[i]] < gScore[open[bestI]])
                    bestI = i;

            Cell cur = open[bestI];
            open.RemoveAt(bestI);
            openSet.Remove(cur);
            closed.Add(cur);

            if (cur == goal)
                return Reconstruct(parent, goal);

            foreach (var (dx, dy) in dirs)
            {
                var next = new Cell(cur.X + dx, cur.Y + dy);
                if (next.X < 0 || next.X >= w || next.Y < 0 || next.Y >= h)
                    continue;
                if (!walkable[next.Y, next.X] || closed.Contains(next))
                    continue;

                int tentative = gScore[cur] + cost[next.Y, next.X];
                if (gScore.TryGetValue(next, out int old) && tentative >= old)
                    continue;

                parent[next] = cur;
                gScore[next] = tentative;
                if (openSet.Add(next))
                    open.Add(next);
            }
        }

        return null;
    }

    static List<Cell> Reconstruct(Dictionary<Cell, Cell?> parent, Cell goal)
    {
        var path = new List<Cell>();
        Cell? cur = goal;
        while (cur is Cell c)
        {
            path.Add(c);
            cur = parent[c];
        }
        path.Reverse();
        return path;
    }
}
