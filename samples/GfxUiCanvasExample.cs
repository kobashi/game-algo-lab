// デモ: algorithms/gfx-ui-canvas.html
public static class UiLayout
{
    public static (float x, float y) TopLeft(
        float parentW, float parentH,
        float anchorX, float anchorY,
        float pivotX, float pivotY,
        float offsetX, float offsetY,
        float w, float h)
    {
        float ax = anchorX * parentW;
        float ay = anchorY * parentH;
        return (ax + offsetX - pivotX * w, ay + offsetY - pivotY * h);
    }
}
