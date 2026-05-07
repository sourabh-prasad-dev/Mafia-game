namespace MafiaGame.API.Models;

public class Room
{
    public string RoomId { get; set; } = Guid.NewGuid().ToString();
    public string RoomCode { get; set; } = string.Empty;
    public GamePhase Phase { get; set; } = GamePhase.Lobby;
    public int RoundNumber { get; set; } = 0;
    public List<Player> Players { get; set; } = new();
    public List<NightAction> NightActions { get; set; } = new();
    public Dictionary<string, string> DayVotes { get; set; } = new(); // voterId -> targetId
    public string? LastProtectedPlayerId { get; set; }
    public string? LastKilledPlayerId { get; set; }
    public int NightTimeoutSeconds { get; set; } = 60;
    public int DayDiscussionSeconds { get; set; } = 90;
    public bool IsDayVoteResolving { get; set; } = false;
    public CancellationTokenSource? TimerCts { get; set; }
    public DateTime PhaseStartedAt { get; set; } = DateTime.UtcNow;
}
