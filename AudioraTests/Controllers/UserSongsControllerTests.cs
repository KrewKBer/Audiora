using Audiora.Controllers;
using Audiora.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;
using Microsoft.AspNetCore.Http;

namespace AudioraTests.Controllers
{
    [Trait("Category", "Unit")]
    public class UserSongsControllerTests : IDisposable
    {
        private readonly AudioraDbContext _context;
        private readonly UserSongsController _controller;

        public UserSongsControllerTests()
        {
            var options = new DbContextOptionsBuilder<AudioraDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new AudioraDbContext(options);
            _controller = new UserSongsController(_context);
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

        [Fact]
        public async Task GetSeenSongs_WithValidUserId_ReturnsOk()
        {
            var userId = Guid.NewGuid();
            SetupUser(userId.ToString());
            _context.SeenSongs.Add(new SeenSong
            {
                UserId = userId,
                SongId = "song1",
                Liked = true,
                Name = "Test Song",
                Artist = "Test Artist"
            });
            await _context.SaveChangesAsync();

            var result = await _controller.GetSeenSongs(userId.ToString());

            var okResult = Assert.IsType<OkObjectResult>(result);
            var songs = Assert.IsAssignableFrom<List<SeenSong>>(okResult.Value);
            Assert.Single(songs);
        }

        [Fact]
        public async Task GetSeenSongs_WithInvalidUserId_ReturnsBadRequest()
        {
            SetupUser("invalid-guid");
            var result = await _controller.GetSeenSongs("invalid-guid");

            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Invalid userId", badRequest.Value);
        }

        [Fact]
        public async Task GetSeenSongs_WithEmptyUserId_ReturnsBadRequest()
        {
            SetupUser("");
            var result = await _controller.GetSeenSongs("");

            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Invalid userId", badRequest.Value);
        }

        [Fact]
        public async Task PostSeenSong_WithNewSong_AddsToDatabase()
        {
            var userId = Guid.NewGuid().ToString();
            SetupUser(userId);
            var request = new UserSongsController.SeenSongRequest
            {
                UserId = userId,
                SongId = "song1",
                Liked = true,
                Name = "Test Song",
                Artist = "Test Artist",
                AlbumImageUrl = "http://example.com/image.jpg"
            };

            var result = await _controller.PostSeenSong(request);

            Assert.IsType<OkResult>(result);
            var saved = await _context.SeenSongs.FirstOrDefaultAsync(s => s.SongId == "song1");
            Assert.NotNull(saved);
            Assert.True(saved.Liked);
            Assert.Equal("Test Song", saved.Name);
        }

        [Fact]
        public async Task PostSeenSong_WithExistingSong_UpdatesRecord()
        {
            var userId = Guid.NewGuid();
            SetupUser(userId.ToString());
            _context.SeenSongs.Add(new SeenSong
            {
                UserId = userId,
                SongId = "song1",
                Liked = false,
                Name = "Old Name",
                Artist = "Old Artist"
            });
            await _context.SaveChangesAsync();

            var request = new UserSongsController.SeenSongRequest
            {
                UserId = userId.ToString(),
                SongId = "song1",
                Liked = true,
                Name = "New Name",
                Artist = "New Artist",
                AlbumImageUrl = "http://example.com/new.jpg"
            };

            var result = await _controller.PostSeenSong(request);

            Assert.IsType<OkResult>(result);
            var updated = await _context.SeenSongs.FirstOrDefaultAsync(s => s.SongId == "song1");
            Assert.NotNull(updated);
            Assert.True(updated.Liked);
            Assert.Equal("New Name", updated.Name);
            Assert.Equal("New Artist", updated.Artist);
        }

        [Fact]
        public async Task PostSeenSong_WithInvalidUserId_ReturnsBadRequest()
        {
            SetupUser("invalid-guid");
            var request = new UserSongsController.SeenSongRequest
            {
                UserId = "invalid-guid",
                SongId = "song1",
                Liked = true
            };

            var result = await _controller.PostSeenSong(request);

            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Invalid userId", badRequest.Value);
        }

        [Fact]
        public async Task PostSeenSong_WithEmptySongId_ReturnsBadRequest()
        {
            var userId = Guid.NewGuid().ToString();
            SetupUser(userId);
            var request = new UserSongsController.SeenSongRequest
            {
                UserId = userId,
                SongId = "",
                Liked = true
            };

            var result = await _controller.PostSeenSong(request);

            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Invalid data", badRequest.Value);
        }

        [Fact]
        public async Task DeleteSeenSongs_WithValidUserId_RemovesAllUserSongs()
        {
            var userId = Guid.NewGuid();            SetupUser(userId.ToString());            _context.SeenSongs.AddRange(
                new SeenSong { UserId = userId, SongId = "song1", Liked = true },
                new SeenSong { UserId = userId, SongId = "song2", Liked = false },
                new SeenSong { UserId = Guid.NewGuid(), SongId = "song3", Liked = true }
            );
            await _context.SaveChangesAsync();

            var result = await _controller.DeleteSeenSongs(userId.ToString());

            Assert.IsType<OkResult>(result);
            var remaining = await _context.SeenSongs.Where(s => s.UserId == userId).ToListAsync();
            Assert.Empty(remaining);
            var otherUser = await _context.SeenSongs.Where(s => s.SongId == "song3").ToListAsync();
            Assert.Single(otherUser);
        }

        [Fact]
        public async Task DeleteSeenSongs_WithInvalidUserId_ReturnsBadRequest()
        {
            SetupUser("invalid-guid");
            var result = await _controller.DeleteSeenSongs("invalid-guid");

            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Invalid userId", badRequest.Value);
        }

        [Fact]
        public async Task GetLikedSongs_WithValidUserId_ReturnsOnlyLikedSongs()
        {
            var userId = Guid.NewGuid();
            SetupUser(userId.ToString());
            _context.SeenSongs.AddRange(
                new SeenSong { UserId = userId, SongId = "song1", Liked = true, Name = "Liked Song" },
                new SeenSong { UserId = userId, SongId = "song2", Liked = false, Name = "Not Liked Song" },
                new SeenSong { UserId = userId, SongId = "song3", Liked = true, Name = "Another Liked Song" }
            );
            await _context.SaveChangesAsync();

            var result = await _controller.GetLikedSongs(userId.ToString());

            var okResult = Assert.IsType<OkObjectResult>(result);
            var songs = Assert.IsAssignableFrom<List<SeenSong>>(okResult.Value);
            Assert.Equal(2, songs.Count);
            Assert.All(songs, s => Assert.True(s.Liked));
        }

        [Fact]
        public async Task GetLikedSongs_WithInvalidUserId_ReturnsBadRequest()
        {
            SetupUser("invalid-guid");
            var result = await _controller.GetLikedSongs("invalid-guid");

            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Invalid userId", badRequest.Value);
        }

        [Fact]
        public async Task GetLikedSongs_WithNoLikedSongs_ReturnsEmptyList()
        {
            var userId = Guid.NewGuid();
            SetupUser(userId.ToString());
            _context.SeenSongs.Add(new SeenSong
            {
                UserId = userId,
                SongId = "song1",
                Liked = false
            });
            await _context.SaveChangesAsync();

            var result = await _controller.GetLikedSongs(userId.ToString());

            var okResult = Assert.IsType<OkObjectResult>(result);
            var songs = Assert.IsAssignableFrom<List<SeenSong>>(okResult.Value);
            Assert.Empty(songs);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
