// デモ: algorithms/broad-narrow-phase.html
// Broad: 粗い候補（グリッド隣接など）
// Narrow: 精密形状判定（円距離など）

public static class BroadNarrow
{
    // broadPairs: 候補インデックス対
    // narrow: 実際の重なりだけ残す
    public static int NarrowCircles(
        IEnumerable<(int i, int j)> broad,
        float[] x, float[] y, float[] r)
    {
        int hits = 0;
        foreach (var (i, j) in broad)
        {
            float dx = x[j] - x[i], dy = y[j] - y[i];
            float rr = r[i] + r[j];
            if (dx * dx + dy * dy <= rr * rr) hits++;
        }
        return hits;
    }
}
