// デモ: algorithms/ecs-intro.html
// Entity = int id
// Components in sparse/dense stores
// Systems iterate matching entities

public sealed class World
{
    public int Create() => /* next id */ 0;
    public void Add<T>(int e, T c) { }
    public void RunMoveSystem(float dt) { /* all with Transform+Velocity */ }
}
