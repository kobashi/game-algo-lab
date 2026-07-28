// デモ: algorithms/utility-ai.html
// 空腹・脅威・エネルギーから行動スコアを計算し arg max

public sealed class UtilityAction
{
    public string Id;
    public Func<float, float, float, float> Score; // hunger, threat, energy → score
}

public static class UtilityAi
{
    public static UtilityAction PickBest(
        IEnumerable<UtilityAction> actions,
        float hunger,
        float threat,
        float energy)
    {
        UtilityAction best = null;
        float bestScore = float.NegativeInfinity;
        foreach (var a in actions)
        {
            float s = Math.Max(0f, a.Score(hunger, threat, energy));
            if (s > bestScore)
            {
                bestScore = s;
                best = a;
            }
        }
        return best;
    }

    // Example curves (demo):
    // eat:   h*h * 1.2
    // flee:  t*t * 1.4
    // patrol:(1-t)*0.35 + e*0.25
    // rest:  (1-e)*(1-e)*1.1
}
