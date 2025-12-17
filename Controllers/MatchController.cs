using Audiora.Models;
using Audiora.Data;
using Audiora.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace Audiora.Controllers;

[Authorize]
[ApiController]
[Route("api/match")]
public class MatchController : ControllerBase
{
    private readonly AudioraDbContext _context;
    private readonly IHubContext<RoomHub> _hub;

    public MatchController(AudioraDbContext context, IHubContext<RoomHub> hub)
    {
        _context = context;
        _hub = hub;
    }
    [HttpGet("candidates")]
    public async Task<IActionResult> GetCandidates([FromQuery] string userId)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (currentUserId != userId) return Forbid();

        if (!Guid.TryParse(userId, out var userGuid)) return BadRequest("Invalid user ID");

        var currentUser = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userGuid);
        if (currentUser == null) return NotFound("User not found");

        var likedTargets = await _context.Likes
            .Where(l => l.FromUserId == userGuid)
            .Select(l => l.ToUserId)
            .ToListAsync();

        var matchedIds = await _context.Matches
            .Where(m => m.UserAId == userGuid || m.UserBId == userGuid)
            .Select(m => m.UserAId == userGuid ? m.UserBId : m.UserAId)
            .ToListAsync();

        var excludedIds = likedTargets.Concat(matchedIds).Append(userGuid).ToHashSet();

        var users = await _context.Users
            .AsNoTracking()
            .Where(u => !excludedIds.Contains(u.Id))
            .ToListAsync();

        // Filter by preferences
        var filteredUsers = users.Where(u => MatchesPreferences(currentUser, u)).ToList();

        var candidates = filteredUsers.Select(u => new {
            id = u.Id,
            username = u.Username,
            topSongs = (u.TopSongs ?? new List<SongInfo>()).Take(3).Select(ts => new { ts.Name, ts.Artist, ts.AlbumImageUrl })
        });

        return Ok(candidates);
    }

    private bool MatchesPreferences(User currentUser, User candidate)
    {
        bool currentUserInterested = currentUser.Preference == SexualityPreference.Everyone ||
            (currentUser.Preference == SexualityPreference.Men && candidate.Gender == Gender.Male) ||
            (currentUser.Preference == SexualityPreference.Women && candidate.Gender == Gender.Female);
        
        bool candidateInterested = candidate.Preference == SexualityPreference.Everyone ||
            (candidate.Preference == SexualityPreference.Men && currentUser.Gender == Gender.Male) ||
            (candidate.Preference == SexualityPreference.Women && currentUser.Gender == Gender.Female);

        return currentUserInterested && candidateInterested;
    }

    public class LikeRequest { public required string UserId { get; set; } public required string TargetUserId { get; set; } }

    [HttpPost("like")]
    public async Task<IActionResult> Like([FromBody] LikeRequest request)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (currentUserId != request.UserId) return Forbid();

        if (!Guid.TryParse(request.UserId, out var fromGuid) || !Guid.TryParse(request.TargetUserId, out var toGuid))
            return BadRequest("Invalid user IDs");

        if (fromGuid == toGuid) return BadRequest("Cannot like yourself");

        var existingLike = await _context.Likes.FirstOrDefaultAsync(l => l.FromUserId == fromGuid && l.ToUserId == toGuid);
        if (existingLike != null) return Ok(new { status = "already_liked" });

        _context.Likes.Add(new Like { FromUserId = fromGuid, ToUserId = toGuid, Timestamp = DateTime.UtcNow });
        await _context.SaveChangesAsync();

        var mutualLike = await _context.Likes.FirstOrDefaultAsync(l => l.FromUserId == toGuid && l.ToUserId == fromGuid);
        if (mutualLike != null)
        {
            var existingMatch = await _context.Matches.FirstOrDefaultAsync(m =>
                (m.UserAId == fromGuid && m.UserBId == toGuid) || (m.UserAId == toGuid && m.UserBId == fromGuid));

            if (existingMatch == null)
            {
                var chatId = GenerateChatId(request.UserId, request.TargetUserId);
                var match = new Match { UserAId = fromGuid, UserBId = toGuid, CreatedAt = DateTime.UtcNow, ChatId = chatId };
                _context.Matches.Add(match);
                await _context.SaveChangesAsync();

                await _hub.Clients.Group(request.UserId).SendAsync("Matched", new { chatId, withUser = request.TargetUserId });
                await _hub.Clients.Group(request.TargetUserId).SendAsync("Matched", new { chatId, withUser = request.UserId });

                return Ok(new { status = "matched", chatId, withUser = request.TargetUserId });
            }
        }

        var liker = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == fromGuid);
        await _hub.Clients.Group(request.TargetUserId).SendAsync("LikeReceived", new { fromUserId = request.UserId, fromUsername = liker?.Username ?? "Unknown" });

        return Ok(new { status = "liked" });
    }

    [HttpGet("list")]
    public async Task<IActionResult> List([FromQuery] string userId)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (currentUserId != userId) return Forbid();

        if (!Guid.TryParse(userId, out var userGuid)) return BadRequest("Invalid user ID");

        var matches = await _context.Matches
            .Where(m => m.UserAId == userGuid || m.UserBId == userGuid)
            .ToListAsync();

        var otherIds = matches.Select(m => m.UserAId == userGuid ? m.UserBId : m.UserAId).Distinct().ToList();
        var users = await _context.Users.AsNoTracking().Where(u => otherIds.Contains(u.Id)).ToListAsync();
        var userMap = users.ToDictionary(u => u.Id);

        var result = matches.Select(m => {
            var withUserId = m.UserAId == userGuid ? m.UserBId : m.UserAId;
            userMap.TryGetValue(withUserId, out var userObj);
            return new {
                m.ChatId,
                withUser = withUserId.ToString(),
                withUsername = userObj?.Username ?? withUserId.ToString(),
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

        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == guid);
        if (user == null) return NotFound();

        return Ok(new { user.Id, user.Username, user.Level, user.Role, user.Genres, TopSongs = user.TopSongs });
    }
    
    [HttpPost("update-preferences")]
    public async Task<IActionResult> UpdatePreferences([FromBody] UpdatePreferencesRequest req)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (currentUserId != req.UserId) return Forbid();

        if (!Guid.TryParse(req.UserId, out var guid)) return BadRequest("Invalid user ID");

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == guid);
        if (user == null) return NotFound();

        user.Gender = req.Gender;
        user.Preference = req.Preference;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Preferences updated" });
    }

    private static string GenerateChatId(string a, string b)
    {
        var ordered = new[] { a, b }.OrderBy(x => x, StringComparer.Ordinal).ToArray();
        return $"{ordered[0]}_{ordered[1]}";
    }
    
    public class UpdatePreferencesRequest
    {
        public required string UserId { get; set; }
        public Gender Gender { get; set; }
        public SexualityPreference Preference { get; set; }
    }
}
