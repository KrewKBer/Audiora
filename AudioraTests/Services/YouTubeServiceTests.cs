using Audiora.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Moq;
using Moq.Protected;
using System.Net;
using Xunit;

namespace AudioraTests.Services
{
    public class YouTubeServiceTests
    {
        private readonly Mock<IHttpClientFactory> _httpClientFactoryMock;
        private readonly Mock<IMemoryCache> _cacheMock;
        private readonly Mock<IConfiguration> _configMock;
        private readonly YouTubeService _service;
        private readonly Mock<HttpMessageHandler> _httpMessageHandlerMock;

        public YouTubeServiceTests()
        {
            _httpClientFactoryMock = new Mock<IHttpClientFactory>();
            _cacheMock = new Mock<IMemoryCache>();
            _configMock = new Mock<IConfiguration>();
            _httpMessageHandlerMock = new Mock<HttpMessageHandler>();

            var client = new HttpClient(_httpMessageHandlerMock.Object);
            _httpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>())).Returns(client);

            _configMock.Setup(x => x["YouTube:ApiKey"]).Returns("test-key");

            // Setup cache to return false for TryGetValue
            object expectedValue;
            _cacheMock.Setup(x => x.TryGetValue(It.IsAny<object>(), out expectedValue))
                .Returns(false);
            
            // Setup cache Set
            _cacheMock.Setup(x => x.CreateEntry(It.IsAny<object>())).Returns(Mock.Of<ICacheEntry>);

            _service = new YouTubeService(_httpClientFactoryMock.Object, _cacheMock.Object, _configMock.Object);
        }

        [Fact]
        public async Task GetEmbeddableVideoIdAsync_ReturnsId_WhenApiReturnsResult()
        {
            // Arrange
            var query = "test";
            var jsonResponse = "{\"items\": [{\"id\": {\"videoId\": \"video123\"}}]}";
            
            _httpMessageHandlerMock.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>()
                )
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(jsonResponse)
                });

            // Act
            var result = await _service.GetEmbeddableVideoIdAsync(query);

            // Assert
            Assert.Equal("video123", result);
        }

        [Fact]
        public async Task GetEmbeddableVideoIdAsync_ReturnsNull_WhenApiReturnsNoItems()
        {
            // Arrange
            var query = "test";
            var jsonResponse = "{\"items\": []}";
            
            _httpMessageHandlerMock.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>()
                )
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(jsonResponse)
                });

            // Act
            var result = await _service.GetEmbeddableVideoIdAsync(query);

            // Assert
            Assert.Null(result);
        }
    }
}
