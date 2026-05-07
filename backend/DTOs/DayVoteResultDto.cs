namespace MafiaGame.API.DTOs;

public class DayVoteResultDto
{
    public EliminatedPlayerDto? EliminatedPlayer { get; set; }
}

public class EliminatedPlayerDto
{
    public string PlayerId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}
