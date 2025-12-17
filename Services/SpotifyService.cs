using SpotifyAPI.Web;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Audiora.Models;
using Audiora.Extensions;
using Audiora.Exceptions;

namespace Audiora.Services
{
    public class SpotifyService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<SpotifyService> _logger;
        private ISpotifyClient? _spotifyClient;

        public SpotifyService(IConfiguration configuration, ILogger<SpotifyService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        protected virtual Task<ISpotifyClient> GetSpotifyClient()
        {
            if (_spotifyClient == null)
            {
                var clientId = _configuration["Spotify:ClientId"];
                var clientSecret = _configuration["Spotify:ClientSecret"];

                _logger.LogInformation($"GetSpotifyClient: Using credentials from configuration.");

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

        public virtual async Task<SearchResponse> SearchTracks(string query)
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
                throw new SpotifyApiException("Spotify authorization failed.", ex);
            }
            catch (APIException ex)
            {
                _logger.LogError(ex, "Spotify API error occurred while searching tracks.");
                throw new SpotifyApiException($"Spotify API error: {ex.Message}", ex);
            }
            catch (System.Net.Http.HttpRequestException ex)
            {
                _logger.LogError(ex, "Network error calling Spotify API.");
                throw new SpotifyApiException("Network error calling Spotify API.", ex);
            }
        }

        public async Task<List<SimpleAlbum>> GetNewReleases()
        {
            try
            {
                var client = await GetSpotifyClient();
                var request = new NewReleasesRequest { Limit = 20, Country = "US" };
                var response = await client.Browse.GetNewReleases(request);
                return response.Albums.Items;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching new releases from Spotify.");
                throw;
            }
        }

        public async Task<List<FullTrack>> GetRecommendations(List<string> genres)
        {
            try
            {
                var client = await GetSpotifyClient();
                var userGenres = (genres ?? new List<string>()).Where(g => !string.IsNullOrWhiteSpace(g)).ToList();
                if (userGenres.Count == 0) userGenres = new List<string> { "pop" };
                _logger.LogInformation($"GetRecommendations called with user genres: {string.Join(", ", userGenres)}");

                var seedGenres = userGenres.ToSpotifySeedGenres().Take(5).ToList();

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
                            // Recommendations endpoint returns simplified tracks which might lack Album info.
                            // We need Album info for the frontend images.
                            var trackIds = recs.Tracks.Select(t => t.Id).Where(id => !string.IsNullOrEmpty(id)).ToList();
                            if (trackIds.Count > 0)
                            {
                                var fullTracksReq = new TracksRequest(trackIds);
                                var fullTracksResponse = await client.Tracks.GetSeveral(fullTracksReq);
                                return fullTracksResponse.Tracks;
                            }
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
                var fallbackQuery = userGenres.FirstOrDefault() ?? "popular";
                _logger.LogInformation($"Falling back to search with query: '{fallbackQuery}'");
                var searchRequest = new SearchRequest(SearchRequest.Types.Track, fallbackQuery) { Limit = 50 };
                var searchResponse = await client.Search.Item(searchRequest);

                if (searchResponse.Tracks.Items == null)
                {
                    throw new InvalidOperationException("Could not find any tracks.");
                }

                return searchResponse.Tracks.Items;
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
