using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Audiora.Migrations
{
    /// <inheritdoc />
    public partial class AddTopSongsJsonToUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TopSongsJson",
                table: "Users",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TopSongsJson",
                table: "Users");
        }
    }
}
