// Game Algo Lab — 重み付き抽選
// デモ: algorithms/weighted-random.html

using System;

public static class WeightedRandomExample
{
    /// <summary>累積重み法。rng は [0,1)。weights の和 > 0。</summary>
    public static int PickIndex(double[] weights, Func<double> rng)
    {
        double sum = 0;
        for (int i = 0; i < weights.Length; i++) sum += Math.Max(0, weights[i]);
        if (sum <= 0) return 0;
        double r = rng() * sum;
        double acc = 0;
        for (int i = 0; i < weights.Length; i++)
        {
            acc += Math.Max(0, weights[i]);
            if (r < acc) return i;
        }
        return weights.Length - 1;
    }

    /// <summary>Fisher–Yates シャッフル（in-place）</summary>
    public static void Shuffle<T>(T[] a, Func<double> rng)
    {
        for (int i = a.Length - 1; i > 0; i--)
        {
            int j = (int)(rng() * (i + 1));
            (a[i], a[j]) = (a[j], a[i]);
        }
    }
}
