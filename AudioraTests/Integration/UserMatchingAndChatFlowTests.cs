using Audiora.Data;
using Audiora.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR.Client;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;

namespace AudioraTests.Integration;

[Trait("Category", "Integration")]
public class UserMatchingAndChatFlowTests : IAsyncLifetime
{
    private WebApplicationFactory<Program> _factory = null!;
    private HttpClient _client1 = null!;
    private HttpClient _client2 = null!;
    private readonly string _testDbName = $"TestDb_{Guid.NewGuid()}";

    public async Task InitializeAsync()
    {
        _factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(b =>
            {
                b.UseEnvironment("Testing");
                b.ConfigureServices(services =>
                {
                    var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AudioraDbContext>));
                    if (descriptor != null) services.Remove(descriptor);
                    services.AddDbContext<AudioraDbContext>(options => options.UseInMemoryDatabase(_testDbName));
                });
            });

        _client1 = new HttpClient(new DelegatingHandlerChain(_factory.Server.CreateHandler()))
        {
            BaseAddress = _factory.Server.BaseAddress
        };

        _client2 = new HttpClient(new DelegatingHandlerChain(_factory.Server.CreateHandler()))
        {
            BaseAddress = _factory.Server.BaseAddress
        };

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AudioraDbContext>();
        await db.Database.EnsureCreatedAsync();
    }

    private class DelegatingHandlerChain : DelegatingHandler
    {
        private readonly Dictionary<string, string> _cookies = new();

        public DelegatingHandlerChain(HttpMessageHandler innerHandler)
        {
            InnerHandler = innerHandler;
        }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
        // Add stored cookies to request
        if (_cookies.Count > 0)
        {
            var cookieHeader = string.Join("; ", _cookies.Select(c => $"{c.Key}={c.Value}"));
            request.Headers.Remove("Cookie");
            request.Headers.Add("Cookie", cookieHeader);
        }

        var response = await base.SendAsync(request, cancellationToken);

        // Extract Set-Cookie headers and store them
        if (response.Headers.TryGetValues("Set-Cookie", out var setCookies))
        {
            foreach (var cookie in setCookies)
            {
                // Parse "name=value; path=/; ..." format
                var parts = cookie.Split(';', StringSplitOptions.TrimEntries);
                if (parts.Length > 0)
                {
                    var nameValue = parts[0].Split('=', 2);
                    if (nameValue.Length == 2)
                    {
                        _cookies[nameValue[0]] = nameValue[1];
                    }
                }
            }
        }

        return response;
    }
}


    public async Task DisposeAsync()
    {
        _client1.Dispose();
        _client2.Dispose();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AudioraDbContext>();
        await db.Database.EnsureDeletedAsync();

        await _factory.DisposeAsync();
    }
    private string? ExtractAuthCookie(HttpResponseMessage response)
    {
        if (response.Headers.TryGetValues("Set-Cookie", out var cookies))
        {
            var authCookie = cookies.FirstOrDefault(c => c.StartsWith(".AspNetCore.Cookies="));
            return authCookie?.Split(';')[0];
        }
        return null;
    }

    [Fact]
    public async Task FullUserFlow_RegisterTwoUsers_MutualLike_DirectMessage_ShouldSucceed()
    {
        // Step 1: Register User 1
        var user1Reg = await _client1.PostAsJsonAsync("/Auth/register", new
        {
            username = "alice",
            password = "pass123",
            genres = new[] { "rock", "pop" },
            gender = 1,
            preference = 0
        });
        user1Reg.EnsureSuccessStatusCode();
        var user1Data = await user1Reg.Content.ReadFromJsonAsync<JsonElement>();
        var user1Id = user1Data.GetProperty("userId").GetString();
        user1Id.Should().NotBeNullOrEmpty();

        // Step 2: Register User 2
        var user2Reg = await _client2.PostAsJsonAsync("/Auth/register", new
        {
            username = "bob",
            password = "pass456",
            genres = new[] { "jazz", "pop" },
            gender = 0,
            preference = 0
        });
        user2Reg.EnsureSuccessStatusCode();
        var user2Data = await user2Reg.Content.ReadFromJsonAsync<JsonElement>();
        var user2Id = user2Data.GetProperty("userId").GetString();
        user2Id.Should().NotBeNullOrEmpty();

        // Step 3: User 1 gets candidates
        var candidatesResp = await _client1.GetAsync($"/api/match/candidates?userId={user1Id}");
        candidatesResp.EnsureSuccessStatusCode();
        var candidates = await candidatesResp.Content.ReadFromJsonAsync<JsonElement>();

        var candidatesList = candidates.EnumerateArray().ToList();
        candidatesList.Should().Contain(c => c.GetProperty("id").GetString() == user2Id);

        // Step 4: User 1 likes User 2
        var like1Resp = await _client1.PostAsJsonAsync("/api/match/like", new
        {
            userId = user1Id,
            targetUserId = user2Id
        });
        like1Resp.EnsureSuccessStatusCode();
        var like1Data = await like1Resp.Content.ReadFromJsonAsync<JsonElement>();
        like1Data.GetProperty("status").GetString().Should().Be("liked");

        // Step 5: User 2 likes User 1 back
        var like2Resp = await _client2.PostAsJsonAsync("/api/match/like", new
        {
            userId = user2Id,
            targetUserId = user1Id
        });
        like2Resp.EnsureSuccessStatusCode();
        var like2Data = await like2Resp.Content.ReadFromJsonAsync<JsonElement>();
        like2Data.GetProperty("status").GetString().Should().Be("matched");

        var chatId = like2Data.GetProperty("chatId").GetString();
        chatId.Should().NotBeNullOrEmpty();

        // Step 6: Verify matches
        var matches1 = await _client1.GetAsync($"/api/match/list?userId={user1Id}");
        matches1.EnsureSuccessStatusCode();
        var matches1Data = await matches1.Content.ReadFromJsonAsync<JsonElement>();
        matches1Data.GetArrayLength().Should().Be(1);

        var matches2 = await _client2.GetAsync($"/api/match/list?userId={user2Id}");
        matches2.EnsureSuccessStatusCode();
        var matches2Data = await matches2.Content.ReadFromJsonAsync<JsonElement>();
        matches2Data.GetArrayLength().Should().Be(1);

        // Step 7: Send message
        var sendResp = await _client1.PostAsJsonAsync("/api/directchat/send", new
        {
            chatId,
            userId = user1Id,
            username = "alice",
            message = "Hey Bob! We matched!"
        });
        sendResp.EnsureSuccessStatusCode();

        // Step 8: Retrieve messages
        var messagesResp = await _client2.GetAsync($"/api/directchat/messages?chatId={chatId}");
        messagesResp.EnsureSuccessStatusCode();
        var messages = await messagesResp.Content.ReadFromJsonAsync<JsonElement>();
        messages.GetArrayLength().Should().Be(1);
        messages[0].GetProperty("message").GetString().Should().Be("Hey Bob! We matched!");
        messages[0].GetProperty("username").GetString().Should().Be("alice");

        // Step 9: Reply
        var replyResp = await _client2.PostAsJsonAsync("/api/directchat/send", new
        {
            chatId,
            userId = user2Id,
            username = "bob",
            message = "Hi Alice! Great to meet you!"
        });
        replyResp.EnsureSuccessStatusCode();

        // Step 10: Verify both messages
        var allMessagesResp = await _client1.GetAsync($"/api/directchat/messages?chatId={chatId}");
        allMessagesResp.EnsureSuccessStatusCode();
        var allMessages = await allMessagesResp.Content.ReadFromJsonAsync<JsonElement>();
        allMessages.GetArrayLength().Should().Be(2);
    }

    [Fact]
    public async Task UserFlow_WithPreferences_OnlyMatchesCompatibleUsers()
    {
        var user1Reg = await _client1.PostAsJsonAsync("/Auth/register", new
        {
            username = "john",
            password = "pass1",
            genres = new[] { "rock" },
            gender = 1,      // Male
            preference = 2   // Women
        });
        user1Reg.EnsureSuccessStatusCode();
    
        var cookie1 = ExtractAuthCookie(user1Reg);
        if (!string.IsNullOrEmpty(cookie1))
        {
            _client1.DefaultRequestHeaders.Remove("Cookie");
            _client1.DefaultRequestHeaders.Add("Cookie", cookie1);
        }
    
        var user1Data = await user1Reg.Content.ReadFromJsonAsync<JsonElement>();
        var user1Id = user1Data.GetProperty("userId").GetString();

        var user2Reg = await _client2.PostAsJsonAsync("/Auth/register", new
        {
            username = "jane",
            password = "pass2",
            genres = new[] { "pop" },
            gender = 2,      // Female
            preference = 1   // Men
        });
        user2Reg.EnsureSuccessStatusCode();
    
        var cookie2 = ExtractAuthCookie(user2Reg);
        if (!string.IsNullOrEmpty(cookie2))
        {
            _client2.DefaultRequestHeaders.Remove("Cookie");
            _client2.DefaultRequestHeaders.Add("Cookie", cookie2);
        }
    
        var user2Data = await user2Reg.Content.ReadFromJsonAsync<JsonElement>();
        var user2Id = user2Data.GetProperty("userId").GetString();

        var candidatesResp = await _client1.GetAsync($"/api/match/candidates?userId={user1Id}");
        candidatesResp.EnsureSuccessStatusCode();
        var candidates = await candidatesResp.Content.ReadFromJsonAsync<JsonElement>();

        var candidatesList = candidates.EnumerateArray().ToList();
        candidatesList.Should().ContainSingle(c =>
            c.GetProperty("id").GetString() == user2Id &&
            c.GetProperty("gender").GetString() == "Female");
    }

    [Fact]
    public async Task UserFlow_WithSignalR_ReceivesMatchNotification()
    {
        var user1Reg = await _client1.PostAsJsonAsync("/Auth/register", new
        {
            username = "user_a",
            password = "pass",
            genres = new[] { "indie" },
            gender = 0,
            preference = 0
        });
        var user1Data = await user1Reg.Content.ReadFromJsonAsync<JsonElement>();
        var user1Id = user1Data.GetProperty("userId").GetString();

        var user2Reg = await _client2.PostAsJsonAsync("/Auth/register", new
        {
            username = "user_b",
            password = "pass",
            genres = new[] { "indie" },
            gender = 1,
            preference = 0
        });
        var user2Data = await user2Reg.Content.ReadFromJsonAsync<JsonElement>();
        var user2Id = user2Data.GetProperty("userId").GetString();

        var hubUrl = new UriBuilder(_factory.Server.BaseAddress!) { Path = "/roomHub" }.Uri;
        var hub2 = new HubConnectionBuilder()
            .WithUrl(hubUrl, opt =>
            {
                opt.HttpMessageHandlerFactory = _ => _factory.Server.CreateHandler();
            })
            .Build();

        string? matchedChatId = null;
        var tcs = new TaskCompletionSource<bool>();

        hub2.On<object>("Matched", (data) =>
        {
            var jsonData = JsonSerializer.Serialize(data);
            var element = JsonDocument.Parse(jsonData).RootElement;
            matchedChatId = element.GetProperty("chatId").GetString();
            tcs.TrySetResult(true);
        });

        await hub2.StartAsync();
        await hub2.InvokeAsync("RegisterUser", user2Id);

        await _client1.PostAsJsonAsync("/api/match/like", new { userId = user1Id, targetUserId = user2Id });
        await _client2.PostAsJsonAsync("/api/match/like", new { userId = user2Id, targetUserId = user1Id });

        var notificationReceived = await Task.WhenAny(tcs.Task, Task.Delay(2000)) == tcs.Task;

        notificationReceived.Should().BeTrue("SignalR notification should be received");
        matchedChatId.Should().NotBeNullOrEmpty();

        await hub2.StopAsync();
        await hub2.DisposeAsync();
    }

