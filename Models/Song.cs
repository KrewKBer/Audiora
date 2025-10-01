namespace Audiora.Models
{
    public class Song
    {
        public int Id { get; set; }
        public string? Title { get; set; }
        public string? Artist { get; set; }
        public string? Album { get; set; }
        public string? PrimaryGenre { get; set; }
        public int Year { get; set; }
        public int Duration { get; set; }
        public string? Country { get; set; }
    }
}
