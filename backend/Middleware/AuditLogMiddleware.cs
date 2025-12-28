namespace ChordAPI.Middleware;

/// <summary>
/// Middleware to capture HTTP context information for audit logging
/// </summary>
public class AuditLogMiddleware
{
    private readonly RequestDelegate _next;

    public AuditLogMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Store IP address and User-Agent in HttpContext.Items for later use
        context.Items["IpAddress"] = context.Connection.RemoteIpAddress?.ToString();
        context.Items["UserAgent"] = context.Request.Headers.UserAgent.ToString();

        await _next(context);
    }
}
