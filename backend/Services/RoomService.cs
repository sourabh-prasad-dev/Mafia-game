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

    /// <summary>Find a room by playerId (needed for reconnect where connectionId has changed).</summary>
    public Room? GetRoomByPlayerId(string playerId) =>
        _rooms.Values.FirstOrDefault(r => r.Players.Any(p => p.PlayerId == playerId));

    public Player? GetPlayerByConnectionId(Room room, string connectionId) =>
        room.Players.FirstOrDefault(p => p.ConnectionId == connectionId);

    public Player? GetPlayerByPlayerId(Room room, string playerId) =>
        room.Players.FirstOrDefault(p => p.PlayerId == playerId);

    public void UpdateConnectionId(string oldConnectionId, string newConnectionId)
    {
        var room = GetRoomByConnectionId(oldConnectionId);
        if (room == null) return;
        var player = room.Players.FirstOrDefault(p => p.ConnectionId == oldConnectionId);
        if (player != null) player.ConnectionId = newConnectionId;
    }

    /// <summary>Remove a player from the lobby. Returns (removedPlayer, isRoomNowEmpty).</summary>
    public (Player? player, bool roomEmpty) RemovePlayerFromLobby(string connectionId)
    {
        var room = GetRoomByConnectionId(connectionId);
        if (room == null) return (null, false);
        var player = room.Players.FirstOrDefault(p => p.ConnectionId == connectionId);
        if (player == null) return (null, false);

        if (room.Phase == GamePhase.Lobby || room.Phase == GamePhase.GameOver)
        {
            room.Players.Remove(player);

            // If a host left and there are still players, promote one randomly
            if (player.IsHost && room.Players.Count > 0)
            {
                var randomIndex = _random.Next(room.Players.Count);
                room.Players[randomIndex].IsHost = true;
            }

            if (room.Players.Count == 0)
            {
                DeleteRoom(room.RoomCode);
                return (player, true);
            }
        }

        return (player, false);
    }

    /// <summary>
    /// Remove a player by their stable PlayerId. Only removes if their current ConnectionId
    /// matches expectedConnectionId — this prevents removing a player who already reconnected
    /// with a new ConnectionId during the grace period.
    /// </summary>
    public (Player? player, bool roomEmpty, string? roomCode) RemovePlayerByPlayerId(
        string playerId, string expectedConnectionId)
    {
        var room = GetRoomByPlayerId(playerId);
        if (room == null) return (null, false, null);

        var player = room.Players.FirstOrDefault(p => p.PlayerId == playerId);
        if (player == null) return (null, false, null);

        // If the ConnectionId has changed, the player already reconnected — don't remove
        if (player.ConnectionId != expectedConnectionId)
            return (null, false, null);

        var roomCode = room.RoomCode;

        if (room.Phase == GamePhase.Lobby || room.Phase == GamePhase.GameOver)
        {
            room.Players.Remove(player);

            if (player.IsHost && room.Players.Count > 0)
            {
                var randomIndex = _random.Next(room.Players.Count);
                room.Players[randomIndex].IsHost = true;
            }

            if (room.Players.Count == 0)
            {
                DeleteRoom(roomCode);
                return (player, true, roomCode);
            }

            return (player, false, roomCode);
        }

        return (null, false, roomCode);
    }

    /// <summary>Delete a room and cancel its timers.</summary>
    public void DeleteRoom(string roomCode)
    {
        roomCode = roomCode.ToUpper();
        if (_rooms.TryRemove(roomCode, out var room))
        {
            room.TimerCts?.Cancel();
        }
    }

    /// <summary>Check if a room has zero connected players and delete it.</summary>
    public bool TryCleanupEmptyRoom(string roomCode)
    {
        roomCode = roomCode.ToUpper();
        if (!_rooms.TryGetValue(roomCode, out var room)) return false;
        if (room.Players.Count == 0)
        {
            DeleteRoom(roomCode);
            return true;
        }
        return false;
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
