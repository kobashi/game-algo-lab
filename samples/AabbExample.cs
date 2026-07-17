// Game Algo Lab — AABB 衝突判定（2 通りの書き方）
// デモ: algorithms/collision.html
//
// 教材ポイント:
//   A. ポジティブ（重なり判定）…「両軸で重なる」ことを積み上げる
//   B. ネガティブ（分離判定）  …「どちらかの軸で分離していれば非衝突」
// 論理的にはド・モルガンで同値。実装の読みやすさ・早期 return のしやすさが違う。

using System;

/// <summary>軸に平行な矩形。</summary>
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
    // ------------------------------------------------------------------
    // A. ポジティブ判定（重なりを AND で積み上げる）
    //    比較 4 回 + 論理 AND 3 回（軸内 2 + 軸間 1）
    // ------------------------------------------------------------------

    /// <summary>
    /// X で重なり かつ Y で重なり ⇒ 衝突。
    /// </summary>
    public static bool IntersectsPositive(in Aabb a, in Aabb b)
    {
        bool overlapX = a.MaxX >= b.MinX && a.MinX <= b.MaxX;
        bool overlapY = a.MaxY >= b.MinY && a.MinY <= b.MaxY;
        return overlapX && overlapY;
    }

    // ------------------------------------------------------------------
    // B. ネガティブ判定（分離していれば非衝突）
    //    比較 4 回 + 論理 OR 2 回 + NOT 1（または早期 return）
    //    「分離している」方が短絡評価で早く抜けやすい書き方にもできる
    // ------------------------------------------------------------------

    /// <summary>
    /// X で分離 または Y で分離 ⇒ 非衝突。それ以外が衝突。
    /// separatedX = A が B の左 or 右、separatedY = 上 or 下。
    /// </summary>
    public static bool IntersectsNegative(in Aabb a, in Aabb b)
    {
        bool separatedX = a.MaxX < b.MinX || a.MinX > b.MaxX;
        bool separatedY = a.MaxY < b.MinY || a.MinY > b.MaxY;
        return !(separatedX || separatedY);
        // ド・モルガン: !separatedX && !separatedY と同じ
    }

    /// <summary>
    /// ネガティブ判定の早期 return 版（ゲーム実装でよく見る形）。
    /// 1 軸でも分離が分かった時点で false を返せる。
    /// </summary>
    public static bool IntersectsNegativeEarlyOut(in Aabb a, in Aabb b)
    {
        if (a.MaxX < b.MinX) return false; // A が B の左
        if (a.MinX > b.MaxX) return false; // A が B の右
        if (a.MaxY < b.MinY) return false; // A が B の上（Y 下向きなら下）
        if (a.MinY > b.MaxY) return false; // A が B の下
        return true;
    }

    /// <summary>教材用: 両方式の途中結果をまとめて返す。</summary>
    public static void Compare(
        in Aabb a,
        in Aabb b,
        out bool overlapX,
        out bool overlapY,
        out bool separatedX,
        out bool separatedY,
        out bool positive,
        out bool negative)
    {
        overlapX = a.MaxX >= b.MinX && a.MinX <= b.MaxX;
        overlapY = a.MaxY >= b.MinY && a.MinY <= b.MaxY;
        separatedX = a.MaxX < b.MinX || a.MinX > b.MaxX;
        separatedY = a.MaxY < b.MinY || a.MinY > b.MaxY;
        positive = overlapX && overlapY;
        negative = !(separatedX || separatedY);
        // 常に positive == negative（境界 inclusive の定義を揃えた場合）
    }
}
