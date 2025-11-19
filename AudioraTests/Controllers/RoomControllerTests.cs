using Audiora.Controllers;
using Audiora.Data;
using Audiora.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace AudioraTests.Controllers
{
    [Trait("Category", "Unit")]
    public class RoomControllerTests : IDisposable
    {
        private readonly AudioraDbContext _context;
        private readonly RoomController _controller;

        public RoomControllerTests()
        {
            var options = new DbContextOptionsBuilder<AudioraDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new AudioraDbContext(options);
            _controller = new RoomController(_context);
        }

        [Fact]
        public async Task CreateRoom_WithValidPublicRoom_ReturnsOkWithRoom()
        {
            var userId = Guid.NewGuid();
            var request = new CreateRoomRequest
            {
                Name = "Test Room",
                UserId = userId.ToString(),
                IsPrivate = false
            };
            
            var result = await _controller.CreateRoom(request);
            
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var room = okResult.Value.Should().BeOfType<Room>().Subject;
            
            room.Name.Should().Be("Test Room");
            room.HostUserId.Should().Be(userId);
            room.MemberUserIds.Should().ContainSingle().Which.Should().Be(userId);
            room.IsPrivate.Should().BeFalse();
            room.PasswordHash.Should().BeNull();
        }

        [Fact]
        public async Task CreateRoom_WithValidPrivateRoom_ReturnsOkWithHashedPassword()
        {
            var userId = Guid.NewGuid();
            var request = new CreateRoomRequest
            {
                Name = "Private Room",
                UserId = userId.ToString(),
                IsPrivate = true,
                Password = "secret123"
            };
            
            var result = await _controller.CreateRoom(request);
            
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var room = okResult.Value.Should().BeOfType<Room>().Subject;
            
            room.IsPrivate.Should().BeTrue();
            room.PasswordHash.Should().NotBeNullOrEmpty();
            BCrypt.Net.BCrypt.Verify("secret123", room.PasswordHash).Should().BeTrue();
        }

        [Fact]
        public async Task CreateRoom_WithEmptyName_ReturnsBadRequest()
        {
            var request = new CreateRoomRequest
            {
                Name = "",
                UserId = Guid.NewGuid().ToString(),
                IsPrivate = false
            };
            
            var result = await _controller.CreateRoom(request);
            
            var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequestResult.Value.Should().Be("Room name is required.");
        }

        [Fact]
        public async Task CreateRoom_WithInvalidUserId_ReturnsBadRequest()
        {
            var request = new CreateRoomRequest
            {
                Name = "Test Room",
                UserId = "invalid-guid",
                IsPrivate = false
            };
            
            var result = await _controller.CreateRoom(request);
            
            var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequestResult.Value.Should().Be("Invalid UserId.");
        }

        [Fact]
        public async Task CreateRoom_PrivateRoomWithoutPassword_ReturnsBadRequest()
        {
            var request = new CreateRoomRequest
            {
                Name = "Private Room",
                UserId = Guid.NewGuid().ToString(),
                IsPrivate = true,
                Password = null
            };
            
            var result = await _controller.CreateRoom(request);
            
            var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequestResult.Value.Should().Be("Password is required for private rooms.");
        }

        [Fact]
        public async Task ListRooms_ReturnsAllRoomsSortedByMembersAndDate()
        {
            var room1 = new Room
            {
                Name = "Room 1",
                HostUserId = Guid.NewGuid(),
                MemberUserIds = new List<Guid> { Guid.NewGuid() },
                CreatedAt = DateTime.UtcNow.AddHours(-2)
            };
            var room2 = new Room
            {
                Name = "Room 2",
                HostUserId = Guid.NewGuid(),
                MemberUserIds = new List<Guid> { Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid() },
                CreatedAt = DateTime.UtcNow.AddHours(-1)
            };
            var room3 = new Room
            {
                Name = "Room 3",
                HostUserId = Guid.NewGuid(),
                MemberUserIds = new List<Guid> { Guid.NewGuid(), Guid.NewGuid() },
                CreatedAt = DateTime.UtcNow
            };

            _context.Rooms.AddRange(room1, room2, room3);
            await _context.SaveChangesAsync();
            
            var result = await _controller.ListRooms();
            
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var rooms = okResult.Value.Should().BeAssignableTo<List<Room>>().Subject;
            
            rooms.Should().HaveCount(3);
            rooms[0].Name.Should().Be("Room 2"); // Most members (3)
            rooms[1].Name.Should().Be("Room 3"); // 2 members, newer
            rooms[2].Name.Should().Be("Room 1"); // Fewest members (1)
        }

        [Fact]
        public async Task GetRoom_WithValidRoomId_ReturnsRoom()
        {
            var room = new Room
            {
                Name = "Test Room",
                HostUserId = Guid.NewGuid(),
                MemberUserIds = new List<Guid> { Guid.NewGuid() }
            };
            _context.Rooms.Add(room);
            await _context.SaveChangesAsync();
            
            var result = await _controller.GetRoom(room.Id);
            
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var returnedRoom = okResult.Value.Should().BeOfType<Room>().Subject;
            returnedRoom.Id.Should().Be(room.Id);
            returnedRoom.Name.Should().Be("Test Room");
        }

        [Fact]
        public async Task GetRoom_WithNonExistentRoomId_ReturnsNotFound()
        {
            var result = await _controller.GetRoom(Guid.NewGuid());
            
            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task JoinRoom_PublicRoom_AddsUserToMembers()
        {
            var hostId = Guid.NewGuid();
            var joiningUserId = Guid.NewGuid();
            var room = new Room
            {
                Name = "Public Room",
                HostUserId = hostId,
                MemberUserIds = new List<Guid> { hostId },
                IsPrivate = false
            };
            _context.Rooms.Add(room);
            await _context.SaveChangesAsync();

            var request = new JoinRoomRequest
            {
                UserId = joiningUserId.ToString()
            };
            
            var result = await _controller.JoinRoom(room.Id, request);
            
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var returnedRoom = okResult.Value.Should().BeOfType<Room>().Subject;
            
            returnedRoom.MemberUserIds.Should().HaveCount(2);
            returnedRoom.MemberUserIds.Should().Contain(joiningUserId);
        }

        [Fact]
        public async Task JoinRoom_UserAlreadyMember_DoesNotAddDuplicate()
        {
            var userId = Guid.NewGuid();
            var room = new Room
            {
                Name = "Test Room",
                HostUserId = userId,
                MemberUserIds = new List<Guid> { userId },
                IsPrivate = false
            };
            _context.Rooms.Add(room);
            await _context.SaveChangesAsync();

            var request = new JoinRoomRequest
            {
                UserId = userId.ToString()
            };
            
            var result = await _controller.JoinRoom(room.Id, request);
            
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var returnedRoom = okResult.Value.Should().BeOfType<Room>().Subject;
            returnedRoom.MemberUserIds.Should().ContainSingle().Which.Should().Be(userId);
        }

        [Fact]
        public async Task JoinRoom_PrivateRoomWithCorrectPassword_ReturnsOk()
        {
            var hostId = Guid.NewGuid();
            var joiningUserId = Guid.NewGuid();
            var password = "secret123";
            var room = new Room
            {
                Name = "Private Room",
                HostUserId = hostId,
                MemberUserIds = new List<Guid> { hostId },
                IsPrivate = true,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password)
            };
            _context.Rooms.Add(room);
            await _context.SaveChangesAsync();

            var request = new JoinRoomRequest
            {
                UserId = joiningUserId.ToString(),
                Password = password
            };
            
            var result = await _controller.JoinRoom(room.Id, request);
            
            result.Should().BeOfType<OkObjectResult>();
            
            var updatedRoom = await _context.Rooms.FindAsync(room.Id);
            updatedRoom!.MemberUserIds.Should().Contain(joiningUserId);
        }

        [Fact]
        public async Task JoinRoom_PrivateRoomWithIncorrectPassword_ReturnsUnauthorized()
        {
            var hostId = Guid.NewGuid();
            var room = new Room
            {
                Name = "Private Room",
                HostUserId = hostId,
                MemberUserIds = new List<Guid> { hostId },
                IsPrivate = true,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("correct")
            };
            _context.Rooms.Add(room);
            await _context.SaveChangesAsync();

            var request = new JoinRoomRequest
            {
                UserId = Guid.NewGuid().ToString(),
                Password = "wrong"
            };
            var result = await _controller.JoinRoom(room.Id, request);
            
            var unauthorizedResult = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
            unauthorizedResult.Value.Should().Be("Invalid password.");
        }

        [Fact]
        public async Task JoinRoom_PrivateRoomWithoutPassword_ReturnsBadRequest()
        {
            var room = new Room
            {
                Name = "Private Room",
                HostUserId = Guid.NewGuid(),
                MemberUserIds = new List<Guid> { Guid.NewGuid() },
                IsPrivate = true,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("secret")
            };
            _context.Rooms.Add(room);
            await _context.SaveChangesAsync();

            var request = new JoinRoomRequest
            {
                UserId = Guid.NewGuid().ToString(),
                Password = null
            };
            
            var result = await _controller.JoinRoom(room.Id, request);
            
            var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequestResult.Value.Should().Be("Password is required.");
        }

        [Fact]
        public async Task JoinRoom_WithInvalidUserId_ReturnsBadRequest()
        {
            var room = new Room
            {
                Name = "Test Room",
                HostUserId = Guid.NewGuid(),
                MemberUserIds = new List<Guid> { Guid.NewGuid() }
            };
            _context.Rooms.Add(room);
            await _context.SaveChangesAsync();

            var request = new JoinRoomRequest
            {
                UserId = "invalid-guid"
            };
            
            var result = await _controller.JoinRoom(room.Id, request);
            
            var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequestResult.Value.Should().Be("Invalid UserId.");
        }

        [Fact]
        public async Task JoinRoom_WithNonExistentRoom_ReturnsNotFound()
        {
            var request = new JoinRoomRequest
            {
                UserId = Guid.NewGuid().ToString()
            };
            
            var result = await _controller.JoinRoom(Guid.NewGuid(), request);
            
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().Be("Room not found.");
        }

        [Fact]
        public async Task GetMessages_ReturnsMessagesOrderedByTimestamp()
        {
            var roomId = Guid.NewGuid();
            var message1 = new ChatMessage
            {
                RoomId = roomId,
                UserId = Guid.NewGuid(),
                Username = "User1",
                Message = "First",
                Timestamp = DateTime.UtcNow.AddMinutes(-2)
            };
            var message2 = new ChatMessage
            {
                RoomId = roomId,
                UserId = Guid.NewGuid(),
                Username = "User2",
                Message = "Second",
                Timestamp = DateTime.UtcNow.AddMinutes(-1)
            };
            var message3 = new ChatMessage
            {
                RoomId = roomId,
                UserId = Guid.NewGuid(),
                Username = "User3",
                Message = "Third",
                Timestamp = DateTime.UtcNow
            };

            _context.ChatMessages.AddRange(message3, message1, message2); // Add out of order
            await _context.SaveChangesAsync();
            
            var result = await _controller.GetMessages(roomId);
            
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var messages = okResult.Value.Should().BeAssignableTo<List<ChatMessage>>().Subject;
            
            messages.Should().HaveCount(3);
            messages[0].Message.Should().Be("First");
            messages[1].Message.Should().Be("Second");
            messages[2].Message.Should().Be("Third");
        }

        [Fact]
        public async Task GetMessages_WithNoMessages_ReturnsEmptyList()
        {
            var result = await _controller.GetMessages(Guid.NewGuid());
            
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var messages = okResult.Value.Should().BeAssignableTo<List<ChatMessage>>().Subject;
            messages.Should().BeEmpty();
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
