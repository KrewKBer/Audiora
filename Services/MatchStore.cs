using Newtonsoft.Json;

namespace Audiora.Services;

public class MatchStore
{
    private readonly string _filePath;
    private readonly SemaphoreSlim _lock = new(1,1);
    private MatchData _data = new();
    private bool _loaded = false;

    public MatchStore(IWebHostEnvironment env)
    {
        var dataDir = Path.Combine(Directory.GetCurrentDirectory(), "Data");
        Directory.CreateDirectory(dataDir);
        _filePath = Path.Combine(dataDir, "matches.json");
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
                _data = JsonConvert.DeserializeObject<MatchData>(json) ?? new MatchData();
            }
            _loaded = true;
        }
        finally { _lock.Release(); }
    }

    private async Task SaveAsync()
    {
        var json = JsonConvert.SerializeObject(_data, Formatting.Indented);
        await File.WriteAllTextAsync(_filePath, json);
    }

    public async Task<IReadOnlyList<MatchRecord>> GetMatchesForAsync(string userId)
    {
        await EnsureLoadedAsync();
        return _data.Matches.Where(m => m.UserAId == userId || m.UserBId == userId).ToList();
    }

    public async Task<bool> HasLikedAsync(string fromUser, string toUser)
    {
        await EnsureLoadedAsync();
        return _data.Likes.Any(l => l.FromUserId == fromUser && l.ToUserId == toUser);
    }

    public async Task<(bool matched, MatchRecord? record)> LikeAsync(string fromUser, string toUser)
    {
        if (fromUser == toUser) return (false, null);
        await EnsureLoadedAsync();
        await _lock.WaitAsync();
        try
        {
            if (_data.Likes.Any(l => l.FromUserId == fromUser && l.ToUserId == toUser))
                return (false, null); // already liked
            _data.Likes.Add(new LikeRecord { FromUserId = fromUser, ToUserId = toUser, Timestamp = DateTime.UtcNow });
            // mutual?
            if (_data.Likes.Any(l => l.FromUserId == toUser && l.ToUserId == fromUser) &&
                !_data.Matches.Any(m => (m.UserAId == fromUser && m.UserBId == toUser) || (m.UserAId == toUser && m.UserBId == fromUser)))
            {
                var chatId = GenerateChatId(fromUser, toUser);
                var match = new MatchRecord { UserAId = fromUser, UserBId = toUser, CreatedAt = DateTime.UtcNow, ChatId = chatId };
                _data.Matches.Add(match);
                await SaveAsync();
                return (true, match);
            }
            await SaveAsync();
        }
        finally { _lock.Release(); }
        return (false, null);
    }

    public static string GenerateChatId(string a, string b)
    {
        var ordered = new[]{a,b}.OrderBy(x=>x, StringComparer.Ordinal).ToArray();
        return $"{ordered[0]}_{ordered[1]}";
    }

    public async Task<HashSet<string>> GetLikedTargetsAsync(string userId)
    {
        await EnsureLoadedAsync();
        return _data.Likes.Where(l => l.FromUserId == userId).Select(l => l.ToUserId).ToHashSet();
    }
}

public class MatchData
{
    public List<LikeRecord> Likes { get; set; } = new();
    public List<MatchRecord> Matches { get; set; } = new();
}

public class LikeRecord
{
    public required string FromUserId { get; set; }
    public required string ToUserId { get; set; }
    public DateTime Timestamp { get; set; }
}

public class MatchRecord
{
    public required string UserAId { get; set; }
    public required string UserBId { get; set; }
    public DateTime CreatedAt { get; set; }
    public required string ChatId { get; set; }
}
