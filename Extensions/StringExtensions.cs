using System;
using System.Collections.Generic;
using System.Linq;

namespace Audiora.Extensions
{
    public static class StringExtensions
    {
        public static IEnumerable<string> ToSpotifySeedGenres(this IEnumerable<string> genres)
        {
            var mapping = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                { "hip-hop", "hip-hop" },
                { "hip hop", "hip-hop" },
                { "r&b", "r-n-b" },
                { "rnb", "r-n-b" },
                { "k-pop", "k-pop" },
                { "kpop", "k-pop" },
                { "edm", "edm" },
                { "electronic", "electronic" },
                { "classical", "classical" },
                { "jazz", "jazz" },
                { "rock", "rock" },
                { "pop", "pop" },
                { "metal", "metal" },
                { "blues", "blues" },
                { "folk", "folk" },
                { "latin", "latin" },
                { "indie", "indie" },
                { "country", "country" },
                { "reggae", "reggae" },
                { "punk", "punk" }
            };

            var seedGenres = new List<string>();
            foreach (var genre in genres)
            {
                if (mapping.TryGetValue(genre, out var spotifyGenre))
                {
                    seedGenres.Add(spotifyGenre);
                }
            }
            return seedGenres.Distinct();
        }
    }
}
