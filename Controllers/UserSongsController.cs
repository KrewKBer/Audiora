using Audiora.Data;
using Audiora.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
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
        [Authorize]
        public async Task<IActionResult> GetSeenSongs()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
            {
                return Unauthorized();
            }

            var seenSongs = await _context.SeenSongs
                .Where(s => s.UserId == userGuid)
                .ToListAsync();

            return Ok(seenSongs);
        }

        [HttpPost("seen")]
        [Authorize]
        public async Task<IActionResult> PostSeenSong([FromBody] SeenSongRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
            {
                return Unauthorized();
            }

            if (request == null || string.IsNullOrEmpty(request.SongId))
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
        [Authorize]
        public async Task<IActionResult> DeleteSeenSongs()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
            {
                return Unauthorized();
            }

            var userSongs = _context.SeenSongs.Where(s => s.UserId == userGuid);
            _context.SeenSongs.RemoveRange(userSongs);
            await _context.SaveChangesAsync();
            
            return Ok();
        }

        [HttpGet("liked")]
        [Authorize]
        public async Task<IActionResult> GetLikedSongs()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
            {
                return Unauthorized();
            }

            var likedSongs = await _context.SeenSongs
                .Where(s => s.UserId == userGuid && s.Liked)
                .ToListAsync();

            return Ok(likedSongs);
        }

        public class SeenSongRequest
        {
            public string SongId { get; set; } = string.Empty;
            public bool Liked { get; set; }
        }
    }
}
