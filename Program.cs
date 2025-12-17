using System.Text;
using System.Text.Json;
using Audiora.Data;
using Audiora.Models;
using Audiora.Services;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json.Converters;

using Microsoft.AspNetCore.Authentication.Cookies;

var builder = WebApplication.CreateBuilder(args);

if (builder.Environment.IsEnvironment("Testing"))
{
    builder.Services.AddDbContext<AudioraDbContext>(o =>
        o.UseInMemoryDatabase("TestDb"));
}
else
{
    builder.Services.AddDbContext<AudioraDbContext>(options =>
        options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
}

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.ExpireTimeSpan = TimeSpan.FromDays(7);
        options.SlidingExpiration = true;
        options.Cookie.HttpOnly = true;
        
        if (builder.Environment.IsEnvironment("Testing"))
        {
            options.Cookie.SameSite = SameSiteMode.None;
            options.Cookie.SecurePolicy = CookieSecurePolicy.None;
        }
        else
        {
            options.Cookie.SameSite = SameSiteMode.Strict;
        }
    });

builder.Services.AddScoped(typeof(DataService<>));
builder.Services.AddSingleton<SpotifyService>();
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient();
builder.Services.AddSingleton<YouTubeService>();

builder.Services.AddControllersWithViews()
    .AddNewtonsoftJson(options =>
    {
        options.SerializerSettings.ReferenceLoopHandling = Newtonsoft.Json.ReferenceLoopHandling.Ignore;
        options.SerializerSettings.Converters.Add(new StringEnumConverter());
        options.SerializerSettings.ContractResolver = new Newtonsoft.Json.Serialization.CamelCasePropertyNamesContractResolver();
    });

builder.Services.AddSignalR(o => { o.EnableDetailedErrors = true; });


var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AudioraDbContext>();
    if (db.Database.IsRelational())
    {
        db.Database.Migrate(); 
    }
}

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<RoomHub>("/roomHub");
app.MapFallbackToFile("index.html");

app.Run();

public partial class Program { }