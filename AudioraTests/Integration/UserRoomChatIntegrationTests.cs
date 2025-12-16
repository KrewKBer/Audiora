// csharp
using Audiora.Data;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR.Client;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace AudioraTests.Integration;

[Trait("Category","Integration")]
public class UserRoomChatIntegrationTests : IAsyncLifetime
{
    private WebApplicationFactory<Program> _factory = null!;
    private HttpClient _client = null!;

    public async Task InitializeAsync()
    {
        _factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(b =>
            {
                b.UseEnvironment("Testing"); // triggers InMemory in Program
            });

        _client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = true
        });

        // Ensure InMemory database created
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AudioraDbContext>();
        await db.Database.EnsureCreatedAsync();
    }

    public Task DisposeAsync()
    {
        _client.Dispose();
        _factory.Dispose();
        return Task.CompletedTask;
    }

    [Fact]
    public async Task RegisterUser_CreatePrivateRoom_SendMessage_ShouldSucceed()
    {
        var regResp = await _client.PostAsJsonAsync("/Auth/register", new { username = "u1", password = "p1" });
        regResp.EnsureSuccessStatusCode();
        var regData = await regResp.Content.ReadFromJsonAsync<JsonElement>();
        var userId = regData.GetProperty("userId").GetString();

        var roomResp = await _client.PostAsJsonAsync("/api/room", new
        {
            name = "PrivateRoom",
            userId,
            isPrivate = true,
            password = "secret"
        });
        roomResp.EnsureSuccessStatusCode();
        var roomData = await roomResp.Content.ReadFromJsonAsync<JsonElement>();
        var roomId = roomData.GetProperty("id").GetString();

        var hub = new HubConnectionBuilder()
            .WithUrl(_factory.Server.BaseAddress + "roomHub", opt =>
            {
                opt.HttpMessageHandlerFactory = _ => _factory.Server.CreateHandler();
            })
            .WithAutomaticReconnect()
            .Build();

        var received = new List<string>();
        hub.On<string, string, string, DateTime>("ReceiveMessage", (_, _, msg, _) => received.Add(msg));

        await hub.StartAsync();
        await hub.InvokeAsync("JoinRoom", roomId, userId, "u1");
        await hub.InvokeAsync("SendMessage", roomId, userId, "u1", "Hello");
        await Task.Delay(200);

        received.Should().ContainSingle().And.Contain("Hello");

        await hub.StopAsync();
        await hub.DisposeAsync();
    }

    [Fact]
    public async Task TwoUsers_JoinPrivateRoom_ExchangeMessages_ShouldSucceed()
    {
        var r1 = await _client.PostAsJsonAsync("/Auth/register", new { username = "user1", password = "pass1" });
        r1.EnsureSuccessStatusCode();
        var d1 = await r1.Content.ReadFromJsonAsync<JsonElement>();
        var user1Id = d1.GetProperty("userId").GetString();

        var r2 = await _client.PostAsJsonAsync("/Auth/register", new { username = "user2", password = "pass2" });
        r2.EnsureSuccessStatusCode();
        var d2 = await r2.Content.ReadFromJsonAsync<JsonElement>();
        var user2Id = d2.GetProperty("userId").GetString();

        var roomResp = await _client.PostAsJsonAsync("/api/room", new
        {
            name = "Pvt",
            userId = user1Id,
            isPrivate = true,
            password = "pw"
        });
        roomResp.EnsureSuccessStatusCode();
        var roomData = await roomResp.Content.ReadFromJsonAsync<JsonElement>();
        var roomId = roomData.GetProperty("id").GetString();

        var joinResp = await _client.PostAsJsonAsync($"/api/room/{roomId}/join", new
        {
            userId = user2Id,
            password = "pw"
        });
        joinResp.EnsureSuccessStatusCode();

        HubConnection BuildHub() => new HubConnectionBuilder()
            .WithUrl(_factory.Server.BaseAddress + "roomHub", opt =>
            {
                opt.HttpMessageHandlerFactory = _ => _factory.Server.CreateHandler();
            })
            .WithAutomaticReconnect()
            .Build();

        var hub1 = BuildHub();
        var hub2 = BuildHub();

        var msgs1 = new List<string>();
        var msgs2 = new List<string>();
        hub1.On<string, string, string, DateTime>("ReceiveMessage", (_, _, m, _) => msgs1.Add(m));
        hub2.On<string, string, string, DateTime>("ReceiveMessage", (_, _, m, _) => msgs2.Add(m));

        await hub1.StartAsync();
        await hub2.StartAsync();

        await hub1.InvokeAsync("JoinRoom", roomId, user1Id, "user1");
        await hub2.InvokeAsync("JoinRoom", roomId, user2Id, "user2");

        await hub1.InvokeAsync("SendMessage", roomId, user1Id, "user1", "Hi from user1");
        await Task.Delay(150);
        await hub2.InvokeAsync("SendMessage", roomId, user2Id, "user2", "Hello from user2");
        await Task.Delay(250);

        msgs1.Should().HaveCount(2);
        msgs2.Should().HaveCount(2);

        await hub1.StopAsync();
        await hub2.StopAsync();
        await hub1.DisposeAsync();
        await hub2.DisposeAsync();
    }
}
