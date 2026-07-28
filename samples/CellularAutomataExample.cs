// デモ: algorithms/cellular-automata.html
public static class CellularAutomata
{
    // 1=wall. Border counts as wall.
    public static int[,] Step(int[,] g, int birth = 5, int surviveMin = 4)
    {
        int h = g.GetLength(0), w = g.GetLength(1);
        var n = (int[,])g.Clone();
        for (int y = 0; y < h; y++)
        for (int x = 0; x < w; x++)
        {
            int c = CountWallNeighbors(g, x, y);
            n[y, x] = g[y, x] == 1 ? (c >= surviveMin ? 1 : 0) : (c >= birth ? 1 : 0);
        }
        return n;
    }
    static int CountWallNeighbors(int[,] g, int x, int y) { /* 8-neighborhood */ return 0; }
}
