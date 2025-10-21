using System.Text.Json.Serialization;

namespace Audiora.Models;

public class Room
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; }
    public string HostUserId { get; set; }
    public List<string> MemberUserIds { get; set; } = new();
    public List<RoomSong> Songs { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public bool IsPrivate { get; set; } = false;

    [JsonIgnore]
    public string? PasswordHash { get; set; }
}

public class RoomSong
{
    public string Id { get; set; }
    public string Name { get; set; }
    public string Artist { get; set; }
    public string AlbumImageUrl { get; set; }
    public List<string> LikedBy { get; set; } = new();
    public List<string> DislikedBy { get; set; } = new();
}

public class ChatMessage
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string RoomId { get; set; }
    public string UserId { get; set; }
    public string Username { get; set; }
    public string Message { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
