// デモ: algorithms/object-pool.html
using System.Collections.Generic;

public sealed class ObjectPool<T> where T : class, new()
{
    private readonly Stack<T> _free = new();
    public int Created { get; private set; }
    public int Reused { get; private set; }

    public T Acquire()
    {
        if (_free.Count > 0)
        {
            Reused++;
            return _free.Pop();
        }
        Created++;
        return new T();
    }

    public void Release(T obj) => _free.Push(obj);
}