[Fact]
    public async Task UserFlow_UpdatePreferences_ThenMatch()
    {
        var user1Reg = await _client1.PostAsJsonAsync("/Auth/register", new
        {
            username = "chris",
            password = "pass",
            genres = new[] { "metal" },
            gender = 1,      // Male
            preference = 0   // Everyone
        });
        var user1Data = await user1Reg.Content.ReadFromJsonAsync<JsonElement>();
        var user1Id = user1Data.GetProperty("userId").GetString();
        
        var cookie1 = ExtractAuthCookie(user1Reg);
        if (!string.IsNullOrEmpty(cookie1))
        {
            _client1.DefaultRequestHeaders.Remove("Cookie");
            _client1.DefaultRequestHeaders.Add("Cookie", cookie1);
        }
    
        var updateResp = await _client1.PostAsJsonAsync("/api/match/update-preferences", new
        {
            userId = user1Id,
            gender = 1,      // Male
            preference = 1   // Men
        });
        updateResp.EnsureSuccessStatusCode();
    
        var user2Reg = await _client2.PostAsJsonAsync("/Auth/register", new
        {
            username = "mike",
            password = "pass",
            genres = new[] { "metal" },
            gender = 1,      // Male
            preference = 1   // Men
        });
        var user2Data = await user2Reg.Content.ReadFromJsonAsync<JsonElement>();
        var user2Id = user2Data.GetProperty("userId").GetString();
        
        var cookie2 = ExtractAuthCookie(user2Reg);
        if (!string.IsNullOrEmpty(cookie2))
        {
            _client2.DefaultRequestHeaders.Remove("Cookie");
            _client2.DefaultRequestHeaders.Add("Cookie", cookie2);
        }
    
        var candidatesResp = await _client1.GetAsync($"/api/match/candidates?userId={user1Id}");
        candidatesResp.EnsureSuccessStatusCode();
        var candidates = await candidatesResp.Content.ReadFromJsonAsync<JsonElement>();
    
        candidates.EnumerateArray().Should().ContainSingle(c =>
            c.GetProperty("id").GetString() == user2Id);
    }
    
}
