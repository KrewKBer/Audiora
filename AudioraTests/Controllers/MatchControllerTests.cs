using Audiora.Controllers;
using Audiora.Data;
using Audiora.Models;
using Audiora.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace AudioraTests.Controllers
{
    [Trait("Category", "Unit")]
    public class MatchControllerTests : IDisposable
    {
        private readonly AudioraDbContext _context;
        private readonly MatchStore _matchStore;
        private readonly Mock<IHubContext<RoomHub>> _mockHubContext;
        private readonly MatchController _controller;

        public MatchControllerTests()
        {
            var options = new DbContextOptionsBuilder<AudioraDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new AudioraDbContext(options);

            // Mock IWebHostEnvironment for MatchStore
            var mockEnv = new Mock<IWebHostEnvironment>();
            mockEnv.Setup(e => e.ContentRootPath).Returns(Path.GetTempPath());
            _matchStore = new MatchStore(mockEnv.Object);
    
            _mockHubContext = new Mock<IHubContext<RoomHub>>();

            // Setup mock for SignalR Groups
            var mockClients = new Mock<IHubClients>();
            var mockClientProxy = new Mock<IClientProxy>();
            _mockHubContext.Setup(x => x.Clients.Group(It.IsAny<string>())).Returns(mockClientProxy.Object);

            _controller = new MatchController(_matchStore, _context, _mockHubContext.Object);
        }
        [Fact]
        public async Task GetCandidates_WithNoExistingMatches_ReturnsAllOtherUsers()
        {
            var userId = Guid.NewGuid();
            var user1 = new User
            {
                Id = Guid.NewGuid(),
                Username = "user1",
                Password = BCrypt.Net.BCrypt.HashPassword("password"),
                Role = UserRole.Noob,
                TopSongs = new List<SongInfo>
                {
                    new SongInfo
                    {
                        Id = Guid.NewGuid().ToString(),
                        Name = "Song1",
                        Artist = "Artist1",
                        AlbumImageUrl = null
                    }
                }
            };
            _context.Users.Add(user1);
            await _context.SaveChangesAsync();

            var result = await _controller.GetCandidates(userId.ToString());

            var okResult = Assert.IsType<OkObjectResult>(result);
            var candidates = Assert.IsAssignableFrom<IEnumerable<object>>(okResult.Value);
            Assert.NotEmpty(candidates);
        }

        [Fact]
        public async Task GetCandidates_ExcludesLikedUsers()
        {
            var userId = Guid.NewGuid().ToString();
            var targetId = Guid.NewGuid().ToString();
            
            await _matchStore.LikeAsync(userId, targetId);

            var result = await _controller.GetCandidates(userId);

            var okResult = Assert.IsType<OkObjectResult>(result);
            var candidates = Assert.IsAssignableFrom<IEnumerable<object>>(okResult.Value);
            Assert.DoesNotContain(candidates, c => c.GetType().GetProperty("id")?.GetValue(c)?.ToString() == targetId);
        }

        [Fact]
        public async Task Like_WithNewLike_ReturnsLikedStatus()
        {
            var request = new MatchController.LikeRequest
            {
                UserId = Guid.NewGuid().ToString(),
                TargetUserId = Guid.NewGuid().ToString()
            };

            var result = await _controller.Like(request);

            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task Like_WhenMutualLike_ReturnsMatchedStatus()
        {
            var userAId = Guid.NewGuid().ToString();
            var userBId = Guid.NewGuid().ToString();
            
            await _matchStore.LikeAsync(userBId, userAId);

            var request = new MatchController.LikeRequest
            {
                UserId = userAId,
                TargetUserId = userBId
            };

            var result = await _controller.Like(request);

            var okResult = Assert.IsType<OkObjectResult>(result);
            var value = okResult.Value;
            var statusProp = value?.GetType().GetProperty("status");
            Assert.Equal("matched", statusProp?.GetValue(value));
        }

        [Fact]
        public async Task Like_WithEmptyUserIds_ReturnsBadRequest()
        {
            var request = new MatchController.LikeRequest
            {
                UserId = "",
                TargetUserId = ""
            };

            var result = await _controller.Like(request);

            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task List_ReturnsAllMatchesForUser()
        {
            var userAId = Guid.NewGuid().ToString();
            var userBId = Guid.NewGuid().ToString();
            
            var userB = new User
            {
                Id = Guid.Parse(userBId),
                Username = "userB",
                Password = BCrypt.Net.BCrypt.HashPassword("password"),
                Role = UserRole.Noob
            };
            _context.Users.Add(userB);
            await _context.SaveChangesAsync();

            await _matchStore.LikeAsync(userAId, userBId);
            await _matchStore.LikeAsync(userBId, userAId);

            SetupUser(userAId);
            var result = await _controller.List(userAId);

            var okResult = Assert.IsType<OkObjectResult>(result);
            var matches = Assert.IsAssignableFrom<IEnumerable<object>>(okResult.Value);
            Assert.Single(matches);
        }

        [Fact]
        public async Task List_WithNoMatches_ReturnsEmptyList()
        {
            var userId = Guid.NewGuid().ToString();

            SetupUser(userId);
            var result = await _controller.List(userId);

            var okResult = Assert.IsType<OkObjectResult>(result);
            var matches = Assert.IsAssignableFrom<IEnumerable<object>>(okResult.Value);
            Assert.Empty(matches);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }

        private void SetupUser(string userId)
        {
            var claims = new List<System.Security.Claims.Claim>
            {
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, userId)
            };
            var identity = new System.Security.Claims.ClaimsIdentity(claims, "TestAuthType");
            var claimsPrincipal = new System.Security.Claims.ClaimsPrincipal(identity);

            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = claimsPrincipal }
            };
        }
    }
}
