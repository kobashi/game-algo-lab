// デモ: algorithms/rotational-motion.html
// α = τ / I,  ω += α·dt,  θ += ω·dt
// τ = r_x * F_y - r_y * F_x  (2D クロス)
public sealed class RigidBody2D
{
    public float X, Y, Vx, Vy, Angle, Omega;
    public float Mass, Inertia;

    public void ApplyForceAt(float fx, float fy, float px, float py, float dt)
    {
        Vx += fx / Mass * dt;
        Vy += fy / Mass * dt;
        float rx = px - X, ry = py - Y;
        float torque = rx * fy - ry * fx;
        Omega += torque / Inertia * dt;
    }
}
