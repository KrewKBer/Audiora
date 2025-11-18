using Audiora.Data;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;

namespace Audiora.Models;

public class RoomHub : Hub
{
    private static readonly ConcurrentDictionary<string, HashSet<string>> _roomConnections = new();
    private static readonly ConcurrentDictionary<string, string> _connectionToRoom = new();
    private static readonly ConcurrentDictionary<string, HashSet<string>> _userConnections = new();
    private static readonly ConcurrentDictionary<string, string> _connectionToUser = new();
    private readonly AudioraDbContext _context;

    public RoomHub(AudioraDbContext context)
    {
        _context = context;
    }

    public async Task JoinRoom(string roomId, string userId, string username)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        
        _roomConnections.AddOrUpdate(roomId, 
            new HashSet<string> { Context.ConnectionId }, 
            (key, set) => { set.Add(Context.ConnectionId); return set; });
        
        _connectionToRoom[Context.ConnectionId] = roomId;
        
        await Clients.Group(roomId).SendAsync("UserJoined", username);
    }

    // Allow clients to register their userId to receive personal notifications
    public async Task RegisterUser(string userId)
    {
        _connectionToUser[Context.ConnectionId] = userId;
        _userConnections.AddOrUpdate(userId,
            new HashSet<string> { Context.ConnectionId },
            (key, set) => { set.Add(Context.ConnectionId); return set; });
        await Groups.AddToGroupAsync(Context.ConnectionId, userId);
    }

    // Direct chat: join by composite chatId (we map to deterministic Guid group)
    public async Task JoinDirectChat(string chatId, string userId, string username)
    {
        var guid = ChatIdToGuid(chatId).ToString();
        await JoinRoom(guid, userId, username);
    }

    public async Task SendDirectMessage(string chatId, string userId, string username, string message)
    {
        var guid = ChatIdToGuid(chatId);
        var roomId = guid.ToString();

        if (!IsConnectionValid(roomId))
            throw new HubException("Connection not in valid state for this chat");

        if (!Guid.TryParse(userId, out var userGuid))
            throw new HubException("Invalid user ID format");

        var chatMessage = new ChatMessage
        {
            RoomId = guid,
            UserId = userGuid,
            Username = username,
            Message = message,
            Timestamp = DateTime.UtcNow
        };

        _context.ChatMessages.Add(chatMessage);
        await _context.SaveChangesAsync();

        await Clients.Group(roomId).SendAsync("ReceiveMessage", userId, username, message, chatMessage.Timestamp);
    }

    public async Task LeaveRoom(string roomId, string username)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
        
        if (_roomConnections.TryGetValue(roomId, out var connections))
        {
            connections.Remove(Context.ConnectionId);
        }
        _connectionToRoom.TryRemove(Context.ConnectionId, out _);
        
        await Clients.Group(roomId).SendAsync("UserLeft", username);
    }

    public async Task SendMessage(string roomId, string userId, string username, string message)
    {
        if (!IsConnectionValid(roomId))
        {
            throw new HubException("Connection not in valid state for this room");
        }

        if (!Guid.TryParse(roomId, out var roomGuid) || !Guid.TryParse(userId, out var userGuid))
        {
            throw new HubException("Invalid room or user ID format");
        }

        var chatMessage = new ChatMessage
        {
            RoomId = roomGuid,
            UserId = userGuid,
            Username = username,
            Message = message,
            Timestamp = DateTime.UtcNow
        };

        _context.ChatMessages.Add(chatMessage);
        await _context.SaveChangesAsync();

        await Clients.Group(roomId).SendAsync("ReceiveMessage", userId, username, message, chatMessage.Timestamp);
    }

    public async Task AddSong(string roomId, object song)
    {
        if (!IsConnectionValid(roomId))
        {
            throw new HubException("Connection not in valid state for this room");
        }
        
        await Clients.Group(roomId).SendAsync("SongAdded", song);
    }

    public async Task VoteSong(string roomId, string songId, string userId, bool isLike)
    {
        if (!IsConnectionValid(roomId))
        {
            throw new HubException("Connection not in valid state for this room");
        }
        
        await Clients.Group(roomId).SendAsync("SongVoted", songId, userId, isLike);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (_connectionToRoom.TryRemove(Context.ConnectionId, out var roomId))
        {
            if (_roomConnections.TryGetValue(roomId, out var connections))
            {
                connections.Remove(Context.ConnectionId);
            }
        }
        if (_connectionToUser.TryRemove(Context.ConnectionId, out var userId))
        {
            if (_userConnections.TryGetValue(userId, out var uconns))
            {
                uconns.Remove(Context.ConnectionId);
            }
        }
        await base.OnDisconnectedAsync(exception);
    }

    private bool IsConnectionValid(string roomId)
    {
        return _connectionToRoom.TryGetValue(Context.ConnectionId, out var connectedRoom) 
               && connectedRoom == roomId 
               && _roomConnections.TryGetValue(roomId, out var connections) 
               && connections.Contains(Context.ConnectionId);
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
