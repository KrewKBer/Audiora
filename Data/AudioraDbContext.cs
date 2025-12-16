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
        public DbSet<Like> Likes { get; set; }
        public DbSet<Match> Matches { get; set; }
        

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<User>()
                .Property(e => e.Genres)
                .HasConversion(
                    v => v == null ? null : string.Join(',', v),
                    v => string.IsNullOrEmpty(v) ? new List<string>() : v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList())
                .Metadata.SetValueComparer(new Microsoft.EntityFrameworkCore.ChangeTracking.ValueComparer<List<string>?>(
                    (c1, c2) => c1 == null && c2 == null || (c1 != null && c2 != null && c1.SequenceEqual(c2)),
                    c => c == null ? 0 : c.Aggregate(0, (a, v) => HashCode.Combine(a, v.GetHashCode())),
                    c => c == null ? null : c.ToList()));

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
                    .Metadata.SetValueComparer(new Microsoft.EntityFrameworkCore.ChangeTracking.ValueComparer<List<Guid>>(
                        (c1, c2) => c1 == null && c2 == null || (c1 != null && c2 != null && c1.SequenceEqual(c2)),
                        c => c == null ? 0 : c.Aggregate(0, (a, v) => HashCode.Combine(a, v.GetHashCode())),
                        c => c == null ? new List<Guid>() : c.ToList()));

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
        public string SongId { get; set; } = string.Empty;
        public bool Liked { get; set; }
        public string? Name { get; set; }
        public string? Artist { get; set; }
        public string? AlbumImageUrl { get; set; }
    }
    
    public class Like
    {
        public int Id { get; set; }
        public Guid FromUserId { get; set; }
        public Guid ToUserId { get; set; }
        public DateTime Timestamp { get; set; }
    }
    
    public class Match
    {
        public int Id { get; set; }
        public Guid UserAId { get; set; }
        public Guid UserBId { get; set; }
        public DateTime CreatedAt { get; set; }
        public string ChatId { get; set; } = string.Empty;
    }
    
}
