using Audiora.Services;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System;
using Audiora.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using SpotifyAPI.Web;

namespace Audiora.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class SpotifyController : ControllerBase
    {
        private readonly SpotifyService _spotifyService;
        private readonly IWebHostEnvironment _env;

        public SpotifyController(SpotifyService spotifyService, IWebHostEnvironment env)
        {
            _spotifyService = spotifyService;
            _env = env;
        }

        [HttpGet("search")]
        public async Task<IActionResult> Search(string query)
        {
            if (string.IsNullOrEmpty(query))
            {
                return BadRequest("Search query cannot be empty.");
            }
            try
            {
                var result = await _spotifyService.SearchTracks(query);
                return Ok(new { items = result.Tracks.Items });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception)
            {
                // Avoid exposing internal details; log is handled in service via ILogger
                return StatusCode(500, new { message = "An error occurred while searching Spotify." });
            }
        }

        [HttpGet("recommendations")]
        public async Task<IActionResult> GetRecommendations([FromQuery] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return BadRequest("UserId is required.");
            }
            // Load user from file
            var usersFilePath = System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "Data", "users.json");
            if (!System.IO.File.Exists(usersFilePath))
            {
                return StatusCode(500, new { message = "User data not found." });
            }
            var json = await System.IO.File.ReadAllTextAsync(usersFilePath);
            var users = Newtonsoft.Json.JsonConvert.DeserializeObject<System.Collections.Generic.List<Audiora.Models.User>>(json) ?? new System.Collections.Generic.List<Audiora.Models.User>();
            var user = users.Find(u => u.Id.ToString() == userId);
            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }
            var genres = user.Genres ?? new System.Collections.Generic.List<string> { "pop" };
            try
            {
                var result = await _spotifyService.GetRecommendations(genres);
                Console.WriteLine($"Got {result.Tracks.Count} tracks from Spotify");
                if (result.Tracks.Count > 0)
                {
                    var firstTrack = result.Tracks[0];
                    Console.WriteLine($"First track: {firstTrack.Name}");
                    Console.WriteLine($"First track ID: {firstTrack.Id}");
                    Console.WriteLine($"Preview URL: {firstTrack.PreviewUrl ?? "NULL"}");
                    Console.WriteLine($"Track Object Type: {firstTrack.GetType().Name}");
                    if (firstTrack is FullTrack fullTrack)
                    {
                        Console.WriteLine("It's a FullTrack");
                        Console.WriteLine($"External URLs: {fullTrack.ExternalUrls?.Count ?? 0}");
                    }
                }
                return Ok(result.Tracks);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"An error occurred while getting recommendations from Spotify: {ex.Message}" });
            }
        }
    }
}
