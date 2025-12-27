namespace ChordAPI.Services;

public interface IImageService
{
    /// <summary>
    /// Process an image: resize and crop to square, convert to WebP.
    /// </summary>
    /// <param name="inputStream">Input image stream</param>
    /// <param name="size">Target size (will be size x size square)</param>
    /// <returns>Processed image as byte array in WebP format</returns>
    Task<byte[]> ProcessAvatarAsync(Stream inputStream, int size = 256);

    /// <summary>
    /// Validates if the file is a supported image format.
    /// </summary>
    bool IsValidImageFormat(string contentType);
}


