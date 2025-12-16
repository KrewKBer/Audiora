using Audiora.Controllers;
using Audiora.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Moq;
using Newtonsoft.Json.Linq;

namespace AudioraTests.Controllers;

[Trait("Category", "Unit")]
public class YouTubeControllerTests
{
    private readonly Mock<IHttpClientFactory> _mockHttpClientFactory;
    private readonly Mock<IMemoryCache> _mockCache;
    private readonly Mock<IConfiguration> _mockConfig;
    private readonly Mock<YouTubeService> _mockYouTubeService;
    private readonly YouTubeController _controller;

    public YouTubeControllerTests()
    {
        _mockHttpClientFactory = new Mock<IHttpClientFactory>();
        _mockCache = new Mock<IMemoryCache>();
        _mockConfig = new Mock<IConfiguration>();

        _mockYouTubeService = new Mock<YouTubeService>(
            _mockHttpClientFactory.Object,
            _mockCache.Object,
            _mockConfig.Object
        );

        _controller = new YouTubeController(_mockYouTubeService.Object);
    }

    [Fact]
    public async Task Search_WithEmptyQuery_ReturnsBadRequest()
    {
        var result = await _controller.Search("", CancellationToken.None);

        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().Be("query required");
    }

    [Fact]
    public async Task Search_WithNullQuery_ReturnsBadRequest()
    {
        var result = await _controller.Search(null!, CancellationToken.None);

        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().Be("query required");
    }

    [Fact]
    public async Task Search_WithWhitespaceQuery_ReturnsBadRequest()
    {
        var result = await _controller.Search("   ", CancellationToken.None);

        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().Be("query required");
    }

    [Fact]
    public async Task Search_WithoutApiKey_ReturnsOkResult()
    {
        _mockYouTubeService.Setup(s => s.HasApiKey).Returns(false);

        var result = await _controller.Search("test query", CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
        _mockYouTubeService.Verify(s => s.GetEmbeddableVideoIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Search_WithApiKeyAndValidQuery_ReturnsVideoId()
    {
        _mockYouTubeService.Setup(s => s.HasApiKey).Returns(true);
        _mockYouTubeService.Setup(s => s.GetEmbeddableVideoIdAsync("test query", It.IsAny<CancellationToken>()))
            .ReturnsAsync("dQw4w9WgXcQ");

        var result = await _controller.Search("test query", CancellationToken.None);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().NotBeNull();
        _mockYouTubeService.Verify(s => s.GetEmbeddableVideoIdAsync("test query", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Search_WithApiKeyButNoResults_ReturnsNotFound()
    {
        _mockYouTubeService.Setup(s => s.HasApiKey).Returns(true);
        _mockYouTubeService.Setup(s => s.GetEmbeddableVideoIdAsync("nonexistent", It.IsAny<CancellationToken>()))
            .ReturnsAsync((string?)null);

        var result = await _controller.Search("nonexistent", CancellationToken.None);

        result.Should().BeOfType<NotFoundResult>();
        _mockYouTubeService.Verify(s => s.GetEmbeddableVideoIdAsync("nonexistent", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Search_WithApiKeyAndEmptyResult_ReturnsNotFound()
    {
        _mockYouTubeService.Setup(s => s.HasApiKey).Returns(true);
        _mockYouTubeService.Setup(s => s.GetEmbeddableVideoIdAsync("no results", It.IsAny<CancellationToken>()))
            .ReturnsAsync(string.Empty);

        var result = await _controller.Search("no results", CancellationToken.None);

        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task Search_PassesCancellationTokenCorrectly()
    {
        var cts = new CancellationTokenSource();
        _mockYouTubeService.Setup(s => s.HasApiKey).Returns(true);
        _mockYouTubeService.Setup(s => s.GetEmbeddableVideoIdAsync("test", cts.Token))
            .ReturnsAsync("testVideoId");

        await _controller.Search("test", cts.Token);

        _mockYouTubeService.Verify(s => s.GetEmbeddableVideoIdAsync("test", cts.Token), Times.Once);
    }
}
