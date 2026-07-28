// デモ: algorithms/concave-compound.html
// 凹形状 = 複数凸 AABB の複合。点判定は部品 OR。
public static class CompoundCollider
{
    public static bool PointInAnyAabb(float px, float py, (float x,float y,float w,float h)[] parts)
    {
        foreach (var p in parts)
            if (px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h) return true;
        return false;
    }
}
