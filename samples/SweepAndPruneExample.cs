// デモ: algorithms/sweep-and-prune.html
using System;
using System.Collections.Generic;

public static class SweepAndPrune
{
    public struct Interval { public int Id; public float Min, Max; }

    // X 軸でソートし、active と重なる区間を候補にする
    public static List<(int,int)> BroadX(Interval[] intervals)
    {
        Array.Sort(intervals, (a, b) => a.Min.CompareTo(b.Min));
        var active = new List<Interval>();
        var pairs = new List<(int,int)>();
        foreach (var cur in intervals)
        {
            active.RemoveAll(a => a.Max < cur.Min);
            foreach (var a in active)
                pairs.Add(a.Id < cur.Id ? (a.Id, cur.Id) : (cur.Id, a.Id));
            active.Add(cur);
        }
        return pairs;
    }
}
