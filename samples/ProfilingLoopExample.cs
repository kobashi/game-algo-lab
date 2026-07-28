// デモ: algorithms/profiling-loop.html
// Measure → change algorithm → Measure again
public sealed class FrameProfile
{
    public double UpdateMs, CollideMs, DrawMs;
    public double Total => UpdateMs + CollideMs + DrawMs;
}
