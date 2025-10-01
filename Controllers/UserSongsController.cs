using Audiora.Models;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;

namespace Audiora.Controllers
{
    public class SongInteraction
    {
        public int Id { get; set; }
        public bool Liked { get; set; }
    }

    public class UserSongInteraction
    {
        public string? UserId { get; set; }
        public SongInteraction? Song { get; set; }
    }

    [ApiController]
    [Route("api/user-songs")]
    public class UserSongsController : ControllerBase
    {
        private const string SeenSongsPath = "Data/seenSongs.json";
        private const string SongsPath = "Data/songs.json";

        private Dictionary<string, List<SongInteraction>> ReadUserInteractions()
        {
            if (!System.IO.File.Exists(SeenSongsPath) || new FileInfo(SeenSongsPath).Length == 0)
            {
                return new Dictionary<string, List<SongInteraction>>();
            }
            var json = System.IO.File.ReadAllText(SeenSongsPath);
            if (string.IsNullOrWhiteSpace(json))
            {
                return new Dictionary<string, List<SongInteraction>>();
            }
            try
            {
                return JsonSerializer.Deserialize<Dictionary<string, List<SongInteraction>>>(json) ?? new Dictionary<string, List<SongInteraction>>();
            }
            catch (JsonException)
            {
                // If the file is malformed, treat it as empty
                return new Dictionary<string, List<SongInteraction>>();
            }
        }

        private void WriteUserInteractions(Dictionary<string, List<SongInteraction>> interactions)
        {
            var json = JsonSerializer.Serialize(interactions, new JsonSerializerOptions { WriteIndented = true });
            System.IO.File.WriteAllText(SeenSongsPath, json);
        }

        [HttpGet("seen")]
        public IActionResult GetSeenSongs([FromQuery] string userId)
        {
            var allInteractions = ReadUserInteractions();
            if (allInteractions.TryGetValue(userId, out var userInteractions))
            {
                return Ok(userInteractions);
            }
            return Ok(Enumerable.Empty<SongInteraction>());
        }

        [HttpPost("seen")]
        public IActionResult PostSeenSong([FromBody] UserSongInteraction newSeenSong)
        {
            if (newSeenSong?.UserId == null || newSeenSong.Song == null)
            {
                return BadRequest("Invalid data");
            }

            var allInteractions = ReadUserInteractions();
            if (!allInteractions.TryGetValue(newSeenSong.UserId, out var userInteractions))
            {
                userInteractions = new List<SongInteraction>();
                allInteractions[newSeenSong.UserId] = userInteractions;
            }
            
            userInteractions.Add(newSeenSong.Song);
            WriteUserInteractions(allInteractions);
            return Ok();
        }

        [HttpDelete("seen")]
        public IActionResult DeleteSeenSongs([FromQuery] string userId)
        {
            var allInteractions = ReadUserInteractions();
            if (allInteractions.Remove(userId))
            {
                WriteUserInteractions(allInteractions);
            }
            return Ok();
        }

        [HttpGet("liked")]
        public IActionResult GetLikedSongs([FromQuery] string userId)
        {
            var allInteractions = ReadUserInteractions();
            if (!allInteractions.TryGetValue(userId, out var userInteractions))
            {
                return Ok(new List<Song>());
            }

            var likedSongIds = userInteractions
                .Where(s => s.Liked)
                .Select(s => s.Id)
                .ToHashSet();

            if (!likedSongIds.Any())
            {
                return Ok(new List<Song>());
            }

            var songsJson = System.IO.File.ReadAllText(SongsPath);
            var songsDocument = JsonDocument.Parse(songsJson);
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };
            var allSongs = JsonSerializer.Deserialize<List<Song>>(songsDocument.RootElement.GetProperty("songs").GetRawText(), options);

            var likedSongs = allSongs
                .Where(song => likedSongIds.Contains(song.Id))
                .ToList();

            return Ok(likedSongs);
        }
    }
}
