// デモ: algorithms/net-prediction.html
// 予測: 入力を即時ローカル適用
// 補正: 権威 seq 以降の入力を再適用
public sealed class ClientPrediction
{
    public float PredX, AuthX;
    public List<(int seq, float dx)> Hist = new();

    public void OnInput(int seq, float dx, float speed, float dt)
    {
        PredX += dx * speed * dt;
        Hist.Add((seq, dx));
        // SendInput(seq, dx) → server
    }

    public void OnAuth(int seq, float authX, float speed, float dt)
    {
        AuthX = authX;
        float x = authX;
        foreach (var h in Hist)
            if (h.seq > seq) x += h.dx * speed * dt;
        PredX = x;
    }
}
