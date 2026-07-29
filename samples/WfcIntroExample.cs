// デモ: algorithms/wfc-intro.html
// 簡易 WFC: エントロピー最小崩壊 + 隣接辺制約の伝播

public sealed class TileDef
{
    public int Id;
    public string[] Edges; // N,E,S,W
    public float Weight;
}

public static class WfcIntro
{
    public static bool EdgesMatch(TileDef a, TileDef b, int dir)
    {
        int opp = (dir + 2) % 4;
        return a.Edges[dir] == b.Edges[opp];
    }

    // wave[y,x] = list of remaining tile ids
    // 1) pick cell with minimal entropy (weighted)
    // 2) collapse to one tile (weighted random)
    // 3) propagate: remove neighbor options that cannot adjoin
    // 4) empty list => contradiction
}
