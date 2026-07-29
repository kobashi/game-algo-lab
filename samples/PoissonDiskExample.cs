// デモ: algorithms/poisson-disk.html — Bridson 風

public static class PoissonDisk
{
    // 1) place first point, active list
    // 2) pick active p, try k candidates in annulus [r,2r]
    // 3) accept if min distance r to all neighbors (grid accel)
    // 4) if no candidate, deactivate p
}
