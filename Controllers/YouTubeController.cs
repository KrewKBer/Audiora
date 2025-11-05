using Audiora.Services;
using Microsoft.AspNetCore.Mvc;

namespace Audiora.Controllers;

[ApiController]
[Route("youtube")] 
public class YouTubeController : ControllerBase
{
    private readonly YouTubeService _yt;

    public YouTubeController(YouTubeService yt)
    {
        _yt = yt;
    }

    [HttpGet("search")] // /youtube/search?query=...
    public async Task<IActionResult> Search([FromQuery] string query, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(query)) return BadRequest("query required");
        if (!_yt.HasApiKey)
        {
            // No API key configured; signal client to use fallback embed mode
            return Ok(new { videoId = (string?)null, hasApiKey = false });
        }
        var id = await _yt.GetEmbeddableVideoIdAsync(query, ct);
        if (string.IsNullOrWhiteSpace(id)) return NotFound();
        return Ok(new { videoId = id, hasApiKey = true });
    }
}
