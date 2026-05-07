namespace MafiaGame.API.DTOs;

public class GameOverDto
{
    public string WinningFaction { get; set; } = string.Empty;
    public List<PlayerRoleRevealDto> AllPlayers { get; set; } = new();
}

public class PlayerRoleRevealDto
{
    public string PlayerId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsAlive { get; set; }
}
