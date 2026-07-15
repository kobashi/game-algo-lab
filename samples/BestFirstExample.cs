// Game Algo Lab — 最良優先探索（Greedy Best-First）の C# 実装例
// 受講生向けサンプル。Web デモと 1:1 対応は不要です。
// 優先度 = h（ゴールまでの見積り）のみ。最適は保証しません。

using System;
using System.Collections.Generic;

public static class BestFirstExample
{
    public readonly record struct Cell(int X, int Y);

    /// <summary>
    /// h が最小のノードから展開する最良優先探索。
    /// g は経路コストの記録用で、展開順には使わない。
    /// </summary>
    public static List<Cell>? FindPath(
        bool[,] walkable,
        int[,] cost,
        Cell start,
        Cell goal)
    {
        int rows = walkable.GetLength(0);
        int cols = walkable.GetLength(1);
        int minCost = MinNonNegCost(walkable, cost);

        var open = new List<Cell> { start };
        var openSet = new HashSet<Cell> { start };
        var closed = new HashSet<Cell>();
        var gScore = new Dictionary<Cell, int> { [start] = 0 };
        var parent = new Dictionary<Cell, Cell?> { [start] = null };

        int H(Cell c) =>
            (Math.Abs(c.X - goal.X) + Math.Abs(c.Y - goal.Y)) * minCost;

        ReadOnlySpan<(int dx, int dy)> dirs =
            stackalloc (int, int)[] { (1, 0), (-1, 0), (0, 1), (0, -1) };

        while (open.Count > 0)
        {
            // h 最小を選択
            int bestI = 0;
            for (int i = 1; i < open.Count; i++)
                if (H(open[i]) < H(open[bestI]))
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
                if (next.X < 0 || next.X >= cols || next.Y < 0 || next.Y >= rows)
                    continue;
                if (!walkable[next.Y, next.X] || closed.Contains(next))
                    continue;

                int tentative = gScore[cur] + cost[next.Y, next.X];
                if (gScore.TryGetValue(next, out int old) && tentative >= old)
                    continue;

                parent[next] = cur;
                gScore[next] = tentative; // 記録のみ
                if (openSet.Add(next))
                    open.Add(next);
            }
        }

        return null;
    }

    static int MinNonNegCost(bool[,] walkable, int[,] cost)
    {
        int min = int.MaxValue;
        int h = walkable.GetLength(0);
        int w = walkable.GetLength(1);
        for (int y = 0; y < h; y++)
            for (int x = 0; x < w; x++)
                if (walkable[y, x] && cost[y, x] >= 0)
                    min = Math.Min(min, cost[y, x]);
        return min == int.MaxValue ? 1 : min;
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
