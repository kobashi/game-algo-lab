// デモ: algorithms/circle-collision.html
public static class CircleCollision
{
    public static bool Circles(float x1, float y1, float r1, float x2, float y2, float r2)
    {
        float dx = x2 - x1, dy = y2 - y1;
        float rr = r1 + r2;
        return dx * dx + dy * dy <= rr * rr;
    }

    // 円 vs AABB: 円中心から矩形への最近点を Clamp で求める
    public static bool CircleAabb(float cx, float cy, float r, float minX, float minY, float maxX, float maxY)
    {
        float nx = Math.Clamp(cx, minX, maxX);
        float ny = Math.Clamp(cy, minY, maxY);
        float dx = cx - nx, dy = cy - ny;
        return dx * dx + dy * dy <= r * r;
    }
}
