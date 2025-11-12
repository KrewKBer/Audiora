using Audiora.Data;
using Audiora.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Audiora.Controllers
{
    [ApiController]
    [Route("api/user-songs")]
    public class UserSongsController : ControllerBase
    {
        private readonly AudioraDbContext _context;

        public UserSongsController(AudioraDbContext context)
        {
            _context = context;
        }

        [HttpGet("seen")]
        public async Task<IActionResult> GetSeenSongs([FromQuery] string userId)
        {
            if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
            {
                return BadRequest("Invalid userId");
            }

            var seenSongs = await _context.SeenSongs
                .Where(s => s.UserId == userGuid)
                .ToListAsync();

            return Ok(seenSongs);
        }

        [HttpPost("seen")]
        public async Task<IActionResult> PostSeenSong([FromBody] SeenSongRequest request)
        {
            Console.WriteLine($"[PostSeenSong] Received request - UserId: {request.UserId}, SongId: {request.SongId}, Liked: {request.Liked}");
            
            if (string.IsNullOrEmpty(request.UserId) || !Guid.TryParse(request.UserId, out var userGuid))
            {
                Console.WriteLine("[PostSeenSong] ERROR: Invalid userId");
                return BadRequest("Invalid userId");
            }

            if (string.IsNullOrEmpty(request.SongId))
            {
                Console.WriteLine("[PostSeenSong] ERROR: Invalid data");
                return BadRequest("Invalid data");
            }

            // Check if the song has already been seen by the user
            var existing = await _context.SeenSongs.FirstOrDefaultAsync(s => s.UserId == userGuid && s.SongId == request.SongId);
            if (existing != null)
            {
                Console.WriteLine($"[PostSeenSong] Updating existing song - Id: {existing.Id}");
                // Update the 'Liked' status and song details
                existing.Liked = request.Liked;
                existing.Name = request.Name;
                existing.Artist = request.Artist;
                existing.AlbumImageUrl = request.AlbumImageUrl;
            }
            else
            {
                Console.WriteLine($"[PostSeenSong] Adding new song - SongId: {request.SongId}");
                _context.SeenSongs.Add(new SeenSong
                {
                    UserId = userGuid,
                    SongId = request.SongId,
                    Liked = request.Liked,
                    Name = request.Name,
                    Artist = request.Artist,
                    AlbumImageUrl = request.AlbumImageUrl
                });
            }
            
            Console.WriteLine("[PostSeenSong] Calling SaveChangesAsync...");
            var savedCount = await _context.SaveChangesAsync();
            Console.WriteLine($"[PostSeenSong] SaveChangesAsync completed - {savedCount} entities saved");
            
            return Ok();
        }

        [HttpDelete("seen")]
        public async Task<IActionResult> DeleteSeenSongs([FromQuery] string userId)
        {
            if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
            {
                return BadRequest("Invalid userId");
            }

            var userSongs = _context.SeenSongs.Where(s => s.UserId == userGuid);
            _context.SeenSongs.RemoveRange(userSongs);
            await _context.SaveChangesAsync();
            
            return Ok();
        }

        [HttpGet("liked")]
        public async Task<IActionResult> GetLikedSongs([FromQuery] string userId)
        {
            if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
            {
                return BadRequest("Invalid userId");
            }

            var likedSongs = await _context.SeenSongs
                .Where(s => s.UserId == userGuid && s.Liked)
                .ToListAsync();

            return Ok(likedSongs);
        }

        public class SeenSongRequest
        {
            public string? UserId { get; set; }
            public string SongId { get; set; } = string.Empty;
            public bool Liked { get; set; }
            public string? Name { get; set; }
            public string? Artist { get; set; }
            public string? AlbumImageUrl { get; set; }
        }
    }
}
