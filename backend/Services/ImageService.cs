using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace ChordAPI.Services;

public class ImageService : IImageService
{
    private readonly ILogger<ImageService> _logger;

    private static readonly HashSet<string> SupportedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp"
    };

    public ImageService(ILogger<ImageService> logger)
    {
        _logger = logger;
    }

    public async Task<byte[]> ProcessAvatarAsync(Stream inputStream, int size = 256)
    {
        using var image = await Image.LoadAsync(inputStream);

        // Calculate crop dimensions for center square
        int cropSize = Math.Min(image.Width, image.Height);
        int cropX = (image.Width - cropSize) / 2;
        int cropY = (image.Height - cropSize) / 2;

        // Crop to square and resize
        image.Mutate(x => x
            .Crop(new Rectangle(cropX, cropY, cropSize, cropSize))
            .Resize(size, size));

        // Convert to WebP
        using var outputStream = new MemoryStream();
        await image.SaveAsync(outputStream, new WebpEncoder
        {
            Quality = 85,
            FileFormat = WebpFileFormatType.Lossy
        });

        _logger.LogDebug("Processed image to {Size}x{Size} WebP", size, size);

        return outputStream.ToArray();
    }

    public bool IsValidImageFormat(string contentType)
    {
        return SupportedContentTypes.Contains(contentType);
    }
}



