// デモ: algorithms/bgm-loop.html
// イントロ1回 → ループ区間を繰り返し
public sealed class BgmLooper
{
    public float IntroSec, LoopSec;
    public float Playhead;

    public void Advance(float dt)
    {
        Playhead += dt;
        float loopStart = IntroSec;
        float loopEnd = IntroSec + LoopSec;
        if (Playhead >= loopEnd)
        {
            float over = Playhead - loopEnd;
            Playhead = loopStart + over % LoopSec;
        }
    }
}
