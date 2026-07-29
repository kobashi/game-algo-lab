// デモ: algorithms/influence-map.html

public static class InfluenceMap
{
    // field[y,x] += strength * exp(-decay * dist)  (threat + / interest -)
    public static float[,] Build(
        int cols, int rows,
        (int x, int y, float strength, bool threat)[] sources,
        float decay)
    {
        var f = new float[rows, cols];
        for (int y = 0; y < rows; y++)
            for (int x = 0; x < cols; x++)
                foreach (var s in sources)
                {
                    float d = MathF.Sqrt((x - s.x) * (x - s.x) + (y - s.y) * (y - s.y));
                    float c = s.strength * MathF.Exp(-decay * d);
                    f[y, x] += s.threat ? c : -c;
                }
        return f;
    }
}
