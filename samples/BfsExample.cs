// Game Algo Lab — BFS（幅優先探索）の C# 実装例
// 受講生向けサンプル。Web デモと 1:1 対応している必要はありません。
// グリッド最短歩数（4 近傍）を Queue と HashSet で求めるイメージです。

using System;
using System.Collections.Generic;

public static class BfsExample
{
    public readonly record struct Cell(int X, int Y);

    /// <summary>
    /// スタートからゴールまでの最少歩数経路を BFS で求める。
    /// 壁は walkable == false。通行コストは見ない（歩数のみ）。
    /// </summary>
    public static List<Cell>? FindPath(
        bool[,] walkable,
        Cell start,
        Cell goal)
    {
        int h = walkable.GetLength(0);
        int w = walkable.GetLength(1);

        var queue = new Queue<Cell>();          // フロンティア
        var visited = new HashSet<Cell>();      // 探索済み
        var parent = new Dictionary<Cell, Cell?>(); // 経路復元用

        queue.Enqueue(start);
        visited.Add(start);
        parent[start] = null;

        // 4 近傍（右・左・下・上）
        ReadOnlySpan<(int dx, int dy)> dirs =
            stackalloc (int, int)[] { (1, 0), (-1, 0), (0, 1), (0, -1) };

        while (queue.Count > 0)
        {
            Cell cur = queue.Dequeue();

            if (cur == goal)
                return Reconstruct(parent, goal);

            foreach (var (dx, dy) in dirs)
            {
                var next = new Cell(cur.X + dx, cur.Y + dy);
                if (next.X < 0 || next.X >= w || next.Y < 0 || next.Y >= h)
                    continue;
                if (!walkable[next.Y, next.X])
                    continue;
                if (visited.Contains(next))
                    continue;

                visited.Add(next);
                parent[next] = cur;
                queue.Enqueue(next);
            }
        }

        return null; // 到達不可
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
