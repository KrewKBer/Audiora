using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Audiora.Migrations
{
    /// <inheritdoc />
    public partial class AddSongDetailsToSeenSongs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AlbumImageUrl",
                table: "SeenSongs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Artist",
                table: "SeenSongs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "SeenSongs",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AlbumImageUrl",
                table: "SeenSongs");

            migrationBuilder.DropColumn(
                name: "Artist",
                table: "SeenSongs");

            migrationBuilder.DropColumn(
                name: "Name",
                table: "SeenSongs");
        }
    }
}
