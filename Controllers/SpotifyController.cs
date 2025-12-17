using Audiora.Data;
using Audiora.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System;
using Audiora.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using SpotifyAPI.Web;
using Audiora.Exceptions;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace Audiora.Controllers
{
    [Authorize]
    [ApiController]
    [Route("[controller]")]
    public class SpotifyController : ControllerBase
    {
        private readonly SpotifyService _spotifyService;
        private readonly IWebHostEnvironment _env;
        private readonly AudioraDbContext _context;

        public SpotifyController(SpotifyService spotifyService, IWebHostEnvironment env, AudioraDbContext context)
        {
            _spotifyService = spotifyService;
            _env = env;
            _context = context;
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
            catch (SpotifyApiException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception)
            {
                // Avoid exposing internal details; log is handled in service via ILogger
                return StatusCode(500, new { message = "An error occurred while searching Spotify." });
            }
        }

        [HttpGet("new-releases")]
        public async Task<IActionResult> GetNewReleases()
        {
            try
            {
                Console.WriteLine("Getting new releases...");
                var albums = await _spotifyService.GetNewReleases();
                Console.WriteLine($"Found {albums?.Count ?? 0} albums.");
                return Ok(albums);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting new releases: {ex}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("recommendations")]
        public async Task<IActionResult> GetRecommendations([FromQuery] string userId)
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

            // Load user from database
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userGuid);
            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            var genres = user.Genres ?? new System.Collections.Generic.List<string> { "pop" };
            try
            {
                var tracks = await _spotifyService.GetRecommendations(genres);
                Console.WriteLine($"Got {tracks.Count} tracks from Spotify");
                if (tracks.Count > 0)
                {
                    var firstTrack = tracks[0];
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
                return Ok(tracks);
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
