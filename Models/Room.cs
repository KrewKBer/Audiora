using System.Text.Json.Serialization;

namespace Audiora.Models;

public class Room : IComparable<Room>
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; }
    public string HostUserId { get; set; }
    public List<string> MemberUserIds { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsPrivate { get; set; } = false;

    [JsonIgnore]
    public string? PasswordHash { get; set; }

    // IComparable<Room> - Default sorting by activity (member count), then by recency
    public int CompareTo(Room? other)
    {
        if (other is null) return 1;
        
        int memberComparison = other.MemberUserIds.Count.CompareTo(MemberUserIds.Count);
        if (memberComparison != 0) return memberComparison;
        
        return other.CreatedAt.CompareTo(CreatedAt);
    }

    // Comparison operators for convenience
    public static bool operator <(Room left, Room right)
    {
        return left.CompareTo(right) < 0;
    }

    public static bool operator >(Room left, Room right)
    {
        return left.CompareTo(right) > 0;
    }

    public static bool operator <=(Room left, Room right)
    {
        return left.CompareTo(right) <= 0;
    }

    public static bool operator >=(Room left, Room right)
    {
        return left.CompareTo(right) >= 0;
    }
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