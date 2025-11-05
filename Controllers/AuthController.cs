using Audiora.Data;
using Audiora.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
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

            return Ok(new { message = "User registered successfully", userId = user.Id, username = user.Username });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(User user)
        {
            var foundUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == user.Username);

            if (foundUser == null || !BCrypt.Net.BCrypt.Verify(user.Password, foundUser.Password))
            {
                return Unauthorized("Invalid credentials.");
            }

            return Ok(new { message = "Login successful", userId = foundUser.Id, username = foundUser.Username, role = JsonConvert.SerializeObject(foundUser.Role).Trim('"') });
        }

        [HttpGet("user")]
        public async Task<IActionResult> GetUser([FromQuery] string userId)
        {
            if (!Guid.TryParse(userId, out var userGuid))
            {
                return BadRequest("Invalid user ID format.");
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userGuid);
            if (user == null)
                return NotFound();

            return Ok(new
            {
                id = user.Id,
                username = user.Username,
                role = JsonConvert.SerializeObject(user.Role).Trim('"'),
                genres = user.Genres ?? new List<string>(),
                topSongs = user.TopSongs ?? new List<Audiora.Models.SongInfo>()
            });
        }
        
        [HttpPost("update-genres")]
        public async Task<IActionResult> UpdateGenres([FromBody] UpdateGenresRequest req)
        {
            if (!Guid.TryParse(req.UserId, out var userGuid))
            {
                return BadRequest("Invalid user ID format.");
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
            if (!Guid.TryParse(req.UserId, out var userGuid))
            {
                return BadRequest("Invalid user ID format.");
            }
            
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userGuid);
            if (user == null)
                return NotFound();
            
            // This property is not mapped to the database, so this will only update the object in memory.
            // If you need to persist this, you'll need a different approach.
            user.TopSongs = req.TopSongs ?? new List<Audiora.Models.SongInfo>();
            
            // No SaveChangesAsync() needed if TopSongs is not a DB column.
            // If it were, you would call it here.
            
            return Ok();
        }

        [HttpPost("migrate-data")]
        public async Task<IActionResult> MigrateData()
        {
            // --- Migrate Users ---
            var usersFilePath = Path.Combine(Directory.GetCurrentDirectory(), "Data", "users.json");
            if (System.IO.File.Exists(usersFilePath))
            {
                var userJson = await System.IO.File.ReadAllTextAsync(usersFilePath);
                var oldUsers = JsonConvert.DeserializeObject<List<User>>(userJson) ?? new List<User>();

                foreach (var oldUser in oldUsers)
                {
                    // Check if user already exists by username
                    if (!await _context.Users.AnyAsync(u => u.Username == oldUser.Username))
                    {
                        // The user from JSON already has a hashed password and a Guid, so we can add it directly.
                        _context.Users.Add(oldUser);
                    }
                }
            }

            // --- Migrate Seen Songs ---
            var seenSongsFilePath = Path.Combine(Directory.GetCurrentDirectory(), "Data", "seenSongs.json");
            if (System.IO.File.Exists(seenSongsFilePath))
            {
                var seenSongsJson = await System.IO.File.ReadAllTextAsync(seenSongsFilePath);
                var oldSeenSongs = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, List<SongInteraction>>>(seenSongsJson);

                if (oldSeenSongs != null)
                {
                    foreach (var userEntry in oldSeenSongs)
                    {
                        if (Guid.TryParse(userEntry.Key, out var userId))
                        {
                            foreach (var song in userEntry.Value)
                            {
                                // Check if this specific song interaction already exists
                                if (!await _context.SeenSongs.AnyAsync(s => s.UserId == userId && s.SongId == song.Id))
                                {
                                    _context.SeenSongs.Add(new SeenSong
                                    {
                                        UserId = userId,
                                        SongId = song.Id,
                                        Liked = song.Liked
                                    });
                                }
                            }
                        }
                    }
                }
            }

            await _context.SaveChangesAsync();
            return Ok("Data migration completed.");
        }

        public class UpdateGenresRequest
        {
            public string UserId { get; set; }
            public List<string> Genres { get; set; }
        }

        public class UpdateTopSongsRequest
        {
            public string UserId { get; set; }
            public List<Audiora.Models.SongInfo> TopSongs { get; set; }
        }
        
        
    }
}
