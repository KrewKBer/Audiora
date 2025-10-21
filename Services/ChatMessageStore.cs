using Audiora.Models;
using Newtonsoft.Json;

namespace Audiora.Services;

public class ChatMessageStore
{
    private readonly string _filePath;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private List<ChatMessage> _messages = new();
    private bool _loaded = false;

    public ChatMessageStore(IWebHostEnvironment env)
    {
        var dataDir = Path.Combine(Directory.GetCurrentDirectory(), "Data");
        Directory.CreateDirectory(dataDir);
        _filePath = Path.Combine(dataDir, "chatMessages.json");
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
                _messages = JsonConvert.DeserializeObject<List<ChatMessage>>(json) ?? new List<ChatMessage>();
            }
            else
            {
                _messages = new List<ChatMessage>();
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
        var json = JsonConvert.SerializeObject(_messages, Formatting.Indented);
        await File.WriteAllTextAsync(_filePath, json);
    }

    public async Task<List<ChatMessage>> GetMessagesAsync(string roomId)
    {
        await EnsureLoadedAsync();
        return _messages
            .Where(m => m.RoomId == roomId)
            .OrderBy(m => m.Timestamp)
            .ToList();
    }

    public async Task<ChatMessage> AddMessageAsync(ChatMessage message)
    {
        await EnsureLoadedAsync();

        await _lock.WaitAsync();
        try
        {
            _messages.Add(message);
            await SaveAsync();
            return message;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<List<ChatMessage>> GetAllMessagesAsync()
    {
        await EnsureLoadedAsync();
        return _messages.OrderBy(m => m.Timestamp).ToList();
    }
}
