// デモ: algorithms/quadtree.html
using System.Collections.Generic;

public sealed class Quadtree
{
    public float X, Y, W, H;
    public int Capacity, Depth, MaxDepth;
    public List<(float x, float y)> Points = new();
    public Quadtree[]? Children; // NW NE SW SE

    public bool Insert(float px, float py)
    {
        if (px < X || py < Y || px >= X + W || py >= Y + H) return false;
        if (Children == null && (Points.Count < Capacity || Depth >= MaxDepth))
        {
            Points.Add((px, py));
            return true;
        }
        if (Children == null) Subdivide();
        foreach (var c in Children!) if (c.Insert(px, py)) return true;
        return false;
    }

    void Subdivide()
    {
        float hw = W / 2, hh = H / 2;
        Children = new[]
        {
            new Quadtree { X=X, Y=Y, W=hw, H=hh, Capacity=Capacity, Depth=Depth+1, MaxDepth=MaxDepth },
            new Quadtree { X=X+hw, Y=Y, W=hw, H=hh, Capacity=Capacity, Depth=Depth+1, MaxDepth=MaxDepth },
            new Quadtree { X=X, Y=Y+hh, W=hw, H=hh, Capacity=Capacity, Depth=Depth+1, MaxDepth=MaxDepth },
            new Quadtree { X=X+hw, Y=Y+hh, W=hw, H=hh, Capacity=Capacity, Depth=Depth+1, MaxDepth=MaxDepth },
        };
        foreach (var p in Points)
            foreach (var c in Children) if (c.Insert(p.x, p.y)) break;
        Points.Clear();
    }
}
