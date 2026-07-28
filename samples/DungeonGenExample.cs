// デモ: algorithms/dungeon-gen.html
using System;
using System.Collections.Generic;

public sealed class Room
{
    public int X, Y, W, H;
    public int Cx => X + W / 2;
    public int Cy => Y + H / 2;
}

public static class DungeonGen
{
    // grid: true = wall
    public static void CarveRoom(bool[,] wall, Room r)
    {
        for (int y = r.Y; y < r.Y + r.H; y++)
        for (int x = r.X; x < r.X + r.W; x++)
            wall[y, x] = false;
    }

    public static void CarveLCorridor(bool[,] wall, int x0, int y0, int x1, int y1, Random rng)
    {
        if (rng.Next(2) == 0)
        {
            CarveH(wall, x0, x1, y0);
            CarveV(wall, y0, y1, x1);
        }
        else
        {
            CarveV(wall, y0, y1, x0);
            CarveH(wall, x0, x1, y1);
        }
    }

    static void CarveH(bool[,] w, int x0, int x1, int y)
    {
        if (x0 > x1) (x0, x1) = (x1, x0);
        for (int x = x0; x <= x1; x++) w[y, x] = false;
    }
    static void CarveV(bool[,] w, int y0, int y1, int x)
    {
        if (y0 > y1) (y0, y1) = (y1, y0);
        for (int y = y0; y <= y1; y++) w[y, x] = false;
    }
}
