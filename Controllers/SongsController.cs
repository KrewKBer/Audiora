using Audiora.Models;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;

namespace Audiora.Controllers
{
    [ApiController]
    [Route("songs")]
    public class SongsController : ControllerBase
    {
        private const string SongsPath = "Data/songs.json";

        [HttpGet]
        public IActionResult Get()
        {
            if (!System.IO.File.Exists(SongsPath))
            {
                return NotFound();
            }

            var json = System.IO.File.ReadAllText(SongsPath);
            var songsDocument = JsonDocument.Parse(json);
            if (songsDocument.RootElement.TryGetProperty("songs", out var songsElement))
            {
                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                };
                var songs = JsonSerializer.Deserialize<List<Song>>(songsElement.GetRawText(), options);
                return Ok(songs);
            }

            return NotFound();
        }
    }
}
