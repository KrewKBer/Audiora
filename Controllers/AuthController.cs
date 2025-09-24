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
            users.Add(user);
            await WriteUsersToFile(users);

            return Ok(new { message = "User registered successfully", userId = user.Id });
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

            return Ok(new { message = "Login successful", userId = foundUser.Id });
        }
    }
}
