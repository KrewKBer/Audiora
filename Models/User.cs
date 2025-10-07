using Newtonsoft.Json;

namespace Audiora.Models
{
    public class User
    {
        public Guid Id { get; set; }
        public string? Username { get; set; }
        public string? Password { get; set; }
        public List<string>? Genres { get; set; } // Added for genre preferences
        public List<SongInfo>? TopSongs { get; set; } // Top 3 favorite songs
    }

    public class SongInfo
    {
        [JsonProperty("Id")]
        public string Id { get; set; }
        [JsonProperty("Name")]
        public string Name { get; set; }
        [JsonProperty("Artist")]
        public string Artist { get; set; }
        [JsonProperty("AlbumImageUrl")]
        public string AlbumImageUrl { get; set; }
    }
}
