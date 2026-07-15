// Game Algo Lab — 深さ優先探索 (DFS) の C# 実装例
// 受講生向けサンプル。Web デモと 1:1 対応は不要です。
// 再帰呼び出しで探索し、行き止まりで return（バックトラック）します。

using System;
using System.Collections.Generic;

public static class DfsExample
{
    public readonly record struct Cell(int X, int Y);

    // 右 → 下 → 左 → 上（デモと同じ優先順）
    static readonly (int dx, int dy)[] Dirs =
    {
        (1, 0), (0, 1), (-1, 0), (0, -1)
    };

    /// <summary>
    /// 再帰 DFS でスタートからゴールまでの経路を1本見つける。
    /// 最短は保証しない。コールスタックはランタイムが管理する。
    /// </summary>
    public static List<Cell>? FindPath(bool[,] walkable, Cell start, Cell goal)
    {
        int h = walkable.GetLength(0);
        int w = walkable.GetLength(1);
        var visited = new bool[h, w];
        var path = new List<Cell>();

        bool Search(Cell cur)
        {
            // --- 呼び出しフレーム入場 ---
            if (cur.X < 0 || cur.X >= w || cur.Y < 0 || cur.Y >= h)
                return false;
            if (!walkable[cur.Y, cur.X] || visited[cur.Y, cur.X])
                return false;

            visited[cur.Y, cur.X] = true;
            path.Add(cur);

            if (cur.Equals(goal))
                return true; // 成功。スタックを畳みながら戻る

            foreach (var (dx, dy) in Dirs)
            {
                // 再帰呼び出し（ここでコールスタックが1段深くなる）
                if (Search(new Cell(cur.X + dx, cur.Y + dy)))
                    return true;
            }

            // --- バックトラック: 道を外して return ---
            path.RemoveAt(path.Count - 1);
            return false;
        }

        return Search(start) ? path : null;
    }
}
