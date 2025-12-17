using Audiora.Data;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;

namespace AudioraTests.Integration;

[Trait("Category", "Integration")]
public class MusicPreferenceIntegrationTests : IAsyncLifetime
{
    private WebApplicationFactory<Program> _factory = null!;
    private HttpClient _client1 = null!;
    private HttpClient _client2 = null!;
    private readonly string _testDbName = $"TestDb_{Guid.NewGuid()}";

    public async Task InitializeAsync()
    {
        _factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(b => b.UseEnvironment("Testing"));

        _client1 = new HttpClient(new DelegatingHandlerChain(_factory.Server.CreateHandler()));
        _client1.BaseAddress = _factory.Server.BaseAddress;

        _client2 = new HttpClient(new DelegatingHandlerChain(_factory.Server.CreateHandler()));
        _client2.BaseAddress = _factory.Server.BaseAddress;

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AudioraDbContext>();
        await db.Database.EnsureCreatedAsync();
    }

    private class DelegatingHandlerChain : DelegatingHandler
    {
        private readonly Dictionary<string, string> _cookies = new();

        public DelegatingHandlerChain(HttpMessageHandler innerHandler) : base(innerHandler) { }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (_cookies.Any())
            {
                request.Headers.Add("Cookie", string.Join("; ", _cookies.Select(c => $"{c.Key}={c.Value}")));
            }

            var response = await base.SendAsync(request, cancellationToken);

            if (response.Headers.TryGetValues("Set-Cookie", out var setCookies))
            {
                foreach (var cookie in setCookies)
                {
                    var parts = cookie.Split(';')[0].Split('=');
                    if (parts.Length == 2)
                        _cookies[parts[0]] = parts[1];
                }
            }

            return response;
        }
    }

    public Task DisposeAsync()
    {
        _client1.Dispose();
        _client2.Dispose();
        _factory.Dispose();
        return Task.CompletedTask;
    }

    [Fact]
    public async Task FullMusicFlow_UpdateGenresAndTopSongs_AffectsRecommendations_AndMatchmaking()
    {
        // Tests: Auth -> User preferences -> Spotify recommendations -> Match filtering
        
        // Register User 1 with rock preference
        var user1Reg = await _client1.PostAsJsonAsync("/Auth/register", new
        {
            username = "rocker",
            password = "pass",
            genres = new[] { "rock" }
        });
        user1Reg.EnsureSuccessStatusCode();
        var user1Data = await user1Reg.Content.ReadFromJsonAsync<JsonElement>();
        var user1Id = user1Data.GetProperty("userId").GetString();

        // Register User 2 with pop preference
        var user2Reg = await _client2.PostAsJsonAsync("/Auth/register", new
        {
            username = "popper",
            password = "pass",
            genres = new[] { "pop" }
        });
        user2Reg.EnsureSuccessStatusCode();
        var user2Data = await user2Reg.Content.ReadFromJsonAsync<JsonElement>();
        var user2Id = user2Data.GetProperty("userId").GetString();

        // Update User 1's genres to include metal
        var updateGenresResp = await _client1.PostAsJsonAsync("/Auth/update-genres", new
        {
            userId = user1Id,
            genres = new[] { "rock", "metal" }
        });
        updateGenresResp.EnsureSuccessStatusCode();

        // Add top songs for User 1
        var updateSongsResp = await _client1.PostAsJsonAsync("/Auth/update-top-songs", new
        {
            userId = user1Id,
            topSongs = new[]
            {
                new { id = "1", name = "Enter Sandman", artist = "Metallica", albumImageUrl = "url1" },
                new { id = "2", name = "Master of Puppets", artist = "Metallica", albumImageUrl = "url2" }
            }
        });
        updateSongsResp.EnsureSuccessStatusCode();

        // Get recommendations based on updated preferences
        var recommendationsResp = await _client1.GetAsync($"/Spotify/recommendations?userId={user1Id}");
        recommendationsResp.EnsureSuccessStatusCode();
        var recommendations = await recommendationsResp.Content.ReadFromJsonAsync<JsonElement>();
        
        recommendations.EnumerateArray().Should().NotBeEmpty("User should receive recommendations");

        // Verify user data persisted correctly
        var userResp = await _client1.GetAsync($"/Auth/user?userId={user1Id}");
        userResp.EnsureSuccessStatusCode();
        var userData = await userResp.Content.ReadFromJsonAsync<JsonElement>();
        
        userData.GetProperty("genres").EnumerateArray()
            .Select(g => g.GetString())
            .Should().Contain(new[] { "rock", "metal" });
        
        userData.GetProperty("topSongs").EnumerateArray().Should().HaveCount(2);

        // Verify users still appear as candidates (music preferences don't affect matching)
        var candidatesResp = await _client1.GetAsync($"/api/match/candidates?userId={user1Id}");
        candidatesResp.EnsureSuccessStatusCode();
        var candidates = await candidatesResp.Content.ReadFromJsonAsync<JsonElement>();
        
        candidates.EnumerateArray().Should().ContainSingle(c => 
            c.GetProperty("id").GetString() == user2Id);
    }

    [Fact]
    public async Task SpotifySearch_UpdateTopSongs_PersistsInDatabase()
    {
        // Tests: Auth -> Spotify search -> Update user songs -> Database persistence
        
        var reg = await _client1.PostAsJsonAsync("/Auth/register", new
        {
            username = "searcher",
            password = "pass"
        });
        reg.EnsureSuccessStatusCode();
        var userId = (await reg.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("userId").GetString();

        // Search for tracks
        var searchResp = await _client1.GetAsync("/Spotify/search?query=metallica");
        searchResp.EnsureSuccessStatusCode();
        var searchResults = await searchResp.Content.ReadFromJsonAsync<JsonElement>();
        
        var tracks = searchResults.GetProperty("items").EnumerateArray().ToList();
        tracks.Should().NotBeEmpty();

        var firstTrack = tracks[0];
        var trackId = firstTrack.GetProperty("id").GetString();
        var trackName = firstTrack.GetProperty("name").GetString();
        var trackArtist = firstTrack.GetProperty("artists")[0].GetProperty("name").GetString();

        // Update user's top songs with search result
        var updateResp = await _client1.PostAsJsonAsync("/Auth/update-top-songs", new
        {
            userId,
            topSongs = new[]
            {
                new { id = trackId, name = trackName, artist = trackArtist, albumImageUrl = (string?)null }
            }
        });
        updateResp.EnsureSuccessStatusCode();

        // Verify persistence by logging out and back in
        await _client1.PostAsync("/Auth/logout", null);

        var loginResp = await _client1.PostAsJsonAsync("/Auth/login", new
        {
            username = "searcher",
            password = "pass"
        });
        loginResp.EnsureSuccessStatusCode();

        // Retrieve user data
        var userResp = await _client1.GetAsync($"/Auth/user?userId={userId}");
        userResp.EnsureSuccessStatusCode();
        var userData = await userResp.Content.ReadFromJsonAsync<JsonElement>();

        var topSongs = userData.GetProperty("topSongs").EnumerateArray().ToList();
        topSongs.Should().ContainSingle();
        topSongs[0].GetProperty("id").GetString().Should().Be(trackId);
        topSongs[0].GetProperty("name").GetString().Should().Be(trackName);
    }
}
