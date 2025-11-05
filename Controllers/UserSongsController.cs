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
            if (string.IsNullOrEmpty(request.UserId) || !Guid.TryParse(request.UserId, out var userGuid))
            {
                return BadRequest("Invalid userId");
            }

            if (string.IsNullOrEmpty(request.SongId))
            {
                return BadRequest("Invalid data");
            }

            // Check if the song has already been seen by the user
            var existing = await _context.SeenSongs.FirstOrDefaultAsync(s => s.UserId == userGuid && s.SongId == request.SongId);
            if (existing != null)
            {
                // Update the 'Liked' status
                existing.Liked = request.Liked;
            }
            else
            {
                _context.SeenSongs.Add(new SeenSong
                {
                    UserId = userGuid,
                    SongId = request.SongId,
                    Liked = request.Liked
                });
            }
            
            await _context.SaveChangesAsync();
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
        }
    }
}
