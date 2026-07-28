// デモ: algorithms/net-sync-modes.html
// state: send position snapshot
// input: send dx only; both sides simulate
public enum SyncMode { State, Input }

public static class SyncPackets
{
    public static int ApproxBytes(SyncMode m) => m == SyncMode.State ? 12 : 6;
}
