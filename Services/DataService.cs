using Audiora.Models;

namespace Audiora.Services;

public class DataService<T> where T : class, IBaseEntity
{
    private readonly List<T> _items = new List<T>();

    public Task<T> GetByIdAsync(int id)
    {
        var item = _items.FirstOrDefault(i => i.Id == id);
        return Task.FromResult(item);
    }

    public Task<List<T>> GetAllAsync()
    {
        return Task.FromResult(_items);
    }

    public Task AddAsync(T item)
    {
        _items.Add(item);
        return Task.CompletedTask;
    }
}
