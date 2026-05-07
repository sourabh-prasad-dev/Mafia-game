using MafiaGame.API.Models;

namespace MafiaGame.API.Services;

public class RoleAssignmentService
{
    private readonly Random _random = new();

    public void AssignRoles(List<Player> players)
    {
        int n = players.Count;

        // Scale special roles to available players
        int mafiaCount = Math.Max(1, n / 4);
        int remaining = n - mafiaCount;

        // Only add Doctor / Detective if there are enough players left
        int doctorCount = remaining >= 1 ? 1 : 0;
        remaining -= doctorCount;

        int detectiveCount = remaining >= 1 ? 1 : 0;
        remaining -= detectiveCount;

        int citizenCount = remaining; // everyone else

        // Fisher-Yates shuffle
        var shuffled = players.ToList();
        for (int i = shuffled.Count - 1; i > 0; i--)
        {
            int j = _random.Next(0, i + 1);
            (shuffled[i], shuffled[j]) = (shuffled[j], shuffled[i]);
        }

        int idx = 0;
        for (int i = 0; i < mafiaCount; i++)
            shuffled[idx++].Role = PlayerRole.Mafia;
        for (int i = 0; i < doctorCount; i++)
            shuffled[idx++].Role = PlayerRole.Doctor;
        for (int i = 0; i < detectiveCount; i++)
            shuffled[idx++].Role = PlayerRole.Detective;
        for (int i = 0; i < citizenCount; i++)
            shuffled[idx++].Role = PlayerRole.Citizen;
    }
}
