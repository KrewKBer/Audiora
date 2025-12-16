using Audiora.Data;
using Audiora.Models;
using Audiora.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BCrypt.Net;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace Audiora.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AudioraDbContext _context;
        private readonly DataService<User> _userDataService;

        public AuthController(AudioraDbContext context, DataService<User> userDataService)
        {
            _context = context;
            _userDataService = userDataService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(User user)
        {
            if (await _context.Users.AnyAsync(u => u.Username == user.Username))
            {
                return BadRequest("Username already exists.");
            }

            user.Id = Guid.NewGuid();
            user.Password = BCrypt.Net.BCrypt.HashPassword(user.Password);
            if (user.Genres == null)
                user.Genres = new List<string>();

            await _userDataService.AddAsync(user);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username ?? string.Empty),
                new Claim(ClaimTypes.Role, user.Role.ToString())
            };

            var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
            var authProperties = new AuthenticationProperties
            {
                IsPersistent = true,
                ExpiresUtc = DateTime.UtcNow.AddDays(7)
            };

            await HttpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                new ClaimsPrincipal(claimsIdentity),
                authProperties);

            var userDto = _userDataService.Map(user, u => new UserDto
            {
                UserId = u.Id.ToString(),
                Username = u.Username ?? string.Empty,
                Role = u.Role.ToString()
            });

            return Ok(userDto);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] User loginUser)
        {
            var foundUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == loginUser.Username);

            if (foundUser == null || !BCrypt.Net.BCrypt.Verify(loginUser.Password, foundUser.Password))
            {
                return Unauthorized("Invalid credentials.");
            }

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, foundUser.Id.ToString()),
                new Claim(ClaimTypes.Name, foundUser.Username),
                new Claim(ClaimTypes.Role, foundUser.Role.ToString())
            };

            var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
            var authProperties = new AuthenticationProperties
            {
                IsPersistent = true,
                ExpiresUtc = DateTime.UtcNow.AddDays(7)
            };

            await HttpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                new ClaimsPrincipal(claimsIdentity),
                authProperties);

            return Ok(new { userId = foundUser.Id.ToString(), username = foundUser.Username, role = foundUser.Role });
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Ok();
        }

        [Authorize]
        [HttpGet("user")]
        public async Task<IActionResult> GetUser([FromQuery] string userId)
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (currentUserId != userId)
            {
                return Forbid();
            }

            if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
            {
                return BadRequest("Invalid userId");
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userGuid);
            if (user == null)
                return NotFound();

            return Ok(new
            {
                id = user.Id,
                username = user.Username,
                role = user.Role,
                genres = user.Genres ?? new List<string>(),
                topSongs = user.TopSongs ?? new List<SongInfo>()
            });
        }
        
        [Authorize]
        [HttpPost("update-genres")]
        public async Task<IActionResult> UpdateGenres([FromBody] UpdateGenresRequest req)
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (currentUserId != req.UserId)
            {
                return Forbid();
            }

            if (string.IsNullOrEmpty(req.UserId) || !Guid.TryParse(req.UserId, out var userGuid))
            {
                return BadRequest("Invalid userId");
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userGuid);
            if (user == null)
                return NotFound();

            user.Genres = req.Genres ?? new List<string>();
            await _context.SaveChangesAsync();
            return Ok();
        }

        [Authorize]
        [HttpPost("update-top-songs")]
        public async Task<IActionResult> UpdateTopSongs([FromBody] UpdateTopSongsRequest req)
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (currentUserId != req.UserId)
            {
                return Forbid();
            }

            if (string.IsNullOrEmpty(req.UserId) || !Guid.TryParse(req.UserId, out var userGuid))
            {
                return BadRequest("Invalid userId");
            }
            
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userGuid);
            if (user == null)
                return NotFound();
            
            user.TopSongs = req.TopSongs ?? new List<SongInfo>();
            
            // Explicitly mark the property as modified to ensure EF Core saves it
            _context.Entry(user).Property(u => u.TopSongsJson).IsModified = true;
            
            await _context.SaveChangesAsync();
            
            return Ok();
        }

        public class UpdateGenresRequest
        {
            public string? UserId { get; set; }
            public List<string> Genres { get; set; } = new List<string>();
        }

        public class UpdateTopSongsRequest
        {
            public string? UserId { get; set; }
            public List<SongInfo> TopSongs { get; set; } = new List<SongInfo>();
        }
    }
}
