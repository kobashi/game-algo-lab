// デモ: algorithms/grid-pseudo-physics.html
// マス単位の落下。連続速度は持たない。

public static class GridPseudoPhysics
{
    // grid[y,x]: 0 empty, 1 solid, 2 sand
    public static void StepFall(int[,] grid)
    {
        int h = grid.GetLength(0), w = grid.GetLength(1);
        for (int y = h - 2; y >= 0; y--)
        for (int x = 0; x < w; x++)
        {
            if (grid[y, x] != 2) continue;
            if (grid[y + 1, x] == 0)
            {
                grid[y + 1, x] = 2;
                grid[y, x] = 0;
            }
        }
    }
}
