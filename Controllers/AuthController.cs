using Audiora.Data;
using Audiora.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BCrypt.Net;

namespace Audiora.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AudioraDbContext _context;

        public AuthController(AudioraDbContext context)
        {
            _context = context;
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

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { userId = user.Id.ToString(), username = user.Username, role = user.Role });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] User loginUser)
        {
            var foundUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == loginUser.Username);

            if (foundUser == null || !BCrypt.Net.BCrypt.Verify(loginUser.Password, foundUser.Password))
            {
                return Unauthorized("Invalid credentials.");
            }

            return Ok(new { userId = foundUser.Id.ToString(), username = foundUser.Username, role = foundUser.Role });
        }

        [HttpGet("user")]
        public async Task<IActionResult> GetUser([FromQuery] string userId)
        {
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
        
        [HttpPost("update-genres")]
        public async Task<IActionResult> UpdateGenres([FromBody] UpdateGenresRequest req)
        {
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

        [HttpPost("update-top-songs")]
        public async Task<IActionResult> UpdateTopSongs([FromBody] UpdateTopSongsRequest req)
        {
            if (string.IsNullOrEmpty(req.UserId) || !Guid.TryParse(req.UserId, out var userGuid))
            {
                return BadRequest("Invalid userId");
            }
            
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userGuid);
            if (user == null)
                return NotFound();
            
            user.TopSongs = req.TopSongs ?? new List<SongInfo>();
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
