using Audiora.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using SpotifyAPI.Web;
using Xunit;
using Audiora.Exceptions;
using System.Threading;

namespace AudioraTests.Services
{
    public class SpotifyServiceTests
    {
        private readonly Mock<IConfiguration> _configMock;
        private readonly Mock<ILogger<SpotifyService>> _loggerMock;
        private readonly Mock<ISpotifyClient> _spotifyClientMock;
        private readonly TestableSpotifyService _service;

        public SpotifyServiceTests()
        {
            _configMock = new Mock<IConfiguration>();
            _loggerMock = new Mock<ILogger<SpotifyService>>();
            _spotifyClientMock = new Mock<ISpotifyClient>();

            _service = new TestableSpotifyService(_configMock.Object, _loggerMock.Object, _spotifyClientMock.Object);
        }

        [Fact]
        public async Task SearchTracks_ReturnsResponse()
        {
            // Arrange
            var query = "test";
            var searchResponse = new SearchResponse();
            var searchClientMock = new Mock<ISearchClient>();
            searchClientMock.Setup(c => c.Item(It.IsAny<SearchRequest>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(searchResponse);
            
            _spotifyClientMock.Setup(c => c.Search).Returns(searchClientMock.Object);

            // Act
            var result = await _service.SearchTracks(query);

            // Assert
            Assert.NotNull(result);
            Assert.Same(searchResponse, result);
        }

        [Fact]
        public async Task SearchTracks_ThrowsSpotifyApiException_OnApiError()
        {
            // Arrange
            var searchClientMock = new Mock<ISearchClient>();
            searchClientMock.Setup(c => c.Item(It.IsAny<SearchRequest>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new APIException("API Error"));
            
            _spotifyClientMock.Setup(c => c.Search).Returns(searchClientMock.Object);

            // Act & Assert
            await Assert.ThrowsAsync<SpotifyApiException>(() => _service.SearchTracks("test"));
        }

        [Fact]
        public async Task GetRecommendations_ReturnsTracks()
        {
            // Arrange
            var genres = new List<string> { "pop" };
            var fullTrack = new FullTrack 
            { 
                Id = "track1",
                Name = "Rec Track" 
            };
            
            var recResponse = new RecommendationsResponse 
            { 
                Tracks = new List<FullTrack> { fullTrack } 
            };
            
            var browseClientMock = new Mock<IBrowseClient>();
            browseClientMock.Setup(c => c.GetRecommendations(It.IsAny<RecommendationsRequest>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(recResponse);
        
            var tracksResponse = new TracksResponse
            {
                Tracks = new List<FullTrack> { fullTrack }
            };
            
            var tracksClientMock = new Mock<ITracksClient>();
            tracksClientMock.Setup(c => c.GetSeveral(It.IsAny<TracksRequest>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(tracksResponse);
        
            _spotifyClientMock.Setup(c => c.Browse).Returns(browseClientMock.Object);
            _spotifyClientMock.Setup(c => c.Tracks).Returns(tracksClientMock.Object);
        
            // Act
            var result = await _service.GetRecommendations(genres);
        
            // Assert
            Assert.Single(result);
            Assert.Equal("Rec Track", result[0].Name);
        }
        
        [Fact]
        public async Task GetNewReleases_ReturnsAlbums()
        {
            // Arrange
            var albums = new List<SimpleAlbum>
            {
                new SimpleAlbum { Id = "album1", Name = "New Album" }
            };

            var newReleasesResponse = new NewReleasesResponse
            {
                Albums = new Paging<SimpleAlbum, NewReleasesResponse>
                {
                    Items = albums
                }
            };

            var browseClientMock = new Mock<IBrowseClient>();
            browseClientMock.Setup(c => c.GetNewReleases(It.IsAny<NewReleasesRequest>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(newReleasesResponse);

            _spotifyClientMock.Setup(c => c.Browse).Returns(browseClientMock.Object);

            // Act
            var result = await _service.GetNewReleases();

            // Assert
            Assert.Single(result);
            Assert.Equal("New Album", result[0].Name);
        }        
        [Fact]
        public async Task GetNewReleases_ThrowsException_OnError()
        {
            // Arrange
            var browseClientMock = new Mock<IBrowseClient>();
            browseClientMock.Setup(c => c.GetNewReleases(It.IsAny<NewReleasesRequest>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new Exception("API Error"));
        
            _spotifyClientMock.Setup(c => c.Browse).Returns(browseClientMock.Object);
        
            // Act & Assert
            await Assert.ThrowsAsync<Exception>(() => _service.GetNewReleases());
        }
        
        [Fact]
        public async Task GetRecommendations_FallsBackToSearch_WhenNoGenresProvided()
        {
            // Arrange
            var fullTrack = new FullTrack { Id = "track1", Name = "Fallback Track" };

            var searchResponse = new SearchResponse
            {
                Tracks = new Paging<FullTrack, SearchResponse>
                {
                    Items = new List<FullTrack> { fullTrack }
                }
            };

            var searchClientMock = new Mock<ISearchClient>();
            searchClientMock.Setup(c => c.Item(It.IsAny<SearchRequest>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(searchResponse);

            // Setup both Browse and Search clients
            var browseClientMock = new Mock<IBrowseClient>();
            _spotifyClientMock.Setup(c => c.Browse).Returns(browseClientMock.Object);
            _spotifyClientMock.Setup(c => c.Search).Returns(searchClientMock.Object);

            // Act
            var result = await _service.GetRecommendations(new List<string>());

            // Assert
            Assert.Single(result);
            Assert.Equal("Fallback Track", result[0].Name);
        }

        
        [Fact]
        public async Task GetRecommendations_FallsBackToSearch_WhenRecommendationsReturnEmpty()
        {
            // Arrange
            var emptyRecResponse = new RecommendationsResponse
            {
                Tracks = new List<FullTrack>()
            };

            var browseClientMock = new Mock<IBrowseClient>();
            browseClientMock.Setup(c => c.GetRecommendations(It.IsAny<RecommendationsRequest>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(emptyRecResponse);

            var fullTrack = new FullTrack { Id = "track1", Name = "Search Track" };
            var searchResponse = new SearchResponse
            {
                Tracks = new Paging<FullTrack, SearchResponse>
                {
                    Items = new List<FullTrack> { fullTrack }
                }
            };

            var searchClientMock = new Mock<ISearchClient>();
            searchClientMock.Setup(c => c.Item(It.IsAny<SearchRequest>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(searchResponse);

            _spotifyClientMock.Setup(c => c.Browse).Returns(browseClientMock.Object);
            _spotifyClientMock.Setup(c => c.Search).Returns(searchClientMock.Object);

            // Act
            var result = await _service.GetRecommendations(new List<string> { "rock" });

            // Assert
            Assert.Single(result);
            Assert.Equal("Search Track", result[0].Name);
        }
        
        [Fact]
        public async Task GetRecommendations_ThrowsInvalidOperationException_OnUnauthorized()
        {
            // Arrange
            var browseClientMock = new Mock<IBrowseClient>();
            browseClientMock.Setup(c => c.GetRecommendations(It.IsAny<RecommendationsRequest>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new APIUnauthorizedException("Unauthorized"));

            var searchClientMock = new Mock<ISearchClient>();
            searchClientMock.Setup(c => c.Item(It.IsAny<SearchRequest>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new APIUnauthorizedException("Unauthorized"));

            _spotifyClientMock.Setup(c => c.Browse).Returns(browseClientMock.Object);
            _spotifyClientMock.Setup(c => c.Search).Returns(searchClientMock.Object);

            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(() => _service.GetRecommendations(new List<string> { "pop" }));
        }
        
        [Fact]
        public async Task GetRecommendations_ThrowsInvalidOperationException_OnNetworkError()
        {
            // Arrange
            var browseClientMock = new Mock<IBrowseClient>();
            browseClientMock.Setup(c => c.GetRecommendations(It.IsAny<RecommendationsRequest>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new System.Net.Http.HttpRequestException("Network error"));

            var searchClientMock = new Mock<ISearchClient>();
            searchClientMock.Setup(c => c.Item(It.IsAny<SearchRequest>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new System.Net.Http.HttpRequestException("Network error"));

            _spotifyClientMock.Setup(c => c.Browse).Returns(browseClientMock.Object);
            _spotifyClientMock.Setup(c => c.Search).Returns(searchClientMock.Object);

            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(() => _service.GetRecommendations(new List<string> { "pop" }));
        }
        
        [Fact]
        public async Task SearchTracks_ThrowsSpotifyApiException_OnUnauthorized()
        {
            // Arrange
            var searchClientMock = new Mock<ISearchClient>();
            searchClientMock.Setup(c => c.Item(It.IsAny<SearchRequest>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new APIUnauthorizedException("Unauthorized"));
        
            _spotifyClientMock.Setup(c => c.Search).Returns(searchClientMock.Object);
        
            // Act & Assert
            await Assert.ThrowsAsync<SpotifyApiException>(() => _service.SearchTracks("test"));
        }
        
        [Fact]
        public async Task SearchTracks_ThrowsSpotifyApiException_OnNetworkError()
        {
            // Arrange
            var searchClientMock = new Mock<ISearchClient>();
            searchClientMock.Setup(c => c.Item(It.IsAny<SearchRequest>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new System.Net.Http.HttpRequestException("Network error"));
        
            _spotifyClientMock.Setup(c => c.Search).Returns(searchClientMock.Object);
        
            // Act & Assert
            await Assert.ThrowsAsync<SpotifyApiException>(() => _service.SearchTracks("test"));
        }
        
        
    }

    public class TestableSpotifyService : SpotifyService
    {
        private readonly ISpotifyClient _mockClient;

        public TestableSpotifyService(IConfiguration config, ILogger<SpotifyService> logger, ISpotifyClient mockClient) 
            : base(config, logger)
        {
            _mockClient = mockClient;
        }

        protected override Task<ISpotifyClient> GetSpotifyClient()
        {
            return Task.FromResult(_mockClient);
        }
    }
}
