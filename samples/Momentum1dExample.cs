// デモ: algorithms/momentum-1d.html
public static class Momentum1D
{
    // 弾性: 1D 公式
    public static void Elastic(float m1, float v1, float m2, float v2, out float u1, out float u2)
    {
        float msum = m1 + m2;
        u1 = ((m1 - m2) / msum) * v1 + (2 * m2 / msum) * v2;
        u2 = (2 * m1 / msum) * v1 + ((m2 - m1) / msum) * v2;
    }

    // 完全非弾性: 一体になる
    public static void Inelastic(float m1, float v1, float m2, float v2, out float u)
    {
        u = (m1 * v1 + m2 * v2) / (m1 + m2);
    }
}
