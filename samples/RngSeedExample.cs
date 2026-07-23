// Game Algo Lab — シード付き PRNG（Mulberry32 / XorShift32 / LCG）
// デモ: algorithms/rng-seed.html

using System;

public interface IUnitRng
{
    /// <summary>[0, 1) の次の値</summary>
    double NextDouble();
}

/// <summary>サイト標準（js/platform/rng.js 相当）</summary>
public sealed class Mulberry32 : IUnitRng
{
    private uint _state;
    public Mulberry32(uint seed) => _state = seed == 0 ? 1u : seed;

    public double NextDouble()
    {
        uint a = _state;
        a += 0x6D2B79F5u;
        _state = a;
        uint t = (a ^ (a >> 15)) * (1u | a);
        t = (t + ((t ^ (t >> 7)) * (61u | t))) ^ t;
        return (t ^ (t >> 14)) / 4294967296.0;
    }
}

/// <summary>
/// XorShift32: x ^= x&lt;&lt;a; x ^= x&gt;&gt;b; x ^= x&lt;&lt;c（符号なし）。
/// 標準は Marsaglia (13,17,5)。seed=0 は全ゼロ固定点。
/// </summary>
public sealed class XorShift32 : IUnitRng
{
    private uint _x;
    private readonly int _a, _b, _c;

    public XorShift32(uint seed, int a = 13, int b = 17, int c = 5)
    {
        _x = seed == 0 ? 0x9E3779B9u : seed;
        _a = a;
        _b = b;
        _c = c;
    }

    public double NextDouble()
    {
        uint x = _x;
        x ^= x << _a;
        x ^= x >> _b;
        x ^= x << _c;
        _x = x;
        return x / 4294967296.0;
    }
}

/// <summary>線形合同法 X' = (a·X + c) mod m。u = X/m。</summary>
public sealed class Lcg : IUnitRng
{
    private ulong _x;
    private readonly ulong _a, _c, _m;

    public Lcg(ulong seed, ulong a, ulong c, ulong m)
    {
        if (m < 2) throw new ArgumentOutOfRangeException(nameof(m));
        _a = a;
        _c = c;
        _m = m;
        _x = seed % m;
    }

    public double NextDouble()
    {
        _x = (_a * _x + _c) % _m;
        return _x / (double)_m;
    }

    /// <summary>初期状態に戻るまでの長さ（教材用・m が小さいとき）</summary>
    public static int MeasurePeriod(ulong seed, ulong a, ulong c, ulong m, int maxScan)
    {
        ulong x0 = seed % m;
        ulong x = x0;
        var seen = new System.Collections.Generic.Dictionary<ulong, int>();
        seen[x] = 0;
        for (int i = 1; i <= maxScan; i++)
        {
            x = (a * x + c) % m;
            if (seen.TryGetValue(x, out int first))
                return i - first;
            seen[x] = i;
        }
        return -1;
    }
}
