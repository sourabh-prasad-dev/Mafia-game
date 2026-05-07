namespace MafiaGame.API.Models;

public enum ActionType
{
    MafiaKill,
    DoctorProtect,
    DetectiveInvestigate,
    CitizenSkip
}

public class NightAction
{
    public string PlayerId { get; set; } = string.Empty;
    public ActionType ActionType { get; set; }
    public string? TargetPlayerId { get; set; }
}
