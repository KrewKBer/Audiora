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
        private readonly Mock<IHubContext<RoomHub>> _mockHubContext;
        private readonly MatchController _controller;

        public MatchControllerTests()
        {
            var options = new DbContextOptionsBuilder<AudioraDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new AudioraDbContext(options);

            _mockHubContext = new Mock<IHubContext<RoomHub>>();

            // Setup mock for SignalR Groups
            var mockClients = new Mock<IHubClients>();
            var mockClientProxy = new Mock<IClientProxy>();
            _mockHubContext.Setup(x => x.Clients.Group(It.IsAny<string>())).Returns(mockClientProxy.Object);

            _controller = new MatchController(_context, _mockHubContext.Object);
        }
        [Fact]
        public async Task GetCandidates_WithNoExistingMatches_ReturnsAllOtherUsers()
        {
            var userId = Guid.NewGuid();
            var currentUser = new User
            {
                Id = userId,
                Username = "currentuser",
                Password = BCrypt.Net.BCrypt.HashPassword("password"),
                Role = UserRole.Noob,
                Gender = Gender.Male,
                Preference = SexualityPreference.Everyone
            };
            _context.Users.Add(currentUser);

            var user1 = new User
            {
                Id = Guid.NewGuid(),
                Username = "user1",
                Password = BCrypt.Net.BCrypt.HashPassword("password"),
                Role = UserRole.Noob,
                Gender = Gender.Female,
                Preference = SexualityPreference.Everyone,
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

            SetupUser(userId.ToString());

            var result = await _controller.GetCandidates(userId.ToString());

            var okResult = Assert.IsType<OkObjectResult>(result);
            var candidates = Assert.IsAssignableFrom<IEnumerable<object>>(okResult.Value);
            Assert.NotEmpty(candidates);
        }

        [Fact]
        public async Task GetCandidates_ExcludesLikedUsers()
        {
            var userId = Guid.NewGuid();
            var targetId = Guid.NewGuid();
            
            var currentUser = new User
            {
                Id = userId,
                Username = "currentuser",
                Password = BCrypt.Net.BCrypt.HashPassword("password"),
                Role = UserRole.Noob,
                Gender = Gender.Male,
                Preference = SexualityPreference.Everyone
            };
            _context.Users.Add(currentUser);
        
            _context.Likes.Add(new Like { FromUserId = userId, ToUserId = targetId, Timestamp = DateTime.UtcNow });
            await _context.SaveChangesAsync();
        
            SetupUser(userId.ToString());
        
            var result = await _controller.GetCandidates(userId.ToString());
        
            var okResult = Assert.IsType<OkObjectResult>(result);
            var candidates = Assert.IsAssignableFrom<IEnumerable<object>>(okResult.Value);
            Assert.DoesNotContain(candidates, c => c.GetType().GetProperty("id")?.GetValue(c)?.ToString() == targetId.ToString());
        }
        
        [Fact]
        public async Task Like_WithNewLike_ReturnsLikedStatus()
        {
            var userId = Guid.NewGuid().ToString();
            SetupUser(userId);
            var request = new MatchController.LikeRequest
            {
                UserId = userId,
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
            SetupUser(userAId);
            var userBId = Guid.NewGuid().ToString();
            
            _context.Likes.Add(new Like { FromUserId = Guid.Parse(userBId), ToUserId = Guid.Parse(userAId), Timestamp = DateTime.UtcNow });
            await _context.SaveChangesAsync();

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
            SetupUser("");
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

            _context.Matches.Add(new Audiora.Data.Match { UserAId = Guid.Parse(userAId), UserBId = Guid.Parse(userBId), CreatedAt = DateTime.UtcNow, ChatId = "chat_id" });
            await _context.SaveChangesAsync();

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
