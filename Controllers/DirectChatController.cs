using Audiora.Services;
using Audiora.Models;
using Audiora.Data;
using Microsoft.AspNetCore.Mvc;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace Audiora.Controllers;

[Authorize]
[ApiController]
[Route("api/directchat")]
public class DirectChatController: ControllerBase
{
    private readonly AudioraDbContext _context;
    private readonly MatchStore _matchStore;

    public DirectChatController(AudioraDbContext context, MatchStore matchStore)
    {
        _context = context;
        _matchStore = matchStore;
    }

    [HttpGet("messages")] // api/directchat/messages?chatId=xxx
    public async Task<IActionResult> GetMessages([FromQuery] string chatId)
    {
        if (string.IsNullOrWhiteSpace(chatId)) return BadRequest("chatId required");
        var chatGuid = ChatIdToGuid(chatId);
        var msgs = await _context.ChatMessages
            .Where(m => m.RoomId == chatGuid)
            .OrderBy(m => m.Timestamp)
            .ToListAsync();
        return Ok(msgs);
    }

    public class SendRequest { public required string ChatId { get; set; } public required string UserId { get; set; } public required string Username { get; set; } public required string Message { get; set; } }

    [HttpPost("send")] // api/directchat/send
    public async Task<IActionResult> Send([FromBody] SendRequest req)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (currentUserId != req.UserId)
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(req.ChatId) || string.IsNullOrWhiteSpace(req.UserId) || string.IsNullOrWhiteSpace(req.Username))
            return BadRequest("Missing required fields");
        if (string.IsNullOrWhiteSpace(req.Message)) return BadRequest("Empty message");
        if (!Guid.TryParse(req.UserId, out var userGuid)) return BadRequest("Invalid userId format");
        var roomGuid = ChatIdToGuid(req.ChatId);
        var msg = new ChatMessage { RoomId = roomGuid, UserId = userGuid, Username = req.Username, Message = req.Message, Timestamp = DateTime.UtcNow };
        _context.ChatMessages.Add(msg);
        await _context.SaveChangesAsync();
        return Ok(msg);
    }

    private static Guid ChatIdToGuid(string chatId)
    {
        using var md5 = MD5.Create();
        var hash = md5.ComputeHash(Encoding.UTF8.GetBytes(chatId));
        Span<byte> guidBytes = stackalloc byte[16];
        hash.AsSpan(0,16).CopyTo(guidBytes);
        return new Guid(guidBytes);
    }
}
