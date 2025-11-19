using Audiora.Data;
using Audiora.Models;
using Microsoft.EntityFrameworkCore;

namespace Audiora.Services;

public class DataService<T> where T : class, IBaseEntity
{
    private readonly AudioraDbContext _context;
    private readonly DbSet<T> _dbSet;

    public DataService(AudioraDbContext context)
    {
        _context = context;
        _dbSet = _context.Set<T>();
    }

    public async Task<T?> GetByIdAsync(Guid id)
    {
        return await _dbSet.FirstOrDefaultAsync(i => i.Id == id);
    }

    public async Task<List<T>> GetAllAsync()
    {
        return await _dbSet.ToListAsync();
    }

    public async Task AddAsync(T item)
    {
        await _dbSet.AddAsync(item);
        await _context.SaveChangesAsync();
    }
}
