using System.Text.Json;
using Audiora.Models;
using Audiora.Services;

var builder = WebApplication.CreateBuilder(args);

if (builder.Environment.IsDevelopment())
{
    builder.Configuration.AddUserSecrets<Program>();
}

builder.Services.AddSingleton<SpotifyService>();
builder.Services.AddSingleton<RoomStore>();
builder.Services.AddSingleton<ChatMessageStore>();

builder.Services.AddControllersWithViews()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });

builder.Services.AddSignalR(o => { o.EnableDetailedErrors = true; });


var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.MapControllers();
app.MapHub<RoomHub>("/roomHub");
app.MapFallbackToFile("index.html");

app.Run();