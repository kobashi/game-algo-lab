// デモ: algorithms/uniform-grid.html
using System.Collections.Generic;

public static class UniformGrid
{
    // cell -> list of body indices
    public static Dictionary<(int,int), List<int>> Build(
        float[] x, float[] y, float cell)
    {
        var map = new Dictionary<(int,int), List<int>>();
        for (int i = 0; i < x.Length; i++)
        {
            int cx = (int)Math.Floor(x[i] / cell);
            int cy = (int)Math.Floor(y[i] / cell);
            var key = (cx, cy);
            if (!map.TryGetValue(key, out var list))
            {
                list = new List<int>();
                map[key] = list;
            }
            list.Add(i);
        }
        return map;
    }
}
