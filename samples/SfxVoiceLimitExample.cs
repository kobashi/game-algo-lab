// デモ: algorithms/sfx-voice-limit.html
public sealed class VoicePool
{
    public int MaxVoices = 4;
    // On play: if count>=Max then StopOldest() or DropNew()
}
