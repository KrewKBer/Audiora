using SpotifyAPI.Web;
using System;
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
                var client = await GetSpotifyClient();
                var request = new RecommendationsRequest
                {
                    SeedGenres = { genre },
                    Limit = 50
                };
                return await client.Browse.GetRecommendations(request);
            }
            catch (APIUnauthorizedException ex)
            {
                _logger.LogError(ex, "Spotify API unauthorized. Check client credentials.");
                throw new InvalidOperationException("Spotify authorization failed.", ex);
            }
            catch (APIException ex)
            {
                _logger.LogError(ex, "Spotify API error occurred while getting recommendations.");
                throw new InvalidOperationException($"Spotify API error: {ex.Message}", ex);
            }
            catch (System.Net.Http.HttpRequestException ex)
            {
                _logger.LogError(ex, "Network error calling Spotify API.");
                throw new InvalidOperationException("Network error calling Spotify API.", ex);
            }
        }
    }
}
