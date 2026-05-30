using Microsoft.AspNetCore.SignalR;
using MafiaGame.API.Models;
using MafiaGame.API.Services;
using MafiaGame.API.DTOs;
using System.Collections.Concurrent;

namespace MafiaGame.API.Hubs;

public class GameHub : Hub
{
    private readonly RoomService _roomService;
    private readonly RoleAssignmentService _roleService;
    private readonly NightResolutionService _nightService;
    private readonly DayVoteService _dayVoteService;
    private readonly GameStateService _gameStateService;
    private readonly IHubContext<GameHub> _hubContext;

    // Grace period: tracks pending disconnects so a refresh doesn't kill the player
    private static readonly ConcurrentDictionary<string, CancellationTokenSource> _disconnectTimers = new();

    /// <summary>Cancel a pending disconnect timer for a player. Called by REST controller on explicit leave.</summary>
    public static void CancelDisconnectTimer(string playerId)
    {
        if (_disconnectTimers.TryRemove(playerId, out var cts))
            cts.Cancel();
    }

    public GameHub(
        RoomService roomService,
        RoleAssignmentService roleService,
        NightResolutionService nightService,
        DayVoteService dayVoteService,
        GameStateService gameStateService,
        IHubContext<GameHub> hubContext)
    {
        _roomService = roomService;
        _roleService = roleService;
        _nightService = nightService;
        _dayVoteService = dayVoteService;
        _gameStateService = gameStateService;
        _hubContext = hubContext;
    }

    // ─── Connection lifecycle ────────────────────────────────────────────────

    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // Capture values before hub is disposed (hub instances are transient)
        var connectionId = Context.ConnectionId;
        var room = _roomService.GetRoomByConnectionId(connectionId);

        if (room != null)
        {
            var player = _roomService.GetPlayerByConnectionId(room, connectionId);
            var roomCode = room.RoomCode;

            // Remove the dead connection from the SignalR group immediately
            await Groups.RemoveFromGroupAsync(connectionId, roomCode);

            if (player != null && room.Phase == GamePhase.Lobby)
            {
                var playerId = player.PlayerId;

                // Cancel any existing timer for this player (e.g. double-disconnect)
                if (_disconnectTimers.TryRemove(playerId, out var oldCts))
                    oldCts.Cancel();

                // Start a long safety-net timer (60s) for truly closed tabs.
                // If the player reconnects (via RegisterPlayer), this timer is cancelled.
                // If it fires, it double-checks that the connectionId is still the OLD one
                // (meaning no reconnect happened) before removing.
                var cts = new CancellationTokenSource();
                _disconnectTimers[playerId] = cts;

                _ = Task.Run(async () =>
                {
                    try
                    {
                        await Task.Delay(60_000, cts.Token);

                        // 60 seconds passed — player truly left
                        _disconnectTimers.TryRemove(playerId, out _);

                        // Safety: only remove if their connectionId is still the old one
                        var (removed, roomEmpty, _) = _roomService.RemovePlayerByPlayerId(playerId, connectionId);

                        if (removed != null && !roomEmpty)
                        {
                            var updatedRoom = _roomService.GetRoomByCode(roomCode);
                            if (updatedRoom != null)
                            {
                                await _hubContext.Clients.Group(roomCode).SendAsync("PlayerLeft", new
                                {
                                    playerName = removed.Name,
                                    playerCount = updatedRoom.Players.Count,
                                    players = updatedRoom.Players.Select(p => new { p.PlayerId, p.Name, p.IsHost })
                                });
                            }
                        }
                    }
                    catch (TaskCanceledException)
                    {
                        // Player reconnected — timer was cancelled by RegisterPlayer
                    }
                });
            }
            // During in-game phases (Night, Day, etc.), never remove. Player stays in roster.
        }

