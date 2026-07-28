// デモ: algorithms/sfx-randomize.html
// pitch *= 1 + (rng-0.5)*pitchRange
// shuffle bag: refill when empty, avoid immediate repeat
public static class SfxRandom
{
    public static float Pitch(Random r, float range) => 1f + ((float)r.NextDouble() - 0.5f) * range;
}
