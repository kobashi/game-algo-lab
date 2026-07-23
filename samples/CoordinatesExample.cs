// Game Algo Lab — 2D 座標変換（ローカル / ワールド / スクリーン）
// デモ: algorithms/coordinates.html

using System;

public readonly record struct Vec2(double X, double Y)
{
    public static Vec2 operator +(Vec2 a, Vec2 b) => new(a.X + b.X, a.Y + b.Y);
    public static Vec2 operator -(Vec2 a, Vec2 b) => new(a.X - b.X, a.Y - b.Y);
    public static Vec2 operator *(Vec2 a, double s) => new(a.X * s, a.Y * s);
}

public static class CoordinatesExample
{
    public static Vec2 Rotate(Vec2 v, double angleRad)
    {
        double c = Math.Cos(angleRad);
        double s = Math.Sin(angleRad);
        return new Vec2(v.X * c - v.Y * s, v.X * s + v.Y * c);
    }

    /// <summary>ローカル点 → ワールド（親の位置・回転）</summary>
    public static Vec2 LocalToWorld(Vec2 local, Vec2 parentPos, double parentAngleRad)
        => Rotate(local, parentAngleRad) + parentPos;

    /// <summary>ワールド点 → 親ローカル</summary>
    public static Vec2 WorldToLocal(Vec2 world, Vec2 parentPos, double parentAngleRad)
        => Rotate(world - parentPos, -parentAngleRad);

    /// <summary>ワールド → スクリーン（平行移動 + 一様スケール）</summary>
    public static Vec2 WorldToScreen(
        Vec2 world,
        Vec2 cameraPos,
        double zoom,
        Vec2 screenCenter)
        => (world - cameraPos) * zoom + screenCenter;

    /// <summary>スクリーン → ワールド</summary>
    public static Vec2 ScreenToWorld(
        Vec2 screen,
        Vec2 cameraPos,
        double zoom,
        Vec2 screenCenter)
        => (screen - screenCenter) * (1.0 / zoom) + cameraPos;
}
