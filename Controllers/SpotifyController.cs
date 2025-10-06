using Audiora.Services;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System;
using Audiora.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;

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
                return Ok(result.Tracks);
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

        [HttpPost("configure")]
        public IActionResult Configure([FromBody] SpotifyCredentials credentials)
        {
            if (!_env.IsDevelopment())
            {
                return StatusCode(403, new { message = "Configuring Spotify credentials is only allowed in Development." });
            }
            try
            {
                _spotifyService.ConfigureCredentials(credentials);
                return Ok(new { message = "Spotify credentials updated." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "Failed to configure Spotify credentials." });
            }
        }
    }
}
