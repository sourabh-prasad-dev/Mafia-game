using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using MafiaGame.API.Services;
using MafiaGame.API.Models;
using MafiaGame.API.Hubs;

namespace MafiaGame.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoomController : ControllerBase
{
    private readonly RoomService _roomService;
    private readonly IHubContext<GameHub> _hubContext;

    public RoomController(RoomService roomService, IHubContext<GameHub> hubContext)
    {
        _roomService = roomService;
        _hubContext = hubContext;
    }

    [HttpPost("create")]
    public IActionResult CreateRoom([FromBody] CreateRoomRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.HostName))
            return BadRequest(new { error = "Host name is required" });

        var room = _roomService.CreateRoom(req.HostName, "pending");
        var host = room.Players.First();

        return Ok(new
        {
            roomCode = room.RoomCode,
            playerId = host.PlayerId,
            playerName = host.Name,
            isHost = true
        });
    }

    [HttpPost("join")]
    public IActionResult JoinRoom([FromBody] JoinRoomRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.PlayerName) || string.IsNullOrWhiteSpace(req.RoomCode))
            return BadRequest(new { error = "Player name and room code are required" });

        var (room, player) = _roomService.JoinRoom(req.RoomCode, req.PlayerName, "pending");

        if (room == null || player == null)
            return BadRequest(new { error = "Could not join room. Room may not exist, be full, or already in progress. Name may be taken." });

        return Ok(new
        {
            roomCode = room.RoomCode,
            playerId = player.PlayerId,
            playerName = player.Name,
            isHost = false,
            players = room.Players.Select(p => new { p.PlayerId, p.Name, p.IsHost })
        });
    }

    [HttpGet("{code}")]
    public IActionResult GetRoom(string code)
    {
        var room = _roomService.GetRoomByCode(code);
        if (room == null) return NotFound(new { error = "Room not found" });

        return Ok(new
        {
            roomCode = room.RoomCode,
            phase = room.Phase.ToString(),
            playerCount = room.Players.Count,
            players = room.Players.Select(p => new { p.PlayerId, p.Name, p.IsAlive, p.IsHost })
        });
    }

    [HttpGet("{code}/players")]
    public IActionResult GetPlayers(string code)
    {
        var room = _roomService.GetRoomByCode(code);
        if (room == null) return NotFound(new { error = "Room not found" });

        return Ok(room.Players.Select(p => new { p.PlayerId, p.Name, p.IsAlive, p.IsHost }));
    }

    /// &lt;summary&gt;
    /// Called by the frontend when a player explicitly leaves the lobby.
    /// Updates server state and broadcasts PlayerLeft via SignalR so all clients update immediately.
    /// &lt;/summary&gt;
    [HttpPost("{code}/leave")]
    public async Task<IActionResult> LeaveRoom(string code, [FromBody] LeaveRoomRequest req)
    {
        code = code.ToUpper();
        if (string.IsNullOrWhiteSpace(req.PlayerId))
            return BadRequest(new { error = "PlayerId is required" });

        var room = _roomService.GetRoomByCode(code);
        if (room == null) return NotFound(new { error = "Room not found" });

        var player = room.Players.FirstOrDefault(p => p.PlayerId == req.PlayerId);
        if (player == null) return NotFound(new { error = "Player not found" });

        var playerName = player.Name;
        var playerConnectionId = player.ConnectionId; // use the player's actual connectionId

        // Cancel any pending disconnect timer for this player
        GameHub.CancelDisconnectTimer(req.PlayerId);

        // Remove using the player's own connectionId (not the HTTP caller's)
        _roomService.RemovePlayerByPlayerId(req.PlayerId, playerConnectionId);

        var updatedRoom = _roomService.GetRoomByCode(code);
        if (updatedRoom == null)
        {
            return Ok(new { roomDeleted = true, players = Array.Empty<object>() });
        }

        // Broadcast to all remaining players so they see the updated list + new host immediately
        await _hubContext.Clients.Group(code).SendAsync("PlayerLeft", new
        {
            playerName,
            playerCount = updatedRoom.Players.Count,
            players = updatedRoom.Players.Select(p => new { p.PlayerId, p.Name, p.IsHost, p.IsAlive })
        });

        return Ok(new
        {
            roomDeleted = false,
            players = updatedRoom.Players.Select(p => new { p.PlayerId, p.Name, p.IsHost, p.IsAlive })
        });
    }
}

public class CreateRoomRequest
{
    public string HostName { get; set; } = string.Empty;
}

public class JoinRoomRequest
{
    public string RoomCode { get; set; } = string.Empty;
    public string PlayerName { get; set; } = string.Empty;
}

public class LeaveRoomRequest
{
    public string PlayerId { get; set; } = string.Empty;
}
