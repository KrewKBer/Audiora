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

        public async Task<RecommendationsResponse> GetRecommendations(string genre)
        {
            try
            {
                _logger.LogInformation($"GetRecommendations called with genre: {genre}");
                var client = await GetSpotifyClient();
                _logger.LogInformation("SpotifyClient obtained successfully");
                
                // Since Client Credentials doesn't support recommendations endpoint,
                // let's just return search results from various queries
                _logger.LogInformation("Searching for popular tracks as alternative to recommendations...");
                
                var queries = new[] { 
                    "top hits 2024", 
                    "popular music", 
                    "trending songs",
                    "viral hits",
                    "new releases"
                };
                
                var allTracks = new List<FullTrack>();
                int tracksWithPreviewsCount = 0;
                
                foreach (var query in queries.Take(5))
                {
                    var searchResult = await client.Search.Item(new SearchRequest(SearchRequest.Types.Track, query));
                    if (searchResult.Tracks.Items != null && searchResult.Tracks.Items.Count > 0)
                    {
                        var tracks = searchResult.Tracks.Items.Take(10).ToList();
                        allTracks.AddRange(tracks);
                        var withPreviews = tracks.Count(t => !string.IsNullOrEmpty(t.PreviewUrl));
                        tracksWithPreviewsCount += withPreviews;
                        _logger.LogInformation($"Query '{query}': Found {tracks.Count} tracks, {withPreviews} with previews");
                    }
                }
                
                _logger.LogInformation($"Collected {allTracks.Count} tracks ({tracksWithPreviewsCount} with previews) from search results");
                
                // If we don't have enough tracks, try getting some popular artists' top tracks
                if (allTracks.Count < 30)
                {
                    _logger.LogInformation("Getting more tracks from popular artists...");
                    var popularArtistIds = new[] { 
                        "06HL4z0CvFAxyc27GXpf02", // Taylor Swift
                        "3TVXtAsR1Inumwj472S9r4", // Drake
                        "1Xyo4u8uXC1ZmMpatF05PJ", // The Weeknd
                        "66CXWjxzNUsdJxJ2JdwvnR", // Ariana Grande
                        "4q3ewBCX7sLwd24euuV69X"  // Bad Bunny
                    };
                    
                    foreach (var artistId in popularArtistIds.Take(3))
                    {
                        try
                        {
                            var topTracks = await client.Artists.GetTopTracks(artistId, new ArtistsTopTracksRequest("US"));
                            var tracks = topTracks.Tracks.Take(5).ToList();
                            allTracks.AddRange(tracks);
                            var withPreviews = tracks.Count(t => !string.IsNullOrEmpty(t.PreviewUrl));
                            tracksWithPreviewsCount += withPreviews;
                            _logger.LogInformation($"Artist {artistId}: Got {tracks.Count} tracks ({withPreviews} with previews)");
                            
                            if (allTracks.Count >= 50) break;
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, $"Failed to get top tracks for artist {artistId}");
                        }
                    }
                }
                
                _logger.LogInformation($"Total collected: {allTracks.Count} tracks ({tracksWithPreviewsCount} with previews)");
                
                if (allTracks.Count == 0)
                {
                    throw new InvalidOperationException("Could not find any tracks.");
                }
                
                if (tracksWithPreviewsCount == 0)
                {
                    _logger.LogWarning("No preview URLs available for any tracks. This is likely due to regional restrictions. Songs will still be shown without audio previews.");
                }
                
                // Create a mock RecommendationsResponse
                var response = new RecommendationsResponse
                {
                    Tracks = allTracks.Take(50).ToList()
                };
                
                _logger.LogInformation($"Returning {response.Tracks.Count} tracks");
                return response;
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
