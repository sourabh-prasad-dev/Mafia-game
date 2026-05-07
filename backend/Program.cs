using MafiaGame.API.Hubs;
using MafiaGame.API.Services;

var builder = WebApplication.CreateBuilder(args);

// Railway (and most cloud hosts) inject a PORT env variable — honour it
var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
builder.WebHost.UseUrls($"http://+:{port}");

// Add services
builder.Services.AddControllers();
builder.Services.AddSignalR();

// Swagger / OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Mafia Game API", Version = "v1" });
});
builder.Services.AddSingleton<RoomService>();
builder.Services.AddSingleton<RoleAssignmentService>();
builder.Services.AddSingleton<NightResolutionService>();
builder.Services.AddSingleton<DayVoteService>();
builder.Services.AddSingleton<GameStateService>();

// CORS — read allowed frontend URL from env (set this in Railway dashboard)
var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL");

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var origins = new List<string>
        {
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://10.92.21.147:5173",
        };

        // Add the deployed Vercel frontend URL when running in production
        if (!string.IsNullOrEmpty(frontendUrl))
            origins.Add(frontendUrl);

        policy
            .WithOrigins(origins.ToArray())
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials(); // Required for SignalR
    });
});

var app = builder.Build();

// Swagger UI (Development only)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Mafia Game API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseCors();
app.UseRouting();

app.MapControllers();
app.MapHub<GameHub>("/hubs/game");

app.Run();
