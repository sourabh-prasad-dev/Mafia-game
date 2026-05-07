using MafiaGame.API.Models;
using MafiaGame.API.DTOs;

namespace MafiaGame.API.Services;

public class DayVoteService
{
    public (DayVoteResultDto result, string? winningFaction) TallyVotes(Room room)
    {
        var votes = room.DayVotes; // voterId -> targetId
        if (votes.Count == 0)
        {
            room.DayVotes.Clear();
            return (new DayVoteResultDto { EliminatedPlayer = null }, CheckWinCondition(room));
        }

        // Tally
        var tally = votes
            .GroupBy(kv => kv.Value)
            .Select(g => new { TargetId = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .ToList();

        int maxVotes = tally.First().Count;
        var topTargets = tally.Where(t => t.Count == maxVotes).ToList();

        // Tie = no elimination
        EliminatedPlayerDto? eliminated = null;
        if (topTargets.Count == 1)
        {
            var targetId = topTargets[0].TargetId;
            var player = room.Players.FirstOrDefault(p => p.PlayerId == targetId && p.IsAlive);
            if (player != null)
            {
                player.IsAlive = false;
                eliminated = new EliminatedPlayerDto
                {
                    PlayerId = player.PlayerId,
                    Name = player.Name,
                    Role = player.Role.ToString()
                };
            }
        }

        room.DayVotes.Clear();
        foreach (var p in room.Players)
            p.HasSubmittedAction = false;

        var winningFaction = CheckWinCondition(room);

        return (new DayVoteResultDto { EliminatedPlayer = eliminated }, winningFaction);
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
