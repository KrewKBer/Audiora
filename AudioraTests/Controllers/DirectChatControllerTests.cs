using Audiora.Controllers;
using Audiora.Data;
using Audiora.Models;
using Audiora.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Moq;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Http;

namespace AudioraTests.Controllers;

[Trait("Category", "Unit")]
public class DirectChatControllerTests : IDisposable
{
    private readonly AudioraDbContext _context;
    private readonly Mock<IHubContext<RoomHub>> _mockHubContext;
    private readonly DirectChatController _controller;

    public DirectChatControllerTests()
    {
        var options = new DbContextOptionsBuilder<AudioraDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new AudioraDbContext(options);
        _mockHubContext = new Mock<IHubContext<RoomHub>>();
        
        var mockClients = new Mock<IHubClients>();
        var mockClientProxy = new Mock<IClientProxy>();
        _mockHubContext.Setup(h => h.Clients).Returns(mockClients.Object);
        mockClients.Setup(c => c.Group(It.IsAny<string>())).Returns(mockClientProxy.Object);

        _controller = new DirectChatController(_context, _mockHubContext.Object);
    }

    [Fact]
    public async Task GetMessages_WithValidChatId_ReturnsMessages()
    {
        var chatId = "user1_user2";
        var roomGuid = ChatIdToGuid(chatId);
        var message1 = new ChatMessage
        {
            RoomId = roomGuid,
            UserId = Guid.NewGuid(),
            Username = "User1",
            Message = "Hello",
            Timestamp = DateTime.UtcNow.AddMinutes(-1)
        };
        var message2 = new ChatMessage
        {
            RoomId = roomGuid,
            UserId = Guid.NewGuid(),
            Username = "User2",
            Message = "Hi",
            Timestamp = DateTime.UtcNow
        };

        _context.ChatMessages.AddRange(message1, message2);
        await _context.SaveChangesAsync();

        var result = await _controller.GetMessages(chatId);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var messages = okResult.Value.Should().BeAssignableTo<List<ChatMessage>>().Subject;
        messages.Should().HaveCount(2);
        messages[0].Message.Should().Be("Hello");
        messages[1].Message.Should().Be("Hi");
    }

    [Fact]
    public async Task GetMessages_WithEmptyChatId_ReturnsBadRequest()
    {
        var result = await _controller.GetMessages("");

        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().Be("chatId required");
    }

    [Fact]
    public async Task Send_WithValidRequest_SavesAndReturnsMessage()
    {
        var userId = Guid.NewGuid().ToString();
        SetupUser(userId);
        var request = new DirectChatController.SendRequest
        {
            ChatId = "user1_user2",
            UserId = userId,
            Username = "TestUser",
            Message = "Test message"
        };

        var result = await _controller.Send(request);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var message = okResult.Value.Should().BeOfType<ChatMessage>().Subject;
        message.Message.Should().Be("Test message");
        message.Username.Should().Be("TestUser");

        var savedMessage = await _context.ChatMessages.FirstOrDefaultAsync(m => m.Message == "Test message");
        savedMessage.Should().NotBeNull();
    }

    [Fact]
    public async Task Send_WithEmptyMessage_ReturnsBadRequest()
    {
        var userId = Guid.NewGuid().ToString();
        SetupUser(userId);
        var request = new DirectChatController.SendRequest
        {
            ChatId = "user1_user2",
            UserId = userId,
            Username = "TestUser",
            Message = ""
        };

        var result = await _controller.Send(request);

        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().Be("Empty message");
    }

    [Fact]
    public async Task Send_WithInvalidUserId_ReturnsBadRequest()
    {
        var userId = "invalid-guid";
        SetupUser(userId);
        var request = new DirectChatController.SendRequest
        {
            ChatId = "user1_user2",
            UserId = userId,
            Username = "TestUser",
            Message = "Test"
        };

        var result = await _controller.Send(request);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Send_WithMissingFields_ReturnsBadRequest()
    {
        SetupUser("");
        var request = new DirectChatController.SendRequest
        {
            ChatId = "",
            UserId = "",
            Username = "",
            Message = "Test"
        };

        var result = await _controller.Send(request);

        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().Be("Missing required fields");
    }

    private static Guid ChatIdToGuid(string chatId)
    {
        using var md5 = System.Security.Cryptography.MD5.Create();
        var hash = md5.ComputeHash(System.Text.Encoding.UTF8.GetBytes(chatId));
        Span<byte> guidBytes = stackalloc byte[16];
        hash.AsSpan(0, 16).CopyTo(guidBytes);
        return new Guid(guidBytes);
    }

    private void SetupUser(string userId)
    {
        var claims = new List<System.Security.Claims.Claim>
        {
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, userId)
        };
        var identity = new System.Security.Claims.ClaimsIdentity(claims, "TestAuthType");
        var claimsPrincipal = new System.Security.Claims.ClaimsPrincipal(identity);

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claimsPrincipal }
        };
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    private class MockWebHostEnvironment : IWebHostEnvironment
    {
        public string WebRootPath { get; set; } = "";
        public string EnvironmentName { get; set; } = "Test";
        public string ApplicationName { get; set; } = "Audiora";
        public IFileProvider WebRootFileProvider { get; set; } = null!;
        public IFileProvider ContentRootFileProvider { get; set; } = null!;
        public string ContentRootPath { get; set; } = Path.GetTempPath();
    }
}
