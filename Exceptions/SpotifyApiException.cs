namespace Audiora.Exceptions;

public class SpotifyApiException : Exception
{
    public SpotifyApiException(string message, Exception inner)
        : base(message, inner)
    {
    }
}
