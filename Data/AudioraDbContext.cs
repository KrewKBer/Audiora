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
        public DbSet<Room> Rooms { get; set; }
        public DbSet<ChatMessage> ChatMessages { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<User>()
                .Property(e => e.Genres)
                .HasConversion(
                    v => string.Join(',', v),
                    v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList())
                .Metadata.SetValueComparer(new Microsoft.EntityFrameworkCore.ChangeTracking.ValueComparer<List<string>>(
                    (c1, c2) => c1.SequenceEqual(c2),
                    c => c.Aggregate(0, (a, v) => HashCode.Combine(a, v.GetHashCode())),
                    c => c.ToList()));

            modelBuilder.Entity<Room>(entity =>
            {
                entity.ToTable("rooms");
                entity.HasKey(r => r.Id);
                entity.Property(r => r.Id).HasColumnName("id");
                entity.Property(r => r.Name).HasColumnName("name");
                entity.Property(r => r.HostUserId).HasColumnName("host_user_id");
                entity.Property(r => r.CreatedAt).HasColumnName("created_at");
                entity.Property(r => r.IsPrivate).HasColumnName("is_private");
                entity.Property(r => r.PasswordHash).HasColumnName("password_hash");

                entity.Property(r => r.MemberUserIds)
                    .HasColumnName("member_user_ids")
                    .HasConversion(
                        v => v.Select(Guid.Parse).ToArray(),
                        v => v.Select(g => g.ToString()).ToList())
                    .Metadata.SetValueComparer(new Microsoft.EntityFrameworkCore.ChangeTracking.ValueComparer<List<string>>(
                        (c1, c2) => c1.SequenceEqual(c2),
                        c => c.Aggregate(0, (a, v) => HashCode.Combine(a, v.GetHashCode())),
                        c => c.ToList()));
            });

            modelBuilder.Entity<ChatMessage>(entity =>
            {
                entity.ToTable("chat_messages");
                entity.HasKey(c => c.Id);
                entity.Property(c => c.Id).HasColumnName("id");
                entity.Property(c => c.RoomId).HasColumnName("room_id");
                entity.Property(c => c.UserId).HasColumnName("user_id");
                entity.Property(c => c.Username).HasColumnName("username");
                entity.Property(c => c.Message).HasColumnName("message");
                entity.Property(c => c.Timestamp).HasColumnName("timestamp");
            });
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
