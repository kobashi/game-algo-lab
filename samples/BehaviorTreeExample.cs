// デモ: algorithms/behavior-tree.html
public enum Status { Success, Failure, Running }

public abstract class BtNode
{
    public abstract Status Tick(Blackboard bb);
}

public sealed class Selector : BtNode
{
    public BtNode[] Children = Array.Empty<BtNode>();
    public override Status Tick(Blackboard bb)
    {
        foreach (var c in Children)
        {
            var s = c.Tick(bb);
            if (s != Status.Failure) return s;
        }
        return Status.Failure;
    }
}

public sealed class Sequence : BtNode
{
    public BtNode[] Children = Array.Empty<BtNode>();
    public override Status Tick(Blackboard bb)
    {
        foreach (var c in Children)
        {
            var s = c.Tick(bb);
            if (s != Status.Success) return s;
        }
        return Status.Success;
    }
}

public sealed class Blackboard
{
    public bool CanSeePlayer;
    // ...
}
