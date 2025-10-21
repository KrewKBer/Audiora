using Audiora.Models;
using Newtonsoft.Json;

namespace Audiora.Services;

public class RoomStore
{
    private readonly string _filePath;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private List<Room> _rooms = new();
    private bool _loaded = false;

    public RoomStore(IWebHostEnvironment env)
    {
        var dataDir = Path.Combine(Directory.GetCurrentDirectory(), "Data");
        Directory.CreateDirectory(dataDir);
        _filePath = Path.Combine(dataDir, "rooms.json");
    }

    private async Task EnsureLoadedAsync()
    {
        if (_loaded) return;

        await _lock.WaitAsync();
        try
        {
            if (_loaded) return;

            if (File.Exists(_filePath))
            {
                var json = await File.ReadAllTextAsync(_filePath);
                _rooms = JsonConvert.DeserializeObject<List<Room>>(json) ?? new List<Room>();
            }
            else
            {
                _rooms = new List<Room>();
            }

            _loaded = true;
        }
        finally
        {
            _lock.Release();
        }
    }

    private async Task SaveAsync()
    {
        var json = JsonConvert.SerializeObject(_rooms, Formatting.Indented);
        await File.WriteAllTextAsync(_filePath, json);
    }

    public async Task<List<Room>> GetRoomsAsync()
    {
        await EnsureLoadedAsync();
        // Return a copy to avoid external mutation
        return _rooms.Select(r => r).ToList();
    }

    public async Task<Room?> GetRoomAsync(string roomId)
    {
        await EnsureLoadedAsync();
        return _rooms.FirstOrDefault(r => r.Id == roomId);
    }

    public async Task<Room> AddRoomAsync(Room room)
    {
        await EnsureLoadedAsync();

        await _lock.WaitAsync();
        try
        {
            _rooms.Add(room);
            await SaveAsync();
            return room;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<bool> UpdateRoomAsync(Room room)
    {
        await EnsureLoadedAsync();

        await _lock.WaitAsync();
        try
        {
            var idx = _rooms.FindIndex(r => r.Id == room.Id);
            if (idx < 0) return false;

            _rooms[idx] = room;
            await SaveAsync();
            return true;
        }
        finally
        {
            _lock.Release();
        }
    }
}