// Game Algo Lab — A* 探索の C# 実装例
// 受講生向けサンプル。Web デモと 1:1 対応している必要はありません。
// f = g + h が最小のノードから展開するイメージです（コストは非負を想定）。

using System;
using System.Collections.Generic;

public static class AStarExample
{
    public readonly record struct Cell(int X, int Y);

    /// <summary>
    /// マス進入コスト cost[y,x] を使った A*。
    /// walkable が false のマスは壁。h はマンハッタン × minCost。
    /// </summary>
    public static List<Cell>? FindPath(
        bool[,] walkable,
        int[,] cost,
        Cell start,
        Cell goal)
    {
        int h = walkable.GetLength(0);
        int w = walkable.GetLength(1);
        int minCost = MinPositiveCost(walkable, cost);

        // オープン: f 最小を都度選ぶ（教材用の単純実装。本番は PriorityQueue 推奨）
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
            // f = g + h が最小の要素を選択
            int bestI = 0;
            int bestF = gScore[open[0]] + H(open[0]);
            for (int i = 1; i < open.Count; i++)
            {
                int f = gScore[open[i]] + H(open[i]);
                if (f < bestF)
                {
                    bestF = f;
                    bestI = i;
                }
            }

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

                int step = cost[next.Y, next.X];
                int tentative = gScore[cur] + step;

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

    static int MinPositiveCost(bool[,] walkable, int[,] cost)
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
