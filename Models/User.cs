using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace Audiora.Models
{   
    [JsonConverter(typeof(StringEnumConverter))]
    public enum UserRole
    {
        Noob,
        Pro,
        Hacker,
        Admin
    }
    public class User
    {
        public Guid Id { get; set; }
        public UserRole Role { get; set; } = UserRole.Noob;
        public string? Username { get; set; }
        public string? Password { get; set; }
        public List<string>? Genres { get; set; } // Added for genre preferences
        public List<SongInfo>? TopSongs { get; set; } // Top 3 favorite songs
    }
    public record SongInfo
    {
        [JsonProperty(nameof(Id))]
        public required string Id { get; init; }
    
        [JsonProperty(nameof(Name))]
        public required string Name { get; init; }
    
        [JsonProperty(nameof(Artist))]
        public required string Artist { get; init; }
    
        [JsonProperty(nameof(AlbumImageUrl))]
        public string? AlbumImageUrl { get; init; }
    }
}
