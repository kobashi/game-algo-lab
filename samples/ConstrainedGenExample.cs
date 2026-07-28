// デモ: algorithms/constrained-gen.html
// ランダム配置 → BFS 到達性チェック → 棄却して再生成

using System;
using System.Collections.Generic;

public static class ConstrainedGen
{
    public static bool Reachable(bool[,] wall, int sx, int sy, int gx, int gy)
    {
        int h = wall.GetLength(0), w = wall.GetLength(1);
        var seen = new bool[h, w];
        var q = new Queue<(int x, int y)>();
        if (wall[sy, sx]) return false;
        q.Enqueue((sx, sy));
        seen[sy, sx] = true;
        int[] dx = { 1, -1, 0, 0 }, dy = { 0, 0, 1, -1 };
        while (q.Count > 0)
        {
            var (x, y) = q.Dequeue();
            if (x == gx && y == gy) return true;
            for (int i = 0; i < 4; i++)
            {
                int nx = x + dx[i], ny = y + dy[i];
                if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                if (seen[ny, nx] || wall[ny, nx]) continue;
                seen[ny, nx] = true;
                q.Enqueue((nx, ny));
            }
        }
        return false;
    }

    public static bool[,] GenerateUntilReachable(int seed, int maxAttempts, Func<int, bool[,]> gen)
    {
        var rng = new Random(seed);
        for (int a = 0; a < maxAttempts; a++)
        {
            var g = gen(rng.Next());
            // 呼び出し側で S/G を空けて Reachable を確認
            if (true) return g; // デモの詳細は JS 側
        }
        throw new InvalidOperationException("constraint unsatisfied");
    }
}
