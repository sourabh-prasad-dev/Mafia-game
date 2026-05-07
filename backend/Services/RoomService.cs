using System.Collections.Concurrent;
using MafiaGame.API.Models;

namespace MafiaGame.API.Services;

public class RoomService
{
    private readonly ConcurrentDictionary<string, Room> _rooms = new();
    private readonly Random _random = new();

    public Room CreateRoom(string hostName, string hostConnectionId)
    {
        var code = GenerateRoomCode();
        var host = new Player
        {
            Name = hostName,
            IsHost = true,
            ConnectionId = hostConnectionId
        };

        var room = new Room
        {
            RoomCode = code,
            Players = new List<Player> { host }
        };

        _rooms[code] = room;
        return (room, host.PlayerId) switch { _ => room };
    }

    public (Room? room, Player? player) JoinRoom(string code, string playerName, string connectionId)
    {
        code = code.ToUpper();
        if (!_rooms.TryGetValue(code, out var room)) return (null, null);
        if (room.Phase != GamePhase.Lobby) return (null, null);
        if (room.Players.Count >= 20) return (null, null);

        // Prevent duplicate names
        if (room.Players.Any(p => p.Name.Equals(playerName, StringComparison.OrdinalIgnoreCase)))
            return (null, null);

        var player = new Player { Name = playerName, ConnectionId = connectionId };
        room.Players.Add(player);
        return (room, player);
    }

    public Room? GetRoomByCode(string code) =>
        _rooms.TryGetValue(code.ToUpper(), out var r) ? r : null;

    public Room? GetRoomByConnectionId(string connectionId) =>
        _rooms.Values.FirstOrDefault(r => r.Players.Any(p => p.ConnectionId == connectionId));

    public Player? GetPlayerByConnectionId(Room room, string connectionId) =>
        room.Players.FirstOrDefault(p => p.ConnectionId == connectionId);

    public void UpdateConnectionId(string oldConnectionId, string newConnectionId)
    {
        var room = GetRoomByConnectionId(oldConnectionId);
        if (room == null) return;
        var player = room.Players.FirstOrDefault(p => p.ConnectionId == oldConnectionId);
        if (player != null) player.ConnectionId = newConnectionId;
    }

    public Player? RemovePlayer(string connectionId)
    {
        var room = GetRoomByConnectionId(connectionId);
        if (room == null) return null;
        var player = room.Players.FirstOrDefault(p => p.ConnectionId == connectionId);
        if (player == null) return null;

        // In lobby, actually remove; in-game, just mark disconnected (keep IsAlive)
        if (room.Phase == GamePhase.Lobby)
            room.Players.Remove(player);

        return player;
    }

    public void ResetRoomForReplay(Room room)
    {
        room.Phase = GamePhase.Lobby;
        room.RoundNumber = 0;
        room.NightActions.Clear();
        room.DayVotes.Clear();
        room.LastProtectedPlayerId = null;
        room.LastKilledPlayerId = null;
        room.TimerCts?.Cancel();
        room.TimerCts = null;

        foreach (var p in room.Players)
        {
            p.IsAlive = true;
            p.HasSubmittedAction = false;
            p.Role = PlayerRole.Citizen; // will be reassigned
        }
    }

    private string GenerateRoomCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        string code;
        do
        {
            code = new string(Enumerable.Range(0, 6).Select(_ => chars[_random.Next(chars.Length)]).ToArray());
        } while (_rooms.ContainsKey(code));
        return code;
    }
}
