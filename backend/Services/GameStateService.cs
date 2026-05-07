using MafiaGame.API.Models;

namespace MafiaGame.API.Services;

public class GameStateService
{
    public string? GetWinningFaction(Room room)
    {
        var alive = room.Players.Where(p => p.IsAlive).ToList();
        int mafiaAlive = alive.Count(p => p.Role == PlayerRole.Mafia);
        int townAlive = alive.Count(p => p.Role != PlayerRole.Mafia);

        if (mafiaAlive == 0) return "Town";
        if (mafiaAlive >= townAlive) return "Mafia";
        return null;
    }

    public bool AllLivingPlayersSubmitted(Room room)
    {
        return room.Players.Where(p => p.IsAlive).All(p => p.HasSubmittedAction);
    }

    public bool AllLivingPlayersVoted(Room room)
    {
        var alivePlayerIds = room.Players.Where(p => p.IsAlive).Select(p => p.PlayerId).ToHashSet();
        return alivePlayerIds.All(id => room.DayVotes.ContainsKey(id));
    }
}
