// デモ: algorithms/coyote-time.html
// 接地を離れた直後の短い猶予でもジャンプを許可する。

public sealed class CoyoteJump
{
    public float CoyoteSeconds { get; set; } = 0.12f;
    float _coyoteLeft;
    public bool Grounded { get; set; }

    public void Update(float dt)
    {
        if (Grounded) _coyoteLeft = CoyoteSeconds;
        else _coyoteLeft = Math.Max(0, _coyoteLeft - dt);
    }

    public bool TryJump(bool jumpPressedEdge, bool useCoyote)
    {
        bool ok = Grounded || (useCoyote && _coyoteLeft > 0);
        if (!jumpPressedEdge || !ok) return false;
        Grounded = false;
        _coyoteLeft = 0;
        return true; // 呼び出し側で vy = jumpSpeed
    }
}
