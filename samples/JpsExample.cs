// デモ: algorithms/jps.html
// Jump Point Search（概念）— 一様コスト格子で対称経路を刈り込み

public static class Jps
{
    // jump along (dx,dy) until forced neighbor or goal
    public static (int x, int y)? Jump(
        bool[,] wall, int x, int y, int dx, int dy, int gx, int gy)
    {
        int nx = x + dx, ny = y + dy;
        if (OutOrWall(wall, nx, ny)) return null;
        if (nx == gx && ny == gy) return (nx, ny);
        if (HasForced(wall, x, y, nx, ny, dx, dy)) return (nx, ny);
        // diagonal: also test cardinal jumps
        // then continue: return Jump(wall, nx, ny, dx, dy, gx, gy);
        return null; // see demo JS for full loop
    }

    static bool OutOrWall(bool[,] w, int x, int y) => false;
    static bool HasForced(bool[,] w, int x, int y, int nx, int ny, int dx, int dy) => false;
}
