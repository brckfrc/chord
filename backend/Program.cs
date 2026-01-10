using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using ChordAPI.Data;
using ChordAPI.Services;
using ChordAPI.Middleware;
using ChordAPI.HealthChecks;
using Serilog;
using StackExchange.Redis;
using Minio;
using Microsoft.Extensions.Diagnostics.HealthChecks;

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

    // JWT Authentication for Swagger
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token in the text input below.",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// AutoMapper
builder.Services.AddAutoMapper(typeof(Program));

// Services
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IGuildService, GuildService>();
builder.Services.AddScoped<IInviteService, InviteService>();
builder.Services.AddScoped<IChannelService, ChannelService>();
builder.Services.AddScoped<IMessageService, MessageService>();
builder.Services.AddScoped<IReactionService, ReactionService>();
builder.Services.AddScoped<IReadStateService, ReadStateService>();
builder.Services.AddScoped<IMentionService, MentionService>();
builder.Services.AddScoped<IStorageService, StorageService>();
builder.Services.AddScoped<IImageService, ImageService>();
builder.Services.AddScoped<IVoiceService, VoiceService>();
builder.Services.AddScoped<IPermissionService, PermissionService>();
builder.Services.AddScoped<IRoleService, RoleService>();
builder.Services.AddScoped<IFriendshipService, FriendshipService>();
builder.Services.AddScoped<IDMChannelService, DMChannelService>();
builder.Services.AddScoped<IDirectMessageService, DirectMessageService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();

// LiveKit Configuration
var liveKitApiKey = Environment.GetEnvironmentVariable("LIVEKIT_API_KEY") ?? "devkey";
var liveKitApiSecret = Environment.GetEnvironmentVariable("LIVEKIT_API_SECRET") ?? "secret";
var liveKitUrl = Environment.GetEnvironmentVariable("LIVEKIT_URL") ?? "ws://localhost:7880";
// Public URL for frontend (should be the reverse proxy path, e.g., wss://domain.com/livekit)
var liveKitPublicUrl = Environment.GetEnvironmentVariable("LIVEKIT_PUBLIC_URL") ?? liveKitUrl;

builder.Configuration["LiveKit:ApiKey"] = liveKitApiKey;
builder.Configuration["LiveKit:ApiSecret"] = liveKitApiSecret;
builder.Configuration["LiveKit:Url"] = liveKitUrl;
builder.Configuration["LiveKit:PublicUrl"] = liveKitPublicUrl;

// MinIO Configuration
var minioEndpoint = Environment.GetEnvironmentVariable("MINIO_ENDPOINT") ?? "localhost:9000";
var minioAccessKey = Environment.GetEnvironmentVariable("MINIO_ACCESS_KEY") ?? "minioadmin";
var minioSecretKey = Environment.GetEnvironmentVariable("MINIO_SECRET_KEY") ?? "minioadmin";
var minioUseSsl = Environment.GetEnvironmentVariable("MINIO_USE_SSL")?.ToLower() == "true";

builder.Services.AddMinio(configureClient => configureClient
    .WithEndpoint(minioEndpoint)
    .WithCredentials(minioAccessKey, minioSecretKey)
    .WithSSL(minioUseSsl)
    .Build());

// Add MinIO configuration to IConfiguration for StorageService
builder.Configuration["Minio:BucketName"] = Environment.GetEnvironmentVariable("MINIO_BUCKET_NAME") ?? "chord-uploads";
builder.Configuration["Minio:PublicEndpoint"] = Environment.GetEnvironmentVariable("MINIO_PUBLIC_ENDPOINT") ?? $"http://{minioEndpoint}";

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
    ?? new[] { "http://localhost:3002", "http://localhost:5173" };

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

// JWT Authentication
var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET")
    ?? throw new InvalidOperationException("JWT_SECRET not configured");
var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "ChordAPI";
var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "ChordClient";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };

    // Allow JWT authentication for SignalR
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;

            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }

            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// SignalR with Redis backplane
var redisConnection = Environment.GetEnvironmentVariable("REDIS_CONNECTION") ?? "localhost:6379";
builder.Services.AddSignalR()
    .AddStackExchangeRedis(redisConnection, options =>
    {
        options.Configuration.ChannelPrefix = RedisChannel.Literal("ChordSignalR");
    });

// Health checks
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>("database")
    .AddRedis(redisConnection, name: "redis")
    .AddCheck<MinioHealthCheck>("minio");

var app = builder.Build();

// Auto-apply pending database migrations
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var pendingMigrations = db.Database.GetPendingMigrations().ToList();
    if (pendingMigrations.Any())
    {
        Log.Information("Applying {Count} pending migrations: {Migrations}",
            pendingMigrations.Count, string.Join(", ", pendingMigrations));
        db.Database.Migrate();
        Log.Information("Database migrations applied successfully");
    }
}

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseSerilogRequestLogging();

// CORS must be before rate limiting and authentication
app.UseCors("AllowFrontend");

// Global exception handler
app.UseMiddleware<GlobalExceptionMiddleware>();

// Audit log context
app.UseMiddleware<AuditLogMiddleware>();

// Rate limiting
app.UseMiddleware<RateLimitingMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

// SignalR Hub endpoints
app.MapHub<ChordAPI.Hubs.ChatHub>("/hubs/chat");
app.MapHub<ChordAPI.Hubs.PresenceHub>("/hubs/presence");

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
