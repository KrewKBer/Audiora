using Audiora.Models;
using Audiora.Services;
using Microsoft.AspNetCore.Mvc;

namespace Audiora.Controllers;

[ApiController]
[Route("api/room")]
public class RoomController : ControllerBase
{
    private readonly RoomStore _roomStore;
    private readonly ChatMessageStore _chatMessageStore;

    public RoomController(RoomStore roomStore, ChatMessageStore chatMessageStore)
    {
        _roomStore = roomStore;
        _chatMessageStore = chatMessageStore;
    }

    [HttpPost]
    public async Task<IActionResult> CreateRoom([FromBody] CreateRoomRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Room name is required.");
        if (string.IsNullOrWhiteSpace(request.UserId))
            return BadRequest("UserId is required.");

        var room = new Room
        {
            Name = request.Name,
            HostUserId = request.UserId,
            MemberUserIds = new List<string> { request.UserId },
            IsPrivate = request.IsPrivate
        };

        if (request.IsPrivate)
        {
            if (string.IsNullOrWhiteSpace(request.Password))
                return BadRequest("Password is required for private rooms.");
            room.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        }

        await _roomStore.AddRoomAsync(room);
        return Ok(room);
    }

    [HttpGet("list")]
    public async Task<IActionResult> ListRooms()
    {
        var rooms = await _roomStore.GetRoomsAsync();
        rooms.Sort();
        return Ok(rooms);
    }

    [HttpGet("{roomId}")]
    public async Task<IActionResult> GetRoom(string roomId)
    {
        var room = await _roomStore.GetRoomAsync(roomId);
        if (room == null) return NotFound();
        return Ok(room);
    }

    [HttpPost("{roomId}/join")]
    public async Task<IActionResult> JoinRoom(string roomId, [FromBody] JoinRoomRequest request)
    {
        var room = await _roomStore.GetRoomAsync(roomId);
        if (room == null) return NotFound();

        if (room.IsPrivate)
        {
            if (string.IsNullOrWhiteSpace(request.Password))
                return Unauthorized("Password required.");
            if (string.IsNullOrWhiteSpace(room.PasswordHash) || !BCrypt.Net.BCrypt.Verify(request.Password, room.PasswordHash))
                return Unauthorized("Invalid password.");
        }

        if (!room.MemberUserIds.Contains(request.UserId))
            room.MemberUserIds.Add(request.UserId);

        await _roomStore.UpdateRoomAsync(room);
        return Ok(room);
    }

    [HttpGet("{roomId}/messages")]
    public async Task<IActionResult> GetMessages(string roomId)
    {
        var messages = await _chatMessageStore.GetMessagesAsync(roomId);
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