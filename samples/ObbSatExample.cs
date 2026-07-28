// デモ: algorithms/obb-sat.html
// SAT: 各軸に投影し、1軸でも分離すれば非衝突
public static class ObbSat
{
    public static bool Overlap(float[] axesX, float[] axesY,
        float[] aMin, float[] aMax, float[] bMin, float[] bMax)
    {
        for (int i = 0; i < axesX.Length; i++)
            if (aMax[i] < bMin[i] || bMax[i] < aMin[i]) return false;
        return true;
    }
}
