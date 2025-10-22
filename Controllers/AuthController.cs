using Audiora.Models;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using BCrypt.Net;

namespace Audiora.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly string _usersFilePath = Path.Combine(Directory.GetCurrentDirectory(), "Data", "users.json");

        private async Task<List<User>> ReadUsersFromFile()
        {
            if (!System.IO.File.Exists(_usersFilePath))
            {
                return new List<User>();
            }

            var json = await System.IO.File.ReadAllTextAsync(_usersFilePath);
            return JsonConvert.DeserializeObject<List<User>>(json) ?? new List<User>();
        }

        private async Task WriteUsersToFile(List<User> users)
        {
            var json = JsonConvert.SerializeObject(users, Formatting.Indented);
            await System.IO.File.WriteAllTextAsync(_usersFilePath, json);
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(User user)
        {
            var users = await ReadUsersFromFile();

            if (users.Any(u => u.Username == user.Username))
            {
                return BadRequest("Username already exists.");
            }

            user.Id = Guid.NewGuid();
            user.Password = BCrypt.Net.BCrypt.HashPassword(user.Password);
            if (user.Genres == null)
                user.Genres = new List<string>();
            users.Add(user);
            await WriteUsersToFile(users);

            return Ok(new { message = "User registered successfully", userId = user.Id, username = user.Username });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(User user)
        {
            var users = await ReadUsersFromFile();
            var foundUser = users.FirstOrDefault(u => u.Username == user.Username);

            if (foundUser == null || !BCrypt.Net.BCrypt.Verify(user.Password, foundUser.Password))
            {
                return Unauthorized("Invalid credentials.");
            }

            return Ok(new { message = "Login successful", userId = foundUser.Id, username = foundUser.Username });
        }

        [HttpGet("user")]
        public async Task<IActionResult> GetUser([FromQuery] string userId)
        {
            var users = await ReadUsersFromFile();
            var user = users.FirstOrDefault(u => u.Id.ToString() == userId);
            if (user == null)
                return NotFound();
            return Ok(new
            {
                id = user.Id,
                username = user.Username,
                genres = user.Genres ?? new List<string>(),
                topSongs = user.TopSongs ?? new List<Audiora.Models.SongInfo>()
            });
        }
        
        [HttpPost("update-genres")]
        public async Task<IActionResult> UpdateGenres([FromBody] UpdateGenresRequest req)
        {
            var users = await ReadUsersFromFile();
            var user = users.FirstOrDefault(u => u.Id.ToString() == req.UserId);
            if (user == null)
                return NotFound();
            user.Genres = req.Genres ?? new List<string>();
            await WriteUsersToFile(users);
            return Ok();
        }

        [HttpPost("update-top-songs")]
        public async Task<IActionResult> UpdateTopSongs([FromBody] UpdateTopSongsRequest req)
        {
            var users = await ReadUsersFromFile();
            var user = users.FirstOrDefault(u => u.Id.ToString() == req.UserId);
            if (user == null)
                return NotFound();
            user.TopSongs = req.TopSongs ?? new List<Audiora.Models.SongInfo>();
            await WriteUsersToFile(users);
            return Ok();
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
