// デモ: algorithms/navmesh-intro.html
// ポリゴン中心グラフ上の A* + 簡易 string pull（直線ショートカット）

public sealed class NavPoly
{
    public int Id;
    public Vector2[] Verts;
    public Vector2 Centroid => Average(Verts);
}

public static class NavmeshIntro
{
    // undirected adjacency between poly ids
    public static List<int> PathPolys(
        Dictionary<int, NavPoly> polys,
        List<(int a, int b)> adj,
        int startId,
        int goalId)
    {
        // A* on poly graph (distance between centroids as cost / heuristic)
        // returns list of poly ids startId → … → goalId
        throw new NotImplementedException("see demo JS: poly A*");
    }

    public static List<Vector2> StringPull(List<Vector2> corridor)
    {
        // greedy: skip intermediate points while segment is clear of obstacles
        var outPath = new List<Vector2> { corridor[0] };
        int i = 0;
        while (i < corridor.Count - 1)
        {
            int best = i + 1;
            for (int j = corridor.Count - 1; j > i + 1; j--)
            {
                if (SegmentClear(corridor[i], corridor[j]))
                {
                    best = j;
                    break;
                }
            }
            outPath.Add(corridor[best]);
            i = best;
        }
        return outPath;
    }

    static bool SegmentClear(Vector2 a, Vector2 b) => true; // demo: LOS in mesh
    static Vector2 Average(Vector2[] v) => default;
}
