using MafiaGame.API.Models;
using MafiaGame.API.DTOs;

namespace MafiaGame.API.Services;

public class NightResolutionService
{
    private readonly Random _random = new();

    public (NightResultDto result, string? winningFaction) Resolve(Room room)
    {
        var alivePlayers = room.Players.Where(p => p.IsAlive).ToList();
        var actions = room.NightActions;

        // 1. Collect Mafia kill votes
        var mafiaActions = actions
            .Where(a => a.ActionType == ActionType.MafiaKill && a.TargetPlayerId != null)
            .ToList();

        string? mafiaTarget = null;
        if (mafiaActions.Count > 0)
        {
            var voteCounts = mafiaActions
                .GroupBy(a => a.TargetPlayerId!)
                .Select(g => new { TargetId = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .ToList();

            int maxVotes = voteCounts.First().Count;
            var topTargets = voteCounts.Where(v => v.Count == maxVotes).ToList();

            // Tie = no kill, single majority = kill
            if (topTargets.Count == 1)
                mafiaTarget = topTargets[0].TargetId;
        }

        // 2. Doctor protection
        var doctorAction = actions.FirstOrDefault(a => a.ActionType == ActionType.DoctorProtect);
        string? doctorTarget = doctorAction?.TargetPlayerId;

        // 3. Apply kill (if not protected)
        bool wasProtected = false;
        Player? killedPlayer = null;

        if (mafiaTarget != null)
        {
            if (mafiaTarget == doctorTarget)
            {
                wasProtected = true;
            }
            else
            {
                killedPlayer = alivePlayers.FirstOrDefault(p => p.PlayerId == mafiaTarget);
                if (killedPlayer != null)
                {
                    killedPlayer.IsAlive = false;
                    room.LastKilledPlayerId = killedPlayer.PlayerId;
                }
            }
        }

        // 4. Update doctor's last protected
        if (doctorTarget != null)
            room.LastProtectedPlayerId = doctorTarget;

        // 5. Build result DTO
        var result = new NightResultDto
        {
            WasProtected = wasProtected,
            KilledPlayer = killedPlayer != null ? new KilledPlayerDto
            {
                PlayerId = killedPlayer.PlayerId,
                Name = killedPlayer.Name,
                Role = killedPlayer.Role.ToString()
            } : null
        };

        // 6. Clear night actions for next round
        room.NightActions.Clear();
        foreach (var p in room.Players)
            p.HasSubmittedAction = false;

        // 7. Check win conditions
        var winnigFaction = CheckWinCondition(room);

        return (result, winnigFaction);
    }

    private string? CheckWinCondition(Room room)
    {
        var alive = room.Players.Where(p => p.IsAlive).ToList();
        int mafiaAlive = alive.Count(p => p.Role == PlayerRole.Mafia);
        int townAlive = alive.Count(p => p.Role != PlayerRole.Mafia);

        if (mafiaAlive == 0) return "Town";
        if (mafiaAlive >= townAlive) return "Mafia";
        return null;
    }
}
