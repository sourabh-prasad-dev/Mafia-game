namespace MafiaGame.API.DTOs;

public class PlayerRoleDto
{
    public string Role { get; set; } = string.Empty;
    public List<MafiaTeammateDto>? MafiaTeammates { get; set; }
}

public class MafiaTeammateDto
{
    public string PlayerId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}
