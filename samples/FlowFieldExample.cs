// デモ: algorithms/flow-field.html
// ゴールから BFS コスト場 → 勾配フロー → エージェントが流れに乗る

public static class FlowField
{
    public static int?[,] BuildCost(bool[,] wall, int gx, int gy)
    {
        int rows = wall.GetLength(0), cols = wall.GetLength(1);
        var cost = new int?[rows, cols];
        if (wall[gy, gx]) return cost;
        var q = new Queue<(int x, int y)>();
        cost[gy, gx] = 0;
        q.Enqueue((gx, gy));
        int[] dx = { 1, -1, 0, 0 }, dy = { 0, 0, 1, -1 };
        while (q.Count > 0)
        {
            var (x, y) = q.Dequeue();
            int d0 = cost[y, x]!.Value;
            for (int i = 0; i < 4; i++)
            {
                int nx = x + dx[i], ny = y + dy[i];
                if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
                if (wall[ny, nx] || cost[ny, nx] != null) continue;
                cost[ny, nx] = d0 + 1;
                q.Enqueue((nx, ny));
            }
        }
        return cost;
    }

    // flow[y,x] = unit vector toward lower-cost neighbor
    public static (float fx, float fy)[,] BuildFlow(int?[,] cost, bool[,] wall)
    {
        int rows = cost.GetLength(0), cols = cost.GetLength(1);
        var flow = new (float, float)[rows, cols];
        // for each free cell: pick neighbor with minimal cost, normalize (dx,dy)
        return flow;
    }
}
