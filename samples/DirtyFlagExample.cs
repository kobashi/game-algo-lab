// デモ: algorithms/dirty-flag.html
public sealed class TransformNode
{
    public float LocalRot;
    public float WorldRot;
    public bool Dirty = true;
    public TransformNode Parent;

    public void SetLocalRot(float r)
    {
        LocalRot = r;
        MarkDirty(); // cascade to children
    }

    public void EnsureWorld()
    {
        if (!Dirty) return;
        float p = Parent?.WorldRot ?? 0;
        WorldRot = p + LocalRot;
        Dirty = false;
    }

    void MarkDirty() { Dirty = true; /* children too */ }
}
