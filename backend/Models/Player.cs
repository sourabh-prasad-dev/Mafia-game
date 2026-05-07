namespace MafiaGame.API.Models;

public enum PlayerRole
{
    Mafia,
    Doctor,
    Detective,
    Citizen
}

public class Player
{
    public string PlayerId { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public PlayerRole Role { get; set; }
    public bool IsAlive { get; set; } = true;
    public bool IsHost { get; set; } = false;
    public string ConnectionId { get; set; } = string.Empty;
    public bool HasSubmittedAction { get; set; } = false;
}
