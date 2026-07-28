// デモ: algorithms/brute-force-pairs.html
public static class BruteForcePairs
{
    // 円のリストに対し全ペア検査。checks = n*(n-1)/2
    public static int CountOverlaps(float[] x, float[] y, float[] r, out int checks)
    {
        int n = x.Length, hits = 0;
        checks = 0;
        for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++)
        {
            checks++;
            float dx = x[j] - x[i], dy = y[j] - y[i];
            float rr = r[i] + r[j];
            if (dx * dx + dy * dy <= rr * rr) hits++;
        }
        return hits;
    }
}
