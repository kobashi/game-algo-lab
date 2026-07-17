// Game Algo Lab — AABB（軸平行バウンディングボックス）衝突判定の核
// デモ: algorithms/collision.html

using System;

/// <summary>軸に平行な矩形。座標系は min が左下または左上どちらでもよい（一貫していればよい）。</summary>
public readonly struct Aabb
{
    public float MinX { get; }
    public float MinY { get; }
    public float MaxX { get; }
    public float MaxY { get; }

    public Aabb(float minX, float minY, float maxX, float maxY)
    {
        MinX = minX;
        MinY = minY;
        MaxX = maxX;
        MaxY = maxY;
    }

    public static Aabb FromPosSize(float x, float y, float w, float h) =>
        new Aabb(x, y, x + w, y + h);
}

public static class AabbCollision
{
    /// <summary>
    /// 2 つの AABB が重なる（境界を含む）か。
    /// 本質: X 軸の区間が重なり、かつ Y 軸の区間も重なる。
    /// </summary>
    public static bool Intersects(in Aabb a, in Aabb b)
    {
        bool overlapX = a.MaxX >= b.MinX && a.MinX <= b.MaxX;
        bool overlapY = a.MaxY >= b.MinY && a.MinY <= b.MaxY;
        return overlapX && overlapY;
    }

    /// <summary>教材用: 軸ごとの判定結果も返す。</summary>
    public static void IntersectsDetailed(
        in Aabb a,
        in Aabb b,
        out bool overlapX,
        out bool overlapY,
        out bool colliding)
    {
        overlapX = a.MaxX >= b.MinX && a.MinX <= b.MaxX;
        overlapY = a.MaxY >= b.MinY && a.MinY <= b.MaxY;
        colliding = overlapX && overlapY;
    }
}
