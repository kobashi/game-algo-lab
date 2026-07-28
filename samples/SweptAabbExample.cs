// デモ: algorithms/swept-aabb.html
// 相対速度で拡張 AABB とスラブ交差 → 最初の t in [0,1]
public static class SweptAabb
{
    public static bool Sweep(
        float ax, float ay, float aw, float ah,
        float vx, float vy,
        float bx, float by, float bw, float bh,
        out float tEnter)
    {
        // inv entry/exit per axis ...
        tEnter = 0;
        return false;
    }
}
