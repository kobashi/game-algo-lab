// Game Algo Lab — 迷路生成（Recursive Backtracker）の核
// デモ: algorithms/maze-gen.html

using System;
using System.Collections.Generic;

public sealed class MazeGrid
{
    // true = 壁
    public readonly bool[,] Wall;
    public readonly int Rows, Cols;

    public MazeGrid(int cells)
    {
        // セル数 cells（奇数）→ グリッドは 2*cells+1
        int n = cells % 2 == 0 ? cells + 1 : cells;
        Rows = Cols = n * 2 + 1;
        Wall = new bool[Rows, Cols];
        for (int y = 0; y < Rows; y++)
            for (int x = 0; x < Cols; x++)
                Wall[y, x] = true;
    }

    public void CarvePassage(int cx, int cy)
    {
        Wall[cy, cx] = false;
    }

    public void RemoveWallBetween(int x1, int y1, int x2, int y2)
    {
        Wall[(y1 + y2) / 2, (x1 + x2) / 2] = false;
        Wall[y2, x2] = false;
    }
}

public static class MazeGenExample
{
    static readonly (int dx, int dy)[] Dirs = { (0, -2), (0, 2), (-2, 0), (2, 0) };

    /// <summary>Recursive Backtracker。rng は [0,1) を返す。</summary>
    public static MazeGrid GenerateBacktracker(int cells, Func<double> rng)
    {
        var maze = new MazeGrid(cells);
        int n = maze.Rows;
        // 通路座標は奇数
        var stack = new Stack<(int x, int y)>();
        var visited = new HashSet<(int, int)>();

        int sx = 1, sy = 1;
        maze.CarvePassage(sx, sy);
        visited.Add((sx, sy));
        stack.Push((sx, sy));

        while (stack.Count > 0)
        {
            var (x, y) = stack.Peek();
            var neigh = new List<(int x, int y)>();
            foreach (var (dx, dy) in Dirs)
            {
                int nx = x + dx, ny = y + dy;
                if (nx > 0 && ny > 0 && nx < n && ny < n && !visited.Contains((nx, ny)))
                    neigh.Add((nx, ny));
            }
            if (neigh.Count == 0)
            {
                stack.Pop();
                continue;
            }
            var pick = neigh[(int)(rng() * neigh.Count) % neigh.Count];
            maze.RemoveWallBetween(x, y, pick.x, pick.y);
            visited.Add(pick);
            stack.Push(pick);
        }
        return maze;
    }
}
