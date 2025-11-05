using Microsoft.EntityFrameworkCore;
using Audiora.Models;

namespace Audiora.Data
{
    public class AudioraDbContext : DbContext
    {
        public AudioraDbContext(DbContextOptions<AudioraDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<SeenSong> SeenSongs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<User>()
                .Property(e => e.Genres)
                .HasConversion(
                    v => string.Join(',', v),
                    v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList());
        }
    }

    public class SeenSong
    {
        public int Id { get; set; }
        public Guid UserId { get; set; }
        public string SongId { get; set; }
        public bool Liked { get; set; }
        public string? Name { get; set; }
        public string? Artist { get; set; }
        public string? AlbumImageUrl { get; set; }
    }
}
