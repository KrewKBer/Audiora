using Audiora.Controllers;
using Audiora.Data;
using Audiora.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace AudioraTests.Controllers
{
    public class AuthControllerTests
    {
        private readonly AudioraDbContext _context;
        private readonly AuthController _controller;

        public AuthControllerTests()
        {
            var options = new DbContextOptionsBuilder<AudioraDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new AudioraDbContext(options);
            _controller = new AuthController(_context);
        }

        [Fact]
        public async Task Register_WithValidUser_ReturnsOkWithUserData()
        {
            // Arrange
            var user = new User
            {
                Username = "testuser",
                Password = "password123",
                Role = UserRole.Noob
            };

            // Act
            var result = await _controller.Register(user);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var returnValue = okResult.Value;
            Assert.NotNull(returnValue);
        }

        [Fact]
        public async Task Register_WithExistingUsername_ReturnsBadRequest()
        {
            // Arrange
            var existingUser = new User
            {
                Id = Guid.NewGuid(),
                Username = "testuser",
                Password = BCrypt.Net.BCrypt.HashPassword("password"),
                Role = UserRole.Noob
            };
            _context.Users.Add(existingUser);
            await _context.SaveChangesAsync();

            var newUser = new User
            {
                Username = "testuser",
                Password = "password123",
                Role = UserRole.Noob
            };

            // Act
            var result = await _controller.Register(newUser);

            // Assert
            var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Username already exists.", badRequestResult.Value);
        }

        [Fact]
        public async Task Login_WithValidCredentials_ReturnsOkWithUserData()
        {
            // Arrange
            var password = "password123";
            var user = new User
            {
                Id = Guid.NewGuid(),
                Username = "testuser",
                Password = BCrypt.Net.BCrypt.HashPassword(password),
                Role = UserRole.Noob
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var loginUser = new User
            {
                Username = "testuser",
                Password = password
            };

            // Act
            var result = await _controller.Login(loginUser);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task Login_WithInvalidPassword_ReturnsUnauthorized()
        {
            // Arrange
            var user = new User
            {
                Id = Guid.NewGuid(),
                Username = "testuser",
                Password = BCrypt.Net.BCrypt.HashPassword("correctpassword"),
                Role = UserRole.Noob
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var loginUser = new User
            {
                Username = "testuser",
                Password = "wrongpassword"
            };

            // Act
            var result = await _controller.Login(loginUser);

            // Assert
            var unauthorizedResult = Assert.IsType<UnauthorizedObjectResult>(result);
            Assert.Equal("Invalid credentials.", unauthorizedResult.Value);
        }

        [Fact]
        public async Task Login_WithNonExistentUser_ReturnsUnauthorized()
        {
            // Arrange
            var loginUser = new User
            {
                Username = "nonexistent",
                Password = "password"
            };

            // Act
            var result = await _controller.Login(loginUser);

            // Assert
            var unauthorizedResult = Assert.IsType<UnauthorizedObjectResult>(result);
            Assert.Equal("Invalid credentials.", unauthorizedResult.Value);
        }

        [Fact]
        public async Task UpdateGenres_WithValidUser_ReturnsOk()
        {
            // Arrange
            var user = new User
            {
                Id = Guid.NewGuid(),
                Username = "testuser",
                Password = BCrypt.Net.BCrypt.HashPassword("password"),
                Role = UserRole.Noob,
                Genres = new List<string> { "rock" }
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var request = new AuthController.UpdateGenresRequest
            {
                UserId = user.Id.ToString(),
                Genres = new List<string> { "pop", "jazz" }
            };

            // Act
            var result = await _controller.UpdateGenres(request);

            // Assert
            Assert.IsType<OkResult>(result);
            var updatedUser = await _context.Users.FindAsync(user.Id);
            Assert.Equal(2, updatedUser.Genres.Count);
            Assert.Contains("pop", updatedUser.Genres);
            Assert.Contains("jazz", updatedUser.Genres);
        }

        [Fact]
        public async Task GetUser_WithValidUserId_ReturnsUser()
        {
            // Arrange
            var user = new User
            {
                Id = Guid.NewGuid(),
                Username = "testuser",
                Password = BCrypt.Net.BCrypt.HashPassword("password"),
                Role = UserRole.Noob
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.GetUser(user.Id.ToString());

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task GetUser_WithInvalidUserId_ReturnsBadRequest()
        {
            // Act
            var result = await _controller.GetUser("invalid-guid");

            // Assert
            Assert.IsType<BadRequestObjectResult>(result);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
