using Audiora.Models;
using Audiora.Data;
using Audiora.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace Audiora.Controllers;

[Authorize]
[ApiController]
[Route("api/match")]
public class MatchController : ControllerBase
{
    private readonly MatchStore _matchStore;
    private readonly AudioraDbContext _context;
    private readonly IHubContext<RoomHub> _hub;

    public MatchController(MatchStore matchStore, AudioraDbContext context, IHubContext<RoomHub> hub)
    {
        _matchStore = matchStore;
        _context = context;
        _hub = hub;
    }

    [HttpGet("candidates")] // api/match/candidates?userId=xxx
    public async Task<IActionResult> GetCandidates([FromQuery] string userId)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (currentUserId != userId)
        {
            return Forbid();
        }

        // Load users from database
        var users = await _context.Users.AsNoTracking().ToListAsync();
        var likedTargets = await _matchStore.GetLikedTargetsAsync(userId);
        var matches = await _matchStore.GetMatchesForAsync(userId);
        var matchedIds = matches.Select(m => m.UserAId == userId ? m.UserBId : m.UserAId).ToHashSet();

        var candidates = users
            .Where(u => u.Id.ToString() != userId)
            .Where(u => !likedTargets.Contains(u.Id.ToString()))
            .Where(u => !matchedIds.Contains(u.Id.ToString()))
            .Select(u => new {
                id = u.Id,
                username = u.Username,
                topSongs = (u.TopSongs ?? new List<SongInfo>()).Take(3).Select(ts => new { ts.Name, ts.Artist, ts.AlbumImageUrl })
            })
            .ToList<object>();

        // Keep a test candidate as fallback to ensure at least one item shows up
        if (candidates.Count == 0)
        {
            var testUserId = Guid.Parse("11111111-1111-1111-1111-111111111111");
            if (testUserId.ToString() != userId)
            {
                candidates.Add(new {
                    id = testUserId,
                    username = "Test User",
                    topSongs = new [] {
                        new { Name = "Test Song 1", Artist = "Audiora", AlbumImageUrl = (string?)null },
                        new { Name = "Test Song 2", Artist = "Sample Artist", AlbumImageUrl = (string?)null },
                        new { Name = "Test Song 3", Artist = "Demo", AlbumImageUrl = (string?)null }
                    }.AsEnumerable()
                });
            }
        }

        return Ok(candidates);
    }

    public class LikeRequest { public required string UserId { get; set; } public required string TargetUserId { get; set; } }

    [HttpPost("like")] // api/match/like
    public async Task<IActionResult> Like([FromBody] LikeRequest request)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (currentUserId != request.UserId)
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(request.UserId) || string.IsNullOrWhiteSpace(request.TargetUserId))
            return BadRequest("Missing user ids.");

        var (matched, record) = await _matchStore.LikeAsync(request.UserId, request.TargetUserId);
        if (matched && record != null)
        {
            // Notify both users about match
            await _hub.Clients.Group(request.UserId).SendAsync("Matched", new { chatId = record.ChatId, withUser = request.TargetUserId });
            await _hub.Clients.Group(request.TargetUserId).SendAsync("Matched", new { chatId = record.ChatId, withUser = request.UserId });
            return Ok(new { status = "matched", chatId = record.ChatId, withUser = record.UserBId == request.UserId ? record.UserAId : record.UserBId });
        }
        else
        {
            // Send like notification to the target user
            var liker = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id.ToString() == request.UserId);
            var likerName = liker?.Username ?? "Unknown";
            await _hub.Clients.Group(request.TargetUserId).SendAsync("LikeReceived", new { fromUserId = request.UserId, fromUsername = likerName });
        }
        return Ok(new { status = "liked" });
    }

    [HttpGet("list")] // api/match/list?userId=xxx
    public async Task<IActionResult> List([FromQuery] string userId)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (currentUserId != userId)
        {
            return Forbid();
        }

        var matches = await _matchStore.GetMatchesForAsync(userId);

        var otherIds = matches.Select(m => m.UserAId == userId ? m.UserBId : m.UserAId).Distinct().ToList();
        var users = await _context.Users.AsNoTracking()
            .Where(u => otherIds.Contains(u.Id.ToString()))
            .ToListAsync();
        var userMap = users.ToDictionary(u => u.Id.ToString(), u => u);

        var result = matches.Select(m => {
            var withUser = m.UserAId == userId ? m.UserBId : m.UserAId;
            userMap.TryGetValue(withUser, out var userObj);
            return new { 
                m.ChatId, 
                withUser, 
                withUsername = userObj?.Username ?? withUser, 
                withLevel = userObj?.Level ?? 1,
                m.CreatedAt 
            };
        });

        return Ok(result);
    }

    [HttpGet("user/{id}")]
    public async Task<IActionResult> GetUser([FromRoute] string id)
    {
        if (!Guid.TryParse(id, out var guid)) return BadRequest("Invalid ID");

        // Handle the hardcoded Test User ID from MatchController.GetCandidates
        if (guid == Guid.Parse("11111111-1111-1111-1111-111111111111"))
        {
             return Ok(new { 
                Id = guid, 
                Username = "Test User", 
                Level = 99, 
                Role = UserRole.Hacker,
                Genres = new List<string> { "Pop", "Rock", "Indie" },
                TopSongs = new [] {
                        new { Name = "Test Song 1", Artist = "Audiora", AlbumImageUrl = (string?)null },
                        new { Name = "Test Song 2", Artist = "Sample Artist", AlbumImageUrl = (string?)null },
                        new { Name = "Test Song 3", Artist = "Demo", AlbumImageUrl = (string?)null }
                }
            });
        }

        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == guid);
        if (user == null) return NotFound();
        
        return Ok(new { 
            user.Id, 
            user.Username, 
            user.Level, 
            user.Role,
            user.Genres,
            TopSongs = user.TopSongs
        });
    }
}
