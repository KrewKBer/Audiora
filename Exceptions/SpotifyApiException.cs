namespace Audiora.Exceptions;

public class SpotifyApiException : Exception
{
    public SpotifyApiException()
    {
    }

    public SpotifyApiException(string message)
        : base(message)
    {
    }

    public SpotifyApiException(string message, Exception inner)
        : base(message, inner)
    {
    }
}
