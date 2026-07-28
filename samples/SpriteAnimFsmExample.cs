// デモ: algorithms/sprite-anim-fsm.html
public enum AnimState { Idle, Run, Jump }

public sealed class SpriteAnimFsm
{
    public AnimState State = AnimState.Idle;
    public int Frame;

    public void OnEvent(string e)
    {
        State = (State, e) switch
        {
            (_, "toIdle") => AnimState.Idle,
            (not AnimState.Jump, "toRun") => AnimState.Run,
            (_, "toJump") => AnimState.Jump,
            (AnimState.Jump, "animEnd") => AnimState.Idle,
            _ => State
        };
        Frame = 0;
    }
}
