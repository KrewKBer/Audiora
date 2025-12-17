using System.ComponentModel.DataAnnotations.Schema;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace Audiora.Models
{ 
    public enum Gender
    {
        PreferNotToSay,
        Male,
        Female,
        NonBinary
    }

    public enum SexualityPreference
    {
        Everyone,
        Men,
        Women
    }
    [JsonConverter(typeof(StringEnumConverter))]
    public enum UserRole
    {
        Noob,
        Pro,
        Hacker,
        Admin
    }
    public class User : IBaseEntity
    {
        public Guid Id { get; set; }
        public UserRole Role { get; set; } = UserRole.Noob;
        public string? Username { get; set; }
        public string? Password { get; set; }
        public List<string>? Genres { get; set; }
        public string? TopSongsJson { get; set; }
        
        public string? TwoFactorSecret { get; set; }
        public bool IsTwoFactorEnabled { get; set; }
        
        // XP System
        public int Xp { get; set; } = 0;
        public int Level { get; set; } = 1;
        
        public Gender Gender { get; set; } = Gender.PreferNotToSay;
        public SexualityPreference Preference { get; set; } = SexualityPreference.Everyone;

        [NotMapped]
        public List<SongInfo>? TopSongs 
        { 
            get 
            {
                if (string.IsNullOrEmpty(TopSongsJson))
                    return new List<SongInfo>();
                try
                {
                    return JsonConvert.DeserializeObject<List<SongInfo>>(TopSongsJson) ?? new List<SongInfo>();
                }
                catch
                {
                    return new List<SongInfo>();
                }
            }
            set
            {
                TopSongsJson = value == null || value.Count == 0 
                    ? null 
                    : JsonConvert.SerializeObject(value);
            }
        }
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


/*
public class Song
{
  [Key]
  public Guid Id { get; set; }

  [Required]
  [MaxLength(200)]
  [Column("song_title")]
  public string Title { get; set; } = null!;

  public string? PreviewUrl { get; set; }
}
*/
