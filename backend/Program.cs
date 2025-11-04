using Microsoft.EntityFrameworkCore;
using ChordAPI.Data;
using Serilog;

// Load .env file
DotNetEnv.Env.Load();

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("Logs/chord-.log", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new() { Title = "Chord API", Version = "v1" });
});

// Database - Build connection string from environment variables
var sqlPassword = Environment.GetEnvironmentVariable("SQL_SA_PASSWORD") ?? throw new InvalidOperationException("SQL_SA_PASSWORD not found in environment");
var sqlHost = Environment.GetEnvironmentVariable("SQL_SERVER_HOST") ?? "localhost";
var sqlPort = Environment.GetEnvironmentVariable("SQL_SERVER_PORT") ?? "1433";
var dbName = Environment.GetEnvironmentVariable("DATABASE_NAME") ?? "ChordDB";

var connectionString = $"Server={sqlHost},{sqlPort};Database={dbName};User Id=sa;Password={sqlPassword};TrustServerCertificate=True;MultipleActiveResultSets=true;";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

// CORS - Read allowed origins from environment
var corsOrigins = Environment.GetEnvironmentVariable("CORS_ORIGINS")?.Split(',')
    ?? new[] { "http://localhost:3000", "http://localhost:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(corsOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// Health checks
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>("database");

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseSerilogRequestLogging();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

// Simple test endpoint
app.MapGet("/", () => new
{
    name = "Chord API",
    version = "1.0.0",
    status = "running",
    timestamp = DateTime.UtcNow
})
.WithName("Root")
.WithOpenApi();

try
{
    Log.Information("Starting Chord API...");
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
