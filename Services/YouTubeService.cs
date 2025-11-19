using System.Net.Http;
using System.Net.Http.Json;
using Microsoft.Extensions.Caching.Memory;

namespace Audiora.Services;

public class YouTubeService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;
    private readonly string? _apiKey;

    public YouTubeService(IHttpClientFactory httpClientFactory, IMemoryCache cache, IConfiguration config)
    {
        _httpClientFactory = httpClientFactory;
        _cache = cache;
        _apiKey = config["YouTube:ApiKey"]; // keep null if not set
    }

    public virtual bool HasApiKey => !string.IsNullOrWhiteSpace(_apiKey);

    public virtual async Task<string?> GetEmbeddableVideoIdAsync(string query, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(query) || string.IsNullOrWhiteSpace(_apiKey))
            return null;

        if (_cache.TryGetValue<string>($"yt:{query}", out var cached))
            return cached;

        // Try several query variants to avoid blocked official uploads
        var variants = new[] { query, query + " lyrics", query + " audio", query + " topic", query + " visualizer" };
        foreach (var v in variants.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            var id = await SearchEmbeddableAsync(v, ct);
            if (!string.IsNullOrWhiteSpace(id))
            {
                _cache.Set($"yt:{query}", id, TimeSpan.FromHours(6));
                return id;
            }
        }
        return null;
    }

    private async Task<string?> SearchEmbeddableAsync(string searchQuery, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient();
        var qp = new Dictionary<string, string?>
        {
            ["key"] = _apiKey,
            ["q"] = searchQuery,
            ["part"] = "snippet",
            ["maxResults"] = "10",
            ["type"] = "video",
            ["videoEmbeddable"] = "true",
            ["videoSyndicated"] = "true",
            ["safeSearch"] = "none",
            ["order"] = "relevance"
        };

        var requestUri = "https://www.googleapis.com/youtube/v3/search?" +
            string.Join("&", qp.Select(kv => $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value ?? string.Empty)}"));
        using var req = new HttpRequestMessage(HttpMethod.Get, requestUri);
        using var resp = await client.SendAsync(req, ct);
        if (!resp.IsSuccessStatusCode)
            return null;

        var payload = await resp.Content.ReadFromJsonAsync<YouTubeSearchResponse>(cancellationToken: ct);
        var id = payload?.Items?.Select(i => i.Id?.VideoId).FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));
        return id;
    }

    // Minimal DTOs for the parts we need
    private sealed class YouTubeSearchResponse
    {
        public List<Item>? Items { get; set; }
    }
    private sealed class Item
    {
        public Id? Id { get; set; }
    }
    private sealed class Id
    {
        public string? VideoId { get; set; }
    }
}
