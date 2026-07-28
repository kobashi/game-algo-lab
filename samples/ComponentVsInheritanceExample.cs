// デモ: algorithms/component-vs-inheritance.html
// 継承: class FlyingEnemy : Enemy { }
// コンポーネント: entity.Add(new FlyComponent());

using System.Collections.Generic;

public sealed class Entity
{
    readonly Dictionary<string, object> _c = new();
    public void Add(string name, object comp) => _c[name] = comp;
    public bool Has(string name) => _c.ContainsKey(name);
    public void Remove(string name) => _c.Remove(name);
}

// 継承だと「飛べる商人」「撃てない飛行敵」などの組み合わせごとにクラスが増える。
// コンポーネントは能力の集合として表現する。
