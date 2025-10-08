using SpotifyAPI.Web;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Audiora.Models;

namespace Audiora.Services
{
    public class SpotifyService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<SpotifyService> _logger;
    private SpotifyClient? _spotifyClient;
    private string? _clientId;
    private string? _clientSecret;

        public SpotifyService(IConfiguration configuration, ILogger<SpotifyService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

    private Task<SpotifyClient> GetSpotifyClient()
        {
            if (_spotifyClient == null)
            {
        var clientId = _clientId ?? _configuration["Spotify:ClientId"];
        var clientSecret = _clientSecret ?? _configuration["Spotify:ClientSecret"];

                _logger.LogInformation($"GetSpotifyClient: _clientId is {(_clientId != null ? "set" : "null")}, _clientSecret is {(_clientSecret != null ? "set" : "null")}");
                _logger.LogInformation($"GetSpotifyClient: Using clientId={clientId?.Substring(0, Math.Min(5, clientId?.Length ?? 0))}..., clientSecret={(clientSecret != null ? "***set***" : "null")}");

                if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
                {
                    _logger.LogError("Spotify credentials are missing. Ensure 'Spotify:ClientId' and 'Spotify:ClientSecret' are configured via User Secrets or appsettings.");
                    throw new InvalidOperationException("Spotify client credentials are not configured.");
                }

                var config = SpotifyClientConfig
                    .CreateDefault()
                    .WithAuthenticator(new ClientCredentialsAuthenticator(clientId, clientSecret));

                _spotifyClient = new SpotifyClient(config);
            }
            return Task.FromResult(_spotifyClient);
        }

        public void ConfigureCredentials(SpotifyCredentials creds)
        {
            // Basic validation
            if (string.IsNullOrWhiteSpace(creds.ClientId) || string.IsNullOrWhiteSpace(creds.ClientSecret))
            {
                throw new InvalidOperationException("Both ClientId and ClientSecret are required.");
            }

            _clientId = creds.ClientId;
            _clientSecret = creds.ClientSecret;

            // Reset client so the next call creates with new credentials
            _spotifyClient = null;
            _logger.LogInformation("Spotify credentials configured at runtime.");
        }

        public async Task<SearchResponse> SearchTracks(string query)
        {
            try
            {
                var client = await GetSpotifyClient();
                var searchRequest = new SearchRequest(SearchRequest.Types.Track, query);
                return await client.Search.Item(searchRequest);
            }
            catch (APIUnauthorizedException ex)
            {
                _logger.LogError(ex, "Spotify API unauthorized. Check client credentials.");
                throw new InvalidOperationException("Spotify authorization failed.", ex);
            }
            catch (APIException ex)
            {
                _logger.LogError(ex, "Spotify API error occurred while searching tracks.");
                throw new InvalidOperationException($"Spotify API error: {ex.Message}", ex);
            }
            catch (System.Net.Http.HttpRequestException ex)
            {
                _logger.LogError(ex, "Network error calling Spotify API.");
                throw new InvalidOperationException("Network error calling Spotify API.", ex);
            }
        }

        public async Task<RecommendationsResponse> GetRecommendations(List<string> genres)
        {
            try
            {
                var client = await GetSpotifyClient();
                var userGenres = (genres ?? new List<string>()).Where(g => !string.IsNullOrWhiteSpace(g)).ToList();
                if (userGenres.Count == 0) userGenres = new List<string> { "pop" };
                _logger.LogInformation($"GetRecommendations called with user genres: {string.Join(", ", userGenres)}");

                // Map user-friendly genres to Spotify seed genres
                var mapping = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
                {
                    { "hip-hop", "hip-hop" },
                    { "hip hop", "hip-hop" },
                    { "r&b", "r-n-b" },
                    { "rnb", "r-n-b" },
                    { "k-pop", "k-pop" },
                    { "kpop", "k-pop" },
                    { "edm", "edm" },
                    { "electronic", "electronic" },
                    { "classical", "classical" },
                    { "jazz", "jazz" },
                    { "rock", "rock" },
                    { "pop", "pop" },
                    { "metal", "metal" },
                    { "blues", "blues" },
                    { "folk", "folk" },
                    { "latin", "latin" },
                    { "soul", "soul" },
                    { "punk", "punk" },
                    { "indie", "indie-pop" },
                    { "reggae", "reggae" },
                    { "funk", "funk" },
                    { "disco", "disco" },
                    { "country", "country" },
                    { "rb", "r-n-b" },
                    { "rap", "rap" },
                    { "alternative", "alt-rock" },
                    { "lithuanian", "lithuanian" }
                };

                // Normalize user genres and map
                var normalized = userGenres
                    .Select(g => g.Trim())
                    .Select(g => mapping.ContainsKey(g) ? mapping[g] : g.ToLowerInvariant())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();

                // Intersect with Spotify available seed genres (local list to avoid API errors)
                var availableSeeds = new[]
                {
                    "pop","rock","hip-hop","rap","r-n-b","edm","electronic","classical","jazz","metal","blues","folk","latin","soul","punk","indie-pop","reggae","funk","disco","country","k-pop","alt-rock"
                };
                var seedSet = new HashSet<string>(availableSeeds, StringComparer.OrdinalIgnoreCase);
                var seedGenres = normalized.Where(g => seedSet.Contains(g)).Take(5).ToList();

                if (seedGenres.Count > 0)
                {
                    _logger.LogInformation($"Using seed genres for recommendations: {string.Join(", ", seedGenres)}");
                    try
                    {
                        var recReq = new RecommendationsRequest
                        {
                            Limit = 50
                        };
                        foreach (var g in seedGenres)
                        {
                            recReq.SeedGenres.Add(g);
                        }
                        var recs = await client.Browse.GetRecommendations(recReq);
                        if (recs.Tracks != null && recs.Tracks.Count > 0)
                        {
                            return recs;
                        }
                        _logger.LogWarning("Seed-genre recommendations returned no tracks; falling back to search-based strategy.");
                    }
                    catch (APIException ex)
                    {
                        _logger.LogWarning(ex, $"Seed-genre recommendations failed (Status: {ex.Response?.StatusCode}). Falling back to search-based strategy.");
                        // Continue to fallback
                    }
                }

                // Fallback: search-based strategy using genres in query text
                var queries = new List<string>();
                var genreQueryTemplates = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
                {
                    { "pop", new[] { "popular pop 2025", "best pop songs 2025", "top pop hits", "global pop hits" } },
                    { "rock", new[] { "popular rock 2025", "best rock songs 2025", "classic rock hits", "modern rock hits" } },
                    { "hip-hop", new[] { "popular hip hop 2025", "best hip hop songs 2025", "hip hop bangers", "trap hits" } },
                    { "rap", new[] { "popular rap 2025", "best rap songs 2025", "rap bangers", "underground rap hits" } },
                    { "r-n-b", new[] { "popular rnb 2025", "best r&b songs 2025", "r&b slow jams", "contemporary r&b" } },
                    { "edm", new[] { "popular edm 2025", "festival edm 2025", "edm bangers", "progressive house hits" } },
                    { "electronic", new[] { "popular electronic 2025", "electronic hits", "downtempo electronic", "electro pop 2025" } },
                    { "classical", new[] { "classical favorites", "famous classical pieces", "orchestral masterpieces", "piano classics" } },
                    { "jazz", new[] { "popular jazz 2025", "best jazz standards", "modern jazz", "smooth jazz hits" } },
                    { "metal", new[] { "popular metal 2025", "best metal songs 2025", "heavy metal hits", "metalcore hits" } },
                    { "blues", new[] { "popular blues", "best blues songs", "electric blues", "delta blues classics" } },
                    { "folk", new[] { "popular folk 2025", "best folk songs", "indie folk", "acoustic folk" } },
                    { "latin", new[] { "popular latin 2025", "best reggaeton 2025", "latin pop hits", "bachata hits" } },
                    { "soul", new[] { "popular soul", "neo soul 2025", "classic soul hits", "motown hits" } },
                    { "punk", new[] { "popular punk 2025", "punk rock hits", "pop punk hits", "hardcore punk" } },
                    { "indie-pop", new[] { "popular indie 2025", "indie pop hits", "bedroom pop", "indie anthems" } },
                    { "reggae", new[] { "popular reggae", "roots reggae classics", "modern reggae", "dancehall hits" } },
                    { "funk", new[] { "popular funk", "funk classics", "nu funk", "funk grooves" } },
                    { "disco", new[] { "popular disco", "disco classics", "nu disco", "70s disco hits" } },
                    { "country", new[] { "popular country 2025", "best country songs 2025", "modern country hits", "classic country" } },
                    { "k-pop", new[] { "popular k-pop 2025", "kpop hits 2025", "k-pop boy groups", "k-pop girl groups" } },
                    { "alt-rock", new[] { "popular alternative 2025", "alt rock hits", "indie rock 2025", "90s alternative classics" } },
                    { "alternative", new[] { "popular alternative 2025", "alt rock hits", "indie rock 2025", "alternative anthems" } },
                    { "indie", new[] { "popular indie 2025", "indie hits 2025", "indie rock 2025", "indie pop 2025" } },
                    { "lithuanian", new[] { "Top Hits Lithuania", "Lithuanian pop", "Lithuanian music", "Lietuviška muzika", "Lietuva top dainos" } }
                };

                foreach (var g in userGenres)
                {
                    var key = mapping.ContainsKey(g) ? mapping[g] : g.ToLowerInvariant();
                    if (genreQueryTemplates.TryGetValue(key, out var templates))
                    {
                        queries.AddRange(templates);
                    }
                    else
                    {
                        queries.AddRange(new[] { $"popular {g} 2025", $"best {g} songs 2025", $"top {g} hits", $"{g} classics" });
                    }
                }
                if (queries.Count < 5)
                {
                    queries.AddRange(new[] { "popular music", "trending songs", "viral hits", "new releases" }
                        .Where(q => !queries.Contains(q)));
                }
                queries = queries.Distinct(StringComparer.OrdinalIgnoreCase).Take(8).ToList();

                var allTracks = new List<FullTrack>();
                int tracksWithPreviewsCount = 0;
                foreach (var query in queries)
                {
                    var searchResult = await client.Search.Item(new SearchRequest(SearchRequest.Types.Track, query));
                    if (searchResult.Tracks.Items != null && searchResult.Tracks.Items.Count > 0)
                    {
                        var trackIds = searchResult.Tracks.Items.Take(10).Select(t => t.Id).ToList();
                        var tracksRequest = new TracksRequest(trackIds);
                        var fullTracks = await client.Tracks.GetSeveral(tracksRequest);
                        allTracks.AddRange(fullTracks.Tracks);
                        tracksWithPreviewsCount += fullTracks.Tracks.Count(t => !string.IsNullOrEmpty(t.PreviewUrl));
                    }
                }

                if (allTracks.Count == 0)
                {
                    throw new InvalidOperationException("Could not find any tracks.");
                }

                return new RecommendationsResponse { Tracks = allTracks.Take(50).ToList() };
            }
            catch (APIUnauthorizedException ex)
            {
                _logger.LogError(ex, "Spotify API unauthorized. Check client credentials.");
                throw new InvalidOperationException("Spotify authorization failed. Please check your Client ID and Client Secret are correct.", ex);
            }
            catch (APIException ex)
            {
                _logger.LogError(ex, $"Spotify API error. Status: {ex.Response?.StatusCode}");
                var errorMsg = "Spotify API error";
                if (ex.Response?.StatusCode != null)
                {
                    errorMsg += $" (Status: {ex.Response.StatusCode})";
                }
                if (ex.Response?.Body != null)
                {
                    errorMsg += $": {ex.Response.Body.ToString()}";
                }
                else if (!string.IsNullOrEmpty(ex.Message))
                {
                    errorMsg += $": {ex.Message}";
                }
                throw new InvalidOperationException(errorMsg, ex);
            }
            catch (System.Net.Http.HttpRequestException ex)
            {
                _logger.LogError(ex, "Network error calling Spotify API.");
                throw new InvalidOperationException("Network error calling Spotify API.", ex);
            }
        }
    }
}
