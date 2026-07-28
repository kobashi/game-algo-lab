// デモ: algorithms/replay-determinism.html
// 同一 seed + 同一入力列 → 同一軌跡
public sealed class InputFrame
{
    public bool Left, Right, Jump;
}

public sealed class Replay
{
    public int Seed;
    public List<InputFrame> Frames = new();
    // playback: rng = new(Seed); foreach frame simulate(frame, rng)
}
