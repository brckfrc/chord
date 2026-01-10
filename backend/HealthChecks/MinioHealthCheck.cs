using Microsoft.Extensions.Diagnostics.HealthChecks;
using Minio;
using Minio.DataModel.Args;

namespace ChordAPI.HealthChecks;

/// <summary>
/// Health check for MinIO connection
/// </summary>
public class MinioHealthCheck : IHealthCheck
{
    private readonly IMinioClient _minioClient;
    private readonly string _bucketName;

    public MinioHealthCheck(IMinioClient minioClient, IConfiguration configuration)
    {
        _minioClient = minioClient;
        _bucketName = configuration["Minio:BucketName"] ?? "chord-uploads";
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Test MinIO connection by checking if bucket exists
            var existsArgs = new BucketExistsArgs()
                .WithBucket(_bucketName);

            var bucketExists = await _minioClient.BucketExistsAsync(existsArgs, cancellationToken);

            if (bucketExists)
            {
                return HealthCheckResult.Healthy("MinIO bucket is accessible");
            }

            return HealthCheckResult.Degraded("MinIO bucket does not exist");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("MinIO connection failed", ex);
        }
    }
}
