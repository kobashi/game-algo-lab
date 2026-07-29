// デモ: algorithms/decision-tree.html

public abstract class DtNode
{
    public abstract string Evaluate(float hp, bool enemyNear, int ammo);
}

public sealed class DtCond : DtNode
{
    public Func<float, bool, int, bool> Test;
    public DtNode Yes, No;
    public override string Evaluate(float hp, bool enemyNear, int ammo)
        => (Test(hp, enemyNear, ammo) ? Yes : No).Evaluate(hp, enemyNear, ammo);
}

public sealed class DtLeaf : DtNode
{
    public string Action;
    public override string Evaluate(float hp, bool enemyNear, int ammo) => Action;
}
