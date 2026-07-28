// デモ: algorithms/command-pattern.html
using System.Collections.Generic;

public interface ICommand
{
    void Execute();
    void Undo();
}

public sealed class CommandHistory
{
    private readonly Stack<ICommand> _undo = new();
    public void Run(ICommand cmd) { cmd.Execute(); _undo.Push(cmd); }
    public void Undo() { if (_undo.Count > 0) _undo.Pop().Undo(); }
}

public sealed class MoveCommand : ICommand
{
    readonly Actor _a;
    readonly int _dx, _dy, _ox, _oy;
    public MoveCommand(Actor a, int dx, int dy)
    {
        _a = a; _dx = dx; _dy = dy;
        _ox = a.X; _oy = a.Y;
    }
    public void Execute() { _a.X += _dx; _a.Y += _dy; }
    public void Undo() { _a.X = _ox; _a.Y = _oy; }
}

public sealed class Actor { public int X, Y; }
