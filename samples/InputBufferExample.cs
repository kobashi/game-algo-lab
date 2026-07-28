// デモ: algorithms/input-buffer.html
public sealed class JumpBuffer
{
    public float WindowSeconds { get; set; } = 0.15f;
    float _left;

    public void OnJumpPressed(bool grounded, Action doJump)
    {
        if (grounded) { doJump(); _left = 0; }
        else _left = WindowSeconds;
    }

    public void Update(float dt, bool grounded, Action doJump)
    {
        if (_left > 0) _left = Math.Max(0, _left - dt);
        if (grounded && _left > 0) { doJump(); _left = 0; }
    }
}
