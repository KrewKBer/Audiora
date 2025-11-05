using Audiora.Data;
using Audiora.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
            if (!Guid.TryParse(userId, out var userGuid))
            {
                return BadRequest("Invalid user ID format.");
            }

            var seenSongs = await _context.SeenSongs
                .Where(s => s.UserId == userGuid)
                .ToListAsync();

            return Ok(seenSongs);
        }

        [HttpPost("seen")]
        public async Task<IActionResult> PostSeenSong([FromBody] SeenSong newSeenSong)
        {
            if (newSeenSong == null || newSeenSong.UserId == Guid.Empty || string.IsNullOrEmpty(newSeenSong.SongId))
            {
                return BadRequest("Invalid data");
            }

            // Optional: Check if the song has already been seen by the user to avoid duplicates
            var existing = await _context.SeenSongs.FirstOrDefaultAsync(s => s.UserId == newSeenSong.UserId && s.SongId == newSeenSong.SongId);
            if (existing != null)
            {
                // If it exists, maybe update the 'Liked' status
                existing.Liked = newSeenSong.Liked;
            }
            else
            {
                _context.SeenSongs.Add(newSeenSong);
            }
            
            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpDelete("seen")]
        public async Task<IActionResult> DeleteSeenSongs([FromQuery] string userId)
        {
            if (!Guid.TryParse(userId, out var userGuid))
            {
                return BadRequest("Invalid user ID format.");
            }

            var userSongs = _context.SeenSongs.Where(s => s.UserId == userGuid);
            _context.SeenSongs.RemoveRange(userSongs);
            await _context.SaveChangesAsync();
            
            return Ok();
        }

        [HttpGet("liked")]
        public async Task<IActionResult> GetLikedSongs([FromQuery] string userId)
        {
            if (!Guid.TryParse(userId, out var userGuid))
            {
                return BadRequest("Invalid user ID format.");
            }

            var likedSongs = await _context.SeenSongs
                .Where(s => s.UserId == userGuid && s.Liked)
                .ToListAsync();

            return Ok(likedSongs);
        }
    }
}