        await base.OnDisconnectedAsync(exception);
    }

    // ─── Lobby ───────────────────────────────────────────────────────────────

    /// <summary>Called after REST join; registers the player in the SignalR group.</summary>
    public async Task RegisterPlayer(string roomCode, string playerId)
    {
        roomCode = roomCode.ToUpper();
        var room = _roomService.GetRoomByCode(roomCode);
        if (room == null) { await Clients.Caller.SendAsync("Error", "Room not found"); return; }

        var player = room.Players.FirstOrDefault(p => p.PlayerId == playerId);
        if (player == null)
        {
            // Player was purged (grace period expired before reconnect succeeded).
            // Tell the client to clear state and go home instead of sitting on a dead lobby.
            await Clients.Caller.SendAsync("KickedFromRoom");
            return;
        }

        // Cancel any pending disconnect timer — the player is back
        if (_disconnectTimers.TryRemove(playerId, out var cts))
        {
            cts.Cancel();
        }

        var isReconnect = player.ConnectionId != "pending" && player.ConnectionId != Context.ConnectionId;

        // Update the connection ID to the new one
        player.ConnectionId = Context.ConnectionId;
        await Groups.AddToGroupAsync(Context.ConnectionId, roomCode);

        // Always broadcast the current player list to the group.
        // On first join: other players see the new player appear.
        // On reconnect: other players resync their list (guarantees no stale state).
        await _hubContext.Clients.Group(roomCode).SendAsync("PlayerJoined", new
        {
            playerName = player.Name,
            playerCount = room.Players.Count,
            players = room.Players.Select(p => new { p.PlayerId, p.Name, p.IsHost })
        });

        // Send caller the full room state so they can sync after a refresh
        var mafiaTeammates = player.Role == PlayerRole.Mafia
            ? room.Players.Where(p => p.Role == PlayerRole.Mafia && p.PlayerId != playerId)
                .Select(p => new { p.PlayerId, p.Name })
                .ToList()
            : null;

        await Clients.Caller.SendAsync("RoomStateSync", new
        {
            phase = room.Phase.ToString(),
            players = room.Players.Select(p => new { p.PlayerId, p.Name, p.IsAlive, p.IsHost }),
            round = room.RoundNumber,
            // These allow the client to restore game state after refresh
            yourRole = player.Role.ToString(),
            mafiaTeammates,
            hasSubmittedNightAction = player.HasSubmittedAction && (room.Phase == GamePhase.Night),
            hasSubmittedDayVote = room.DayVotes.ContainsKey(playerId),
            myDayVote = room.DayVotes.TryGetValue(playerId, out var dv) ? dv : null,
            dayVoteCounts = room.DayVotes
                .GroupBy(kv => kv.Value)
                .ToDictionary(g => g.Key, g => g.Count()),
            voterToTarget = room.DayVotes,
            votedPlayerIds = room.DayVotes.Keys.ToList(),
        });
    }

    public async Task LeaveRoom(string roomCode)
    {
        roomCode = roomCode.ToUpper();
        var room = _roomService.GetRoomByCode(roomCode);
        if (room == null) return;

        var player = _roomService.GetPlayerByConnectionId(room, Context.ConnectionId);
        if (player == null) return;

        var playerId = player.PlayerId;

        // Cancel any pending disconnect timer — the player is leaving explicitly
        if (_disconnectTimers.TryRemove(playerId, out var cts))
        {
            cts.Cancel();
        }

        var (removed, roomEmpty, _) = _roomService.RemovePlayerByPlayerId(playerId, Context.ConnectionId);

        if (removed != null && !roomEmpty)
        {
            // Re-fetch room to get updated player list
            var updatedRoom = _roomService.GetRoomByCode(roomCode);
            if (updatedRoom != null)
            {
                await _hubContext.Clients.Group(roomCode).SendAsync("PlayerLeft", new
                {
                    playerName = removed.Name,
                    playerCount = updatedRoom.Players.Count,
                    players = updatedRoom.Players.Select(p => new { p.PlayerId, p.Name, p.IsHost })
                });
            }
        }

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomCode);
    }

    // ─── Start Game ──────────────────────────────────────────────────────────

    public async Task StartGame(string roomCode)
    {
        roomCode = roomCode.ToUpper();
        var room = _roomService.GetRoomByCode(roomCode);
        if (room == null) { await Clients.Caller.SendAsync("Error", "Room not found"); return; }

        var caller = _roomService.GetPlayerByConnectionId(room, Context.ConnectionId);
        if (caller == null || !caller.IsHost) { await Clients.Caller.SendAsync("Error", "Only the host can start"); return; }
        if (room.Phase != GamePhase.Lobby) { await Clients.Caller.SendAsync("Error", "Game already started"); return; }
        if (room.Players.Count < 4) { await Clients.Caller.SendAsync("Error", "Need at least 4 players"); return; }

        _roleService.AssignRoles(room.Players);
        room.Phase = GamePhase.Night;
        room.RoundNumber = 1;

        var mafiaPlayers = room.Players.Where(p => p.Role == PlayerRole.Mafia).ToList();

        foreach (var player in room.Players)
        {
            var roleDto = new PlayerRoleDto { Role = player.Role.ToString() };
            if (player.Role == PlayerRole.Mafia)
            {
                roleDto.MafiaTeammates = mafiaPlayers
                    .Where(m => m.PlayerId != player.PlayerId)
                    .Select(m => new MafiaTeammateDto { PlayerId = m.PlayerId, Name = m.Name })
                    .ToList();
            }

            await _hubContext.Clients.Client(player.ConnectionId).SendAsync("GameStarted", new
            {
                yourRole = roleDto.Role,
                mafiaTeammates = roleDto.MafiaTeammates,
                playerId = player.PlayerId
            });
        }

        await _hubContext.Clients.Group(roomCode).SendAsync("PhaseChanged", new
        {
            phase = "Night",
            players = room.Players.Select(p => new { p.PlayerId, p.Name, p.IsAlive }),
            round = room.RoundNumber
        });

        _ = StartNightTimer(room);
    }

    // ─── Night Actions ───────────────────────────────────────────────────────

    public async Task SubmitNightAction(string roomCode, string actionType, string? targetPlayerId)
    {
        roomCode = roomCode.ToUpper();
        var room = _roomService.GetRoomByCode(roomCode);
        if (room == null || room.Phase != GamePhase.Night) return;

        var caller = _roomService.GetPlayerByConnectionId(room, Context.ConnectionId);
        if (caller == null || !caller.IsAlive) { await Clients.Caller.SendAsync("Error", "Invalid action"); return; }

        bool valid = (actionType, caller.Role) switch
        {
            ("MafiaKill", PlayerRole.Mafia) => true,
            ("DoctorProtect", PlayerRole.Doctor) => true,
            ("DetectiveInvestigate", PlayerRole.Detective) => true,
            ("CitizenSkip", PlayerRole.Citizen) => true,
            _ => false
        };

        if (!valid) { await Clients.Caller.SendAsync("Error", "Action not allowed for your role"); return; }

        if (targetPlayerId != null)
        {
            var target = room.Players.FirstOrDefault(p => p.PlayerId == targetPlayerId);
            if (target == null || !target.IsAlive)
            {
                await Clients.Caller.SendAsync("Error", "Invalid target"); return;
            }
            if (actionType == "MafiaKill" && targetPlayerId == caller.PlayerId)
            {
                await Clients.Caller.SendAsync("Error", "Mafia cannot target themselves"); return;
            }
            if (actionType == "DoctorProtect" && targetPlayerId == room.LastProtectedPlayerId)
            {
                await Clients.Caller.SendAsync("Error", "Doctor cannot protect same player twice in a row"); return;
            }
        }

        room.NightActions.RemoveAll(a => a.PlayerId == caller.PlayerId);
        room.NightActions.Add(new NightAction
        {
            PlayerId = caller.PlayerId,
            ActionType = Enum.Parse<ActionType>(actionType),
            TargetPlayerId = targetPlayerId
        });

        caller.HasSubmittedAction = true;

        if (actionType == "DetectiveInvestigate" && targetPlayerId != null)
        {
            var target = room.Players.First(p => p.PlayerId == targetPlayerId);
            await Clients.Caller.SendAsync("DetectiveResult", new
            {
                targetName = target.Name,
                isMafia = target.Role == PlayerRole.Mafia
            });
        }

        if (actionType == "MafiaKill")
        {
            var mafiaVotes = room.NightActions
                .Where(a => a.ActionType == ActionType.MafiaKill)
                .ToDictionary(a => a.PlayerId, a => a.TargetPlayerId);

            var mafiaConnections = room.Players
                .Where(p => p.Role == PlayerRole.Mafia && p.IsAlive)
                .Select(p => p.ConnectionId)
                .ToList();

            await _hubContext.Clients.Clients(mafiaConnections).SendAsync("MafiaVoteUpdated", new
            {
                votes = mafiaVotes
            });
        }

        if (_gameStateService.AllLivingPlayersSubmitted(room))
        {
            room.TimerCts?.Cancel();
            await ResolveNight(room);
        }
    }

    // ─── Day Vote ────────────────────────────────────────────────────────────

    public async Task SubmitDayVote(string roomCode, string targetPlayerId)
    {
        roomCode = roomCode.ToUpper();
        var room = _roomService.GetRoomByCode(roomCode);
        if (room == null || room.Phase != GamePhase.DayVote) return;

        var caller = _roomService.GetPlayerByConnectionId(room, Context.ConnectionId);
        if (caller == null || !caller.IsAlive) { await Clients.Caller.SendAsync("Error", "Invalid vote"); return; }

        var target = room.Players.FirstOrDefault(p => p.PlayerId == targetPlayerId && p.IsAlive);
        if (target == null) { await Clients.Caller.SendAsync("Error", "Invalid target"); return; }
        if (target.PlayerId == caller.PlayerId) { await Clients.Caller.SendAsync("Error", "Cannot vote for yourself"); return; }

        room.DayVotes[caller.PlayerId] = targetPlayerId;
        caller.HasSubmittedAction = true;

        var voteCounts = room.DayVotes
            .GroupBy(kv => kv.Value)
            .ToDictionary(g => g.Key, g => g.Count());

        await _hubContext.Clients.Group(roomCode).SendAsync("VoteCountUpdated", new
        {
            voteCounts,
            votedPlayerIds = room.DayVotes.Keys.ToList(),
            voterToTarget = room.DayVotes
        });

        if (_gameStateService.AllLivingPlayersVoted(room))
        {
            room.TimerCts?.Cancel();
            await ResolveDayVote(room);
        }
    }

    // ─── Host: Proceed to Vote ───────────────────────────────────────────────

    public async Task ProceedToVote(string roomCode)
    {
        roomCode = roomCode.ToUpper();
        var room = _roomService.GetRoomByCode(roomCode);
        if (room == null || room.Phase != GamePhase.Day) return;

        var caller = _roomService.GetPlayerByConnectionId(room, Context.ConnectionId);
        if (caller == null || !caller.IsHost)
        {
            await Clients.Caller.SendAsync("Error", "Only the host can proceed to vote");
            return;
        }

        room.TimerCts?.Cancel();
        room.Phase = GamePhase.DayVote;
        foreach (var p in room.Players)
            p.HasSubmittedAction = false;

        await _hubContext.Clients.Group(roomCode).SendAsync("PhaseChanged", new
        {
            phase = "DayVote",
            players = room.Players.Select(p => new { p.PlayerId, p.Name, p.IsAlive }),
            round = room.RoundNumber
        });

        _ = StartDayVoteTimer(room);
    }

    // ─── Play Again ──────────────────────────────────────────────────────────

    public async Task PlayAgain(string roomCode)
    {
        roomCode = roomCode.ToUpper();
        var room = _roomService.GetRoomByCode(roomCode);
        if (room == null || room.Phase != GamePhase.GameOver) return;

        var caller = _roomService.GetPlayerByConnectionId(room, Context.ConnectionId);
        if (caller == null || !caller.IsHost) { await Clients.Caller.SendAsync("Error", "Only the host can restart"); return; }

        _roomService.ResetRoomForReplay(room);

        await _hubContext.Clients.Group(roomCode).SendAsync("GameReset", new
        {
            players = room.Players.Select(p => new { p.PlayerId, p.Name, p.IsHost }),
            roomCode = room.RoomCode
        });
    }

    // ─── Timer helpers ───────────────────────────────────────────────────────

    private async Task StartNightTimer(Room room)
    {
        room.TimerCts?.Cancel();
        room.TimerCts = new CancellationTokenSource();
        var cts = room.TimerCts;

        try
        {
            for (int sec = room.NightTimeoutSeconds; sec >= 0; sec--)
            {
                if (cts.Token.IsCancellationRequested) return;
                await _hubContext.Clients.Group(room.RoomCode).SendAsync("TimerUpdate", new { secondsRemaining = sec });
                if (sec == 0) break;
                await Task.Delay(1000, cts.Token);
            }

            if (!cts.Token.IsCancellationRequested)
                await ResolveNight(room);
        }
        catch (TaskCanceledException) { }
    }

    private async Task StartDayDiscussionTimer(Room room)
    {
        room.TimerCts?.Cancel();
        room.TimerCts = new CancellationTokenSource();
        var cts = room.TimerCts;

        try
        {
            for (int sec = room.DayDiscussionSeconds; sec >= 0; sec--)
            {
                if (cts.Token.IsCancellationRequested) return;
                await _hubContext.Clients.Group(room.RoomCode).SendAsync("TimerUpdate", new { secondsRemaining = sec });
                if (sec == 0) break;
                await Task.Delay(1000, cts.Token);
            }
        }
        catch (TaskCanceledException) { }
    }

    private async Task StartDayVoteTimer(Room room)
    {
        room.TimerCts?.Cancel();
        room.TimerCts = new CancellationTokenSource();
        var cts = room.TimerCts;

        try
        {
            for (int sec = 60; sec >= 0; sec--)
            {
                if (cts.Token.IsCancellationRequested) return;
                await _hubContext.Clients.Group(room.RoomCode).SendAsync("TimerUpdate", new { secondsRemaining = sec });
                if (sec == 0) break;
                await Task.Delay(1000, cts.Token);
            }

            if (!cts.Token.IsCancellationRequested)
                await ResolveDayVote(room);
        }
        catch (TaskCanceledException) { }
    }

    // ─── Phase resolution ────────────────────────────────────────────────────

    private async Task ResolveNight(Room room)
    {
        room.Phase = GamePhase.NightReveal;

        var (result, winningFaction) = _nightService.Resolve(room);

        await _hubContext.Clients.Group(room.RoomCode).SendAsync("NightResolved", new
        {
            killedPlayer = result.KilledPlayer == null ? null : new
            {
                result.KilledPlayer.PlayerId,
                result.KilledPlayer.Name
            },
            wasProtected = result.WasProtected
        });

        if (winningFaction != null)
        {
            await Task.Delay(5000);
            await TriggerGameOver(room, winningFaction);
            return;
        }

        await Task.Delay(5000);
        await TransitionToDay(room);
    }

    private async Task TransitionToDay(Room room)
    {
        room.Phase = GamePhase.Day;
        room.RoundNumber++;

        await _hubContext.Clients.Group(room.RoomCode).SendAsync("PhaseChanged", new
        {
            phase = "Day",
            players = room.Players.Select(p => new { p.PlayerId, p.Name, p.IsAlive }),
            round = room.RoundNumber
        });

        _ = StartDayDiscussionTimer(room);
    }

    private async Task ResolveDayVote(Room room)
    {
        if (room.IsDayVoteResolving) return;
        room.IsDayVoteResolving = true;

        var (result, winningFaction) = _dayVoteService.TallyVotes(room);

        await _hubContext.Clients.Group(room.RoomCode).SendAsync("DayVoteResult", new
        {
            eliminatedPlayer = result.EliminatedPlayer == null ? null : new
            {
                result.EliminatedPlayer.PlayerId,
                result.EliminatedPlayer.Name,
                wasTied = false
            },
            wasTied = result.EliminatedPlayer == null
        });

        if (winningFaction != null)
        {
            await Task.Delay(4000);
            room.IsDayVoteResolving = false;
            await TriggerGameOver(room, winningFaction);
            return;
        }

        await Task.Delay(4000);
        room.Phase = GamePhase.Night;

        await _hubContext.Clients.Group(room.RoomCode).SendAsync("PhaseChanged", new
        {
            phase = "Night",
            players = room.Players.Select(p => new { p.PlayerId, p.Name, p.IsAlive }),
            round = room.RoundNumber
        });

        room.IsDayVoteResolving = false;
        _ = StartNightTimer(room);
    }

    private async Task TriggerGameOver(Room room, string winningFaction)
    {
        room.Phase = GamePhase.GameOver;
        room.TimerCts?.Cancel();

        await _hubContext.Clients.Group(room.RoomCode).SendAsync("GameOver", new
        {
            winningFaction,
            allPlayers = room.Players.Select(p => new
            {
                p.PlayerId,
                p.Name,
                role = p.Role.ToString(),
                p.IsAlive
            })
        });

        await _hubContext.Clients.Group(room.RoomCode).SendAsync("PhaseChanged", new
        {
            phase = "GameOver",
            players = room.Players.Select(p => new { p.PlayerId, p.Name, p.IsAlive }),
            round = room.RoundNumber
        });
    }
}
