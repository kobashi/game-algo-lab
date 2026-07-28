// デモ: algorithms/bvh-overview.html
// 葉 = 各オブジェクト AABB、親 = 子の合併 AABB（ボトムアップ）
public sealed class BvhNode
{
    public float MinX, MinY, MaxX, MaxY;
    public int LeafId = -1; // >=0 なら葉
    public BvhNode? L, R;
}
