// デモ: algorithms/net-p2p-demo.html
// 疑似ネット: delay / drop / reorder キュー
public sealed class FakeNet
{
    public int LatencyMs, JitterMs;
    public float DropRate, ReorderRate;
    // Enqueue(packet); tick clock; deliver ready packets
}
