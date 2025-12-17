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
            var recResponse = new RecommendationsResponse 
            { 
                Tracks = new List<FullTrack> { new FullTrack { Name = "Rec Track" } } 
            };
            
            var browseClientMock = new Mock<IBrowseClient>();
            browseClientMock.Setup(c => c.GetRecommendations(It.IsAny<RecommendationsRequest>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(recResponse);

            _spotifyClientMock.Setup(c => c.Browse).Returns(browseClientMock.Object);

            // Act
            var result = await _service.GetRecommendations(genres);

            // Assert
            Assert.Single(result);
            Assert.Equal("Rec Track", result[0].Name);
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
