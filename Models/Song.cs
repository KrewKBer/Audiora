using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Audiora.Models
{
    public class Song
    {
        public int Id { get; set; }
        public string? Title { get; set; }
        public string? Artist { get; set; }
        public string? Album { get; set; }

        [JsonPropertyName("primaryGenre")]
        public string? Genre { get; set; }
        public List<string>? SubGenres { get; set; }
        public string? Duration { get; set; }
        public int ReleaseYear { get; set; }
        public List<string>? Mood { get; set; }
        public string? Tempo { get; set; }
        public double Energy { get; set; }
        public double Danceability { get; set; }
        public double Instrumentalness { get; set; }
        public double Valence { get; set; }
        public int Popularity { get; set; }
        public string? Language { get; set; }
        public List<string>? Themes { get; set; }
        public List<string>? SimilarArtists { get; set; }
        public List<string>? Tags { get; set; }
        public string? ImageUrl { get; set; }
        public string? AudioUrl { get; set; }
        public string? SpotifyId { get; set; }
    }
}
