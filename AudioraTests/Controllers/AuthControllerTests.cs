using Audiora.Controllers;
using Audiora.Data;
using Audiora.Models;
using Audiora.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Moq;
using Microsoft.AspNetCore.Authentication;
using OtpNet;

namespace AudioraTests.Controllers
{
    [Trait("Category", "Unit")]
    public class AuthControllerTests : IDisposable
    {
        private readonly AudioraDbContext _context;
        private readonly AuthController _controller;
        private readonly Mock<IAuthenticationService> _authServiceMock;
        private readonly Mock<IServiceProvider> _serviceProviderMock;

        public AuthControllerTests()
        {
            var options = new DbContextOptionsBuilder<AudioraDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new AudioraDbContext(options);
    
            // Create a DataService instance for the controller
            var dataService = new DataService<User>(_context);
            _controller = new AuthController(_context, dataService);

            _authServiceMock = new Mock<IAuthenticationService>();
            _serviceProviderMock = new Mock<IServiceProvider>();
            _serviceProviderMock
                .Setup(s => s.GetService(typeof(IAuthenticationService)))
                .Returns(_authServiceMock.Object);
        }

        private void SetupUser(string userId)
        {
            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId)
            }, "mock"));

            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext 
                { 
                    User = user,
                    RequestServices = _serviceProviderMock.Object
                }
            };
        }

        private void SetupAuthentication()
        {
            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    RequestServices = _serviceProviderMock.Object
                }
            };
        }

        [Fact]
        public async Task Register_WithValidUser_ReturnsOkWithUserData()
        {
            SetupAuthentication();
            var user = new User
            {
                Username = "testuser",
                Password = "password123",
                Role = UserRole.Noob
            };
            
            var result = await _controller.Register(user);
            
            var okResult = Assert.IsType<OkObjectResult>(result);
            var returnValue = okResult.Value;
            Assert.NotNull(returnValue);
        }

        [Fact]
        public async Task Register_WithExistingUsername_ReturnsBadRequest()
        {
            SetupAuthentication();
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
            
            var result = await _controller.Register(newUser);

            var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Username already exists.", badRequestResult.Value);
        }

        [Fact]
        public async Task Login_WithValidCredentials_ReturnsOkWithUserData()
        {
            SetupAuthentication();
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
            
            var result = await _controller.Login(loginUser);
            
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task Login_WithInvalidPassword_ReturnsUnauthorized()
        {
            SetupAuthentication();
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
            
            var result = await _controller.Login(loginUser);
            
            var unauthorizedResult = Assert.IsType<UnauthorizedObjectResult>(result);
            Assert.Equal("Invalid credentials.", unauthorizedResult.Value);
        }

        [Fact]
        public async Task Login_WithNonExistentUser_ReturnsUnauthorized()
        {
            SetupAuthentication();
            var loginUser = new User
            {
                Username = "nonexistent",
                Password = "password"
            };
            
            var result = await _controller.Login(loginUser);
            
            var unauthorizedResult = Assert.IsType<UnauthorizedObjectResult>(result);
            Assert.Equal("Invalid credentials.", unauthorizedResult.Value);
        }

        [Fact]
        public async Task UpdateGenres_WithValidUser_ReturnsOk()
        {
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

            SetupUser(user.Id.ToString());
            var request = new AuthController.UpdateGenresRequest
            {
                UserId = user.Id.ToString(),
                Genres = new List<string> { "pop", "jazz" }
            };

            var result = await _controller.UpdateGenres(request);
            
            Assert.IsType<OkResult>(result);
            var updatedUser = await _context.Users.FindAsync(user.Id);
            Assert.NotNull(updatedUser);
            Assert.NotNull(updatedUser!.Genres);
            Assert.Equal(2, updatedUser.Genres.Count);
            Assert.Contains("pop", updatedUser.Genres);
            Assert.Contains("jazz", updatedUser.Genres);
        }

        [Fact]
        public async Task GetUser_WithValidUserId_ReturnsUser()
        {
            var user = new User
            {
                Id = Guid.NewGuid(),
                Username = "testuser",
                Password = BCrypt.Net.BCrypt.HashPassword("password"),
                Role = UserRole.Noob
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            
            SetupUser(user.Id.ToString());
            var result = await _controller.GetUser(user.Id.ToString());
            
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task GetUser_WithInvalidUserId_ReturnsBadRequest()
        {
            SetupUser("invalid-guid");
            var result = await _controller.GetUser("invalid-guid");
            
            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task SetupTwoFactor_ReturnsOk_WithSecretAndUri()
        {
            // Arrange
            var userId = Guid.NewGuid();
            var user = new User { Id = userId, Username = "testuser" };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            SetupUser(userId.ToString());

            // Act
            var result = await _controller.SetupTwoFactor();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var val = okResult.Value;
            Assert.NotNull(val);
            
            var secretProp = val.GetType().GetProperty("secret");
            Assert.NotNull(secretProp);
            var secret = secretProp.GetValue(val, null) as string;

            var uriProp = val.GetType().GetProperty("uri");
            Assert.NotNull(uriProp);
            var uri = uriProp.GetValue(val, null) as string;
            
            Assert.NotNull(secret);
            Assert.NotNull(uri);
            Assert.Contains(secret, uri);
        }

        [Fact]
        public async Task VerifyTwoFactorSetup_ReturnsOk_WhenCodeIsValid()
        {
            // Arrange
            var userId = Guid.NewGuid();
            var secretKey = KeyGeneration.GenerateRandomKey(20);
            var secret = Base32Encoding.ToString(secretKey);
            var user = new User { Id = userId, Username = "testuser", TwoFactorSecret = secret };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            SetupUser(userId.ToString());

            var totp = new Totp(secretKey);
            var code = totp.ComputeTotp();

            var req = new AuthController.TwoFactorVerifyRequest { Code = code };

            // Act
            var result = await _controller.VerifyTwoFactorSetup(req);

            // Assert
            Assert.IsType<OkResult>(result);
            var dbUser = await _context.Users.FindAsync(userId);
            Assert.NotNull(dbUser);
            Assert.True(dbUser.IsTwoFactorEnabled);
        }

        [Fact]
        public async Task VerifyTwoFactorSetup_ReturnsBadRequest_WhenCodeIsInvalid()
        {
            // Arrange
            var userId = Guid.NewGuid();
            var secretKey = KeyGeneration.GenerateRandomKey(20);
            var secret = Base32Encoding.ToString(secretKey);
            var user = new User { Id = userId, Username = "testuser", TwoFactorSecret = secret };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            SetupUser(userId.ToString());

            var req = new AuthController.TwoFactorVerifyRequest { Code = "000000" };

            // Act
            var result = await _controller.VerifyTwoFactorSetup(req);

            // Assert
            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Invalid code", badRequest.Value);
        }

        [Fact]
        public async Task VerifyTwoFactorLogin_ReturnsOk_WhenCodeIsValid()
        {
            // Arrange
            var userId = Guid.NewGuid();
            var secretKey = KeyGeneration.GenerateRandomKey(20);
            var secret = Base32Encoding.ToString(secretKey);
            var user = new User { Id = userId, Username = "testuser", TwoFactorSecret = secret, IsTwoFactorEnabled = true, Role = UserRole.Noob };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var totp = new Totp(secretKey);
            var code = totp.ComputeTotp();

            var req = new AuthController.TwoFactorLoginRequest { UserId = userId.ToString(), Code = code };
            
            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext 
                { 
                    RequestServices = _serviceProviderMock.Object 
                }
            };

            _authServiceMock.Setup(x => x.SignInAsync(It.IsAny<HttpContext>(), It.IsAny<string>(), It.IsAny<ClaimsPrincipal>(), It.IsAny<AuthenticationProperties>()))
                .Returns(Task.CompletedTask);

            // Act
            var result = await _controller.VerifyTwoFactorLogin(req);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
