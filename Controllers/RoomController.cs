using Audiora.Data;
using Audiora.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Audiora.Controllers;

[ApiController]
[Route("api/room")]
public class RoomController : ControllerBase
{
    private readonly AudioraDbContext _context;

    public RoomController(AudioraDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> CreateRoom([FromBody] CreateRoomRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Room name is required.");
        if (!Guid.TryParse(request.UserId, out var hostUserId))
            return BadRequest("Invalid UserId.");

        var room = new Room
        {
            Name = request.Name,
            HostUserId = hostUserId,
            MemberUserIds = new List<Guid> { hostUserId }, 
            IsPrivate = request.IsPrivate
        };

        if (request.IsPrivate)
        {
            if (string.IsNullOrWhiteSpace(request.Password))
                return BadRequest("Password is required for private rooms.");
            room.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        }

        _context.Rooms.Add(room);
        await _context.SaveChangesAsync();
        return Ok(room);
    }

    [HttpGet("list")]
    public async Task<IActionResult> ListRooms()
    {
        var rooms = await _context.Rooms.ToListAsync();
        rooms.Sort();
        return Ok(rooms);
    }

    [HttpGet("{roomId:guid}")]
    public async Task<IActionResult> GetRoom(Guid roomId)
    {
        var room = await _context.Rooms.FindAsync(roomId);
        if (room == null) return NotFound();
        return Ok(room);
    }

    [HttpPost("{roomId:guid}/join")]
    public async Task<IActionResult> JoinRoom(Guid roomId, [FromBody] JoinRoomRequest request)
    {
        if (!Guid.TryParse(request.UserId, out var userId))
            return BadRequest("Invalid UserId.");

        var room = await _context.Rooms.FindAsync(roomId);
        if (room == null)
            return NotFound("Room not found.");

        if (room.IsPrivate)
        {
            if (string.IsNullOrWhiteSpace(request.Password))
                return BadRequest("Password is required.");
            if (!BCrypt.Net.BCrypt.Verify(request.Password, room.PasswordHash))
                return Unauthorized("Invalid password.");
        }

        if (!room.MemberUserIds.Contains(userId)) // Now comparing Guid to Guid
        {
            room.MemberUserIds.Add(userId); // Now adding Guid
            await _context.SaveChangesAsync();
        }

        return Ok(room);
    }


    [HttpGet("{roomId:guid}/messages")]
    public async Task<IActionResult> GetMessages(Guid roomId)
    {
        var messages = await _context.ChatMessages
            .Where(m => m.RoomId == roomId)
            .OrderBy(m => m.Timestamp)
            .ToListAsync();
        return Ok(messages);
    }
}

public record CreateRoomRequest
{
    public required string Name { get; init; }
    public required string UserId { get; init; }
    public bool IsPrivate { get; init; } = false;
    public string? Password { get; init; }
}

public record JoinRoomRequest
{
    public required string UserId { get; init; }
    public string? Password { get; init; }
}
