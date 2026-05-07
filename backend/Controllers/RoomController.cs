using Microsoft.AspNetCore.Mvc;
using MafiaGame.API.Services;
using MafiaGame.API.Models;

namespace MafiaGame.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoomController : ControllerBase
{
    private readonly RoomService _roomService;

    public RoomController(RoomService roomService)
    {
        _roomService = roomService;
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
