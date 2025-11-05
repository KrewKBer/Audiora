using System.ComponentModel.DataAnnotations.Schema;
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
        public List<string>? Genres { get; set; }
        [NotMapped]
        public List<SongInfo>? TopSongs { get; set; }
    }
    public record SongInfo(
        [property: JsonProperty("Id")] string Id,
        [property: JsonProperty("Name")] string Name,
        [property: JsonProperty("Artist")] string Artist,
        [property: JsonProperty("AlbumImageUrl")] string AlbumImageUrl
    );
}
