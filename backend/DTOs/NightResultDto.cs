namespace MafiaGame.API.DTOs;

public class NightResultDto
{
    public KilledPlayerDto? KilledPlayer { get; set; }
    public bool WasProtected { get; set; }
}

public class KilledPlayerDto
{
    public string PlayerId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}
