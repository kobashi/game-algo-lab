// Game Algo Lab — シード付き PRNG（Mulberry32 相当のイメージ）
// デモ: algorithms/rng-seed.html
// 本番デモは js/platform/rng.js の mulberry32 を使用。

using System;

public sealed class Mulberry32
{
    private uint _state;

    public Mulberry32(uint seed)
    {
        _state = seed == 0 ? 1u : seed;
    }

    /// <summary>[0, 1) の一様乱数。同じシードから同じ系列。</summary>
    public double NextDouble()
    {
        uint a = _state;
        a += 0x6D2B79F5u;
        _state = a;
        uint t = (a ^ (a >> 15)) * (1u | a);
        t = (t + ((t ^ (t >> 7)) * (61u | t))) ^ t;
        return ((t ^ (t >> 14)) >> 0) / 4294967296.0;
    }

    public int NextInt(int minInclusive, int maxExclusive)
    {
        if (maxExclusive <= minInclusive) return minInclusive;
        return minInclusive + (int)(NextDouble() * (maxExclusive - minInclusive));
    }
}

public static class RngSeedExample
{
    public static double[] Sample(uint seed, int n)
    {
        var rng = new Mulberry32(seed);
        var xs = new double[n];
        for (int i = 0; i < n; i++)
            xs[i] = rng.NextDouble();
        return xs;
    }
}
