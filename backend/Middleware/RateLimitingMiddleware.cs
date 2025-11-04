using System.Collections.Concurrent;
using System.Net;

namespace ChordAPI.Middleware;

public class RateLimitingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RateLimitingMiddleware> _logger;
    private static readonly ConcurrentDictionary<string, ClientRequestInfo> _clients = new();
    private readonly int _requestLimit;
    private readonly TimeSpan _timeWindow;

    public RateLimitingMiddleware(
        RequestDelegate next,
        ILogger<RateLimitingMiddleware> logger,
        IConfiguration configuration)
    {
        _next = next;
        _logger = logger;
        
        // Default: 100 requests per minute
        _requestLimit = configuration.GetValue<int>("RateLimiting:RequestLimit", 100);
        _timeWindow = TimeSpan.FromSeconds(configuration.GetValue<int>("RateLimiting:TimeWindowSeconds", 60));
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Skip rate limiting for health checks
        if (context.Request.Path.StartsWithSegments("/health"))
        {
            await _next(context);
            return;
        }

        var clientId = GetClientIdentifier(context);
        var clientInfo = _clients.GetOrAdd(clientId, _ => new ClientRequestInfo());

        await clientInfo.Semaphore.WaitAsync();
        try
        {
            var now = DateTime.UtcNow;
            
            // Remove old requests outside the time window
            clientInfo.RequestTimestamps.RemoveAll(timestamp => now - timestamp > _timeWindow);

            if (clientInfo.RequestTimestamps.Count >= _requestLimit)
            {
                _logger.LogWarning("Rate limit exceeded for client: {ClientId}", clientId);
                
                context.Response.StatusCode = (int)HttpStatusCode.TooManyRequests;
                context.Response.ContentType = "application/json";
                
                var retryAfter = (int)(_timeWindow.TotalSeconds - (now - clientInfo.RequestTimestamps[0]).TotalSeconds);
                context.Response.Headers["Retry-After"] = retryAfter.ToString();
                
                var response = new
                {
                    statusCode = 429,
                    message = "Too many requests. Please try again later.",
                    retryAfter = retryAfter
                };
                
                await context.Response.WriteAsJsonAsync(response);
                return;
            }

            clientInfo.RequestTimestamps.Add(now);
        }
        finally
        {
            clientInfo.Semaphore.Release();
        }

        // Cleanup old clients every 1000 requests
        if (_clients.Count > 1000)
        {
            CleanupOldClients();
        }

        await _next(context);
    }

    private string GetClientIdentifier(HttpContext context)
    {
        // Try to get user ID from claims (authenticated users)
        var userId = context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrEmpty(userId))
        {
            return $"user:{userId}";
        }

        // Fall back to IP address
        var ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return $"ip:{ipAddress}";
    }

    private void CleanupOldClients()
    {
        var now = DateTime.UtcNow;
        var keysToRemove = _clients
            .Where(kvp => kvp.Value.RequestTimestamps.All(ts => now - ts > _timeWindow))
            .Select(kvp => kvp.Key)
            .ToList();

        foreach (var key in keysToRemove)
        {
            _clients.TryRemove(key, out _);
        }
    }
}

public class ClientRequestInfo
{
    public List<DateTime> RequestTimestamps { get; set; } = new();
    public SemaphoreSlim Semaphore { get; set; } = new(1, 1);
}

