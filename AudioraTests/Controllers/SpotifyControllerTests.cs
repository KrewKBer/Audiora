using Audiora.Controllers;
using Audiora.Data;
using Audiora.Models;
using Audiora.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using SpotifyAPI.Web;
using System.Security.Claims;
using Xunit;
using Audiora.Exceptions;
using Microsoft.AspNetCore.Http;

namespace AudioraTests.Controllers
{
    public class SpotifyControllerTests : IDisposable
    {
        private readonly AudioraDbContext _context;
        private readonly Mock<SpotifyService> _spotifyServiceMock;
        private readonly Mock<IWebHostEnvironment> _envMock;
        private readonly SpotifyController _controller;

        public SpotifyControllerTests()
        {
            var options = new DbContextOptionsBuilder<AudioraDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new AudioraDbContext(options);

            var configMock = new Mock<Microsoft.Extensions.Configuration.IConfiguration>();
            var loggerMock = new Mock<Microsoft.Extensions.Logging.ILogger<SpotifyService>>();
            
            _spotifyServiceMock = new Mock<SpotifyService>(configMock.Object, loggerMock.Object);
            _envMock = new Mock<IWebHostEnvironment>();

            _controller = new SpotifyController(_spotifyServiceMock.Object, _envMock.Object, _context, configMock.Object);
        }

        private void SetupUser(string userId)
        {
            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId)
            }, "mock"));

            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }

        [Fact]
        public async Task Search_ReturnsOk_WithItems()
        {
            // Arrange
            var query = "test song";
            var searchResponse = new SearchResponse { Tracks = new Paging<FullTrack, SearchResponse> { Items = new List<FullTrack> { new FullTrack { Name = "Test Track" } } } };
            
            _spotifyServiceMock.Setup(s => s.SearchTracks(query))
                .ReturnsAsync(searchResponse);

            // Act
            var result = await _controller.Search(query);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task Search_ReturnsBadRequest_WhenQueryIsEmpty()
        {
            // Act
            var result = await _controller.Search("");

            // Assert
            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Search query cannot be empty.", badRequest.Value);
        }

        [Fact]
        public async Task Search_ReturnsBadRequest_OnSpotifyApiException()
        {
            // Arrange
            _spotifyServiceMock.Setup(s => s.SearchTracks(It.IsAny<string>()))
                .ThrowsAsync(new SpotifyApiException("API Error", new Exception("Inner")));

            // Act
            var result = await _controller.Search("test");

            // Assert
            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            // Check message property via reflection or dynamic if needed, or just type
        }

        [Fact]
        public async Task GetRecommendations_ReturnsOk_WithTracks()
        {
            // Arrange
            var userId = Guid.NewGuid();
            var user = new User { Id = userId, Genres = new List<string> { "pop" } };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            SetupUser(userId.ToString());

            var tracks = new List<FullTrack> { new FullTrack { Name = "Rec Track" } };
            _spotifyServiceMock.Setup(s => s.GetRecommendations(It.IsAny<List<string>>()))
                .ReturnsAsync(tracks);

            // Act
            var result = await _controller.GetRecommendations(userId.ToString());

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var returnedTracks = Assert.IsType<List<FullTrack>>(okResult.Value);
            Assert.Single(returnedTracks);
        }

        [Fact]
        public async Task GetRecommendations_ReturnsForbid_WhenUserIdsMismatch()
        {
            // Arrange
            var userId = Guid.NewGuid();
            SetupUser(Guid.NewGuid().ToString()); // Different user

            // Act
            var result = await _controller.GetRecommendations(userId.ToString());

            // Assert
            Assert.IsType<ForbidResult>(result);
        }
        
        [Fact]
        public async Task GetRecommendations_ReturnsNotFound_WhenUserDoesNotExist()
        {
            // Arrange
            var userId = Guid.NewGuid();
            SetupUser(userId.ToString());

            // Act
            var result = await _controller.GetRecommendations(userId.ToString());

            // Assert
            Assert.IsType<NotFoundObjectResult>(result);
        }
    }
}
