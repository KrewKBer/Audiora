using Audiora.Data;
using Audiora.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace AudioraTests.Hubs
{
    [Trait("Category", "Unit")]
    public class RoomHubTests : IDisposable
    {
        private readonly AudioraDbContext _context;
        private readonly Mock<IHubCallerClients> _mockClients;
        private readonly Mock<IClientProxy> _mockClientProxy;
        private readonly Mock<IGroupManager> _mockGroups;
        private readonly Mock<HubCallerContext> _mockContext;
        private readonly RoomHub _hub;

        public RoomHubTests()
        {
            var options = new DbContextOptionsBuilder<AudioraDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new AudioraDbContext(options);

            _mockClients = new Mock<IHubCallerClients>();
            _mockClientProxy = new Mock<IClientProxy>();
            _mockGroups = new Mock<IGroupManager>();
            _mockContext = new Mock<HubCallerContext>();

            _mockClients.Setup(c => c.Group(It.IsAny<string>())).Returns(_mockClientProxy.Object);
            _mockContext.Setup(c => c.ConnectionId).Returns("test-connection-id");

            _hub = new RoomHub(_context)
            {
                Clients = _mockClients.Object,
                Groups = _mockGroups.Object,
                Context = _mockContext.Object
            };
        }

        [Fact]
        public async Task JoinRoom_AddsConnectionToGroup()
        {
            var roomId = Guid.NewGuid().ToString();
            var userId = Guid.NewGuid().ToString();
            var username = "TestUser";

            await _hub.JoinRoom(roomId, userId, username);

            _mockGroups.Verify(g => g.AddToGroupAsync("test-connection-id", roomId, default), Times.Once);
            _mockClientProxy.Verify(c => c.SendCoreAsync("UserJoined", It.Is<object[]>(o => o[0].ToString() == username), default), Times.Once);
        }

        [Fact]
        public async Task RegisterUser_AddsConnectionToUserGroup()
        {
            var userId = Guid.NewGuid().ToString();

            await _hub.RegisterUser(userId);

            _mockGroups.Verify(g => g.AddToGroupAsync("test-connection-id", userId, default), Times.Once);
        }

        [Fact]
        public async Task JoinDirectChat_JoinsWithDeterministicGuid()
        {
            var userId1 = Guid.NewGuid().ToString();
            var userId2 = Guid.NewGuid().ToString();
            var chatId = $"{userId1}_{userId2}";
            var username = "TestUser";

            await _hub.JoinDirectChat(chatId, userId1, username);

            _mockGroups.Verify(g => g.AddToGroupAsync("test-connection-id", It.IsAny<string>(), default), Times.Once);
            _mockClientProxy.Verify(c => c.SendCoreAsync("UserJoined", It.Is<object[]>(o => o[0].ToString() == username), default), Times.Once);
        }

        [Fact]
        public async Task SendMessage_WithValidRoomId_SavesAndBroadcastsMessage()
        {
            var roomId = Guid.NewGuid();
            var userId = Guid.NewGuid();
            var username = "TestUser";
            var message = "Hello, World!";

            await _hub.JoinRoom(roomId.ToString(), userId.ToString(), username);

            await _hub.SendMessage(roomId.ToString(), userId.ToString(), username, message);

            var savedMessage = await _context.ChatMessages.FirstOrDefaultAsync();
            Assert.NotNull(savedMessage);
            Assert.Equal(roomId, savedMessage.RoomId);
            Assert.Equal(userId, savedMessage.UserId);
            Assert.Equal(username, savedMessage.Username);
            Assert.Equal(message, savedMessage.Message);

            _mockClientProxy.Verify(c => c.SendCoreAsync("ReceiveMessage", 
                It.Is<object[]>(o => o[0].ToString() == userId.ToString() && 
                                     o[1].ToString() == username && 
                                     o[2].ToString() == message), 
                default), Times.Once);
        }

        [Fact]
        public async Task SendMessage_WithoutJoiningRoom_ThrowsHubException()
        {
            var roomId = Guid.NewGuid().ToString();
            var userId = Guid.NewGuid().ToString();
            var username = "TestUser";

            await Assert.ThrowsAsync<HubException>(async () =>
                await _hub.SendMessage(roomId, userId, username, "Test"));
        }

        [Fact]
        public async Task SendMessage_WithInvalidRoomId_ThrowsHubException()
        {
            var invalidRoomId = "not-a-guid";
            var userId = Guid.NewGuid().ToString();

            await Assert.ThrowsAsync<HubException>(async () =>
                await _hub.SendMessage(invalidRoomId, userId, "User", "Test"));
        }

        [Fact]
        public async Task SendMessage_WithInvalidUserId_ThrowsHubException()
        {
            var roomId = Guid.NewGuid().ToString();
            var invalidUserId = "not-a-guid";

            await _hub.JoinRoom(roomId, invalidUserId, "User");

            await Assert.ThrowsAsync<HubException>(async () =>
                await _hub.SendMessage(roomId, invalidUserId, "User", "Test"));
        }

        [Fact]
        public async Task SendDirectMessage_SavesAndBroadcastsMessage()
        {
            var userId1 = Guid.NewGuid().ToString();
            var userId2 = Guid.NewGuid().ToString();
            var chatId = $"{userId1}_{userId2}";
            var username = "TestUser";
            var message = "Direct message test";

            await _hub.JoinDirectChat(chatId, userId1, username);

            await _hub.SendDirectMessage(chatId, userId1, username, message);

            var savedMessage = await _context.ChatMessages.FirstOrDefaultAsync();
            Assert.NotNull(savedMessage);
            Assert.Equal(username, savedMessage.Username);
            Assert.Equal(message, savedMessage.Message);

            _mockClientProxy.Verify(c => c.SendCoreAsync("ReceiveMessage",
                It.Is<object[]>(o => o[1].ToString() == username &&
                                     o[2].ToString() == message),
                default), Times.Once);
        }

        [Fact]
        public async Task SendDirectMessage_WithoutJoiningChat_ThrowsHubException()
        {
            var userId1 = Guid.NewGuid().ToString();
            var userId2 = Guid.NewGuid().ToString();
            var chatId = $"{userId1}_{userId2}";

            await Assert.ThrowsAsync<HubException>(async () =>
                await _hub.SendDirectMessage(chatId, userId1, "User", "Test"));
        }

        [Fact]
        public async Task SendDirectMessage_WithInvalidUserId_ThrowsHubException()
        {
            var chatId = "chat123";
            var invalidUserId = "not-a-guid";

            await _hub.JoinDirectChat(chatId, invalidUserId, "User");

            await Assert.ThrowsAsync<HubException>(async () =>
                await _hub.SendDirectMessage(chatId, invalidUserId, "User", "Test"));
        }

        [Fact]
        public async Task LeaveRoom_RemovesConnectionFromGroup()
        {
            var roomId = Guid.NewGuid().ToString();
            var username = "TestUser";

            await _hub.JoinRoom(roomId, Guid.NewGuid().ToString(), username);
            await _hub.LeaveRoom(roomId, username);

            _mockGroups.Verify(g => g.RemoveFromGroupAsync("test-connection-id", roomId, default), Times.Once);
            _mockClientProxy.Verify(c => c.SendCoreAsync("UserLeft", It.Is<object[]>(o => o[0].ToString() == username), default), Times.Once);
        }

        [Fact]
        public async Task AddSong_BroadcastsToRoom()
        {
            var roomId = Guid.NewGuid().ToString();
            var song = new { Id = "song1", Name = "Test Song", Artist = "Test Artist" };

            await _hub.JoinRoom(roomId, Guid.NewGuid().ToString(), "User");
            await _hub.AddSong(roomId, song);

            _mockClientProxy.Verify(c => c.SendCoreAsync("SongAdded", It.Is<object[]>(o => o[0] == song), default), Times.Once);
        }

        [Fact]
        public async Task AddSong_WithoutJoiningRoom_ThrowsHubException()
        {
            var roomId = Guid.NewGuid().ToString();
            var song = new { Id = "song1" };

            await Assert.ThrowsAsync<HubException>(async () =>
                await _hub.AddSong(roomId, song));
        }

        [Fact]
        public async Task VoteSong_BroadcastsVoteToRoom()
        {
            var roomId = Guid.NewGuid().ToString();
            var songId = "song1";
            var userId = Guid.NewGuid().ToString();

            await _hub.JoinRoom(roomId, userId, "User");
            await _hub.VoteSong(roomId, songId, userId, true);

            _mockClientProxy.Verify(c => c.SendCoreAsync("SongVoted",
                It.Is<object[]>(o => o[0].ToString() == songId &&
                                     o[1].ToString() == userId &&
                                     (bool)o[2] == true),
                default), Times.Once);
        }

        [Fact]
        public async Task VoteSong_WithoutJoiningRoom_ThrowsHubException()
        {
            var roomId = Guid.NewGuid().ToString();

            await Assert.ThrowsAsync<HubException>(async () =>
                await _hub.VoteSong(roomId, "song1", Guid.NewGuid().ToString(), true));
        }

        [Fact]
        public async Task VoteSong_WithDislike_BroadcastsFalse()
        {
            var roomId = Guid.NewGuid().ToString();
            var userId = Guid.NewGuid().ToString();

            await _hub.JoinRoom(roomId, userId, "User");
            await _hub.VoteSong(roomId, "song1", userId, false);

            _mockClientProxy.Verify(c => c.SendCoreAsync("SongVoted",
                It.Is<object[]>(o => (bool)o[2] == false),
                default), Times.Once);
        }

        [Fact]
        public async Task OnDisconnectedAsync_RemovesConnectionTracking()
        {
            var roomId = Guid.NewGuid().ToString();
            var userId = Guid.NewGuid().ToString();

            await _hub.JoinRoom(roomId, userId, "User");
            await _hub.RegisterUser(userId);

            await _hub.OnDisconnectedAsync(null);

            // Verify cleanup happened - subsequent operations should fail
            await Assert.ThrowsAsync<HubException>(async () =>
                await _hub.SendMessage(roomId, userId, "User", "Test"));
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
