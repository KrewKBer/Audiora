import React, { useEffect, useMemo, useState } from 'react';

// YouTube player with backend-assisted search for embeddable videos.
// If no API key is configured on the server, it falls back to a search playlist embed.
export default function YouTubePlayer({ query, width = '100%', height = 200, autoplay = false }) {
  const [videoId, setVideoId] = useState(null);
  const [hasApiKey, setHasApiKey] = useState(true);

  useEffect(() => {
    let aborted = false;
    async function run() {
      setVideoId(null);
      try {
        const res = await fetch(`/youtube/search?query=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('search failed');
        const data = await res.json();
        if (!aborted) {
          setHasApiKey(Boolean(data?.hasApiKey !== false));
          if (data?.videoId) setVideoId(data.videoId);
        }
      } catch {
        if (!aborted) setHasApiKey(false);
      }
    }
    if (query) run();
    return () => { aborted = true; };
  }, [query]);

  const src = useMemo(() => {
    if (!query || typeof query !== 'string') return null;
    if (videoId) {
      const params = new URLSearchParams({
        autoplay: autoplay ? '1' : '0',
        modestbranding: '1',
        rel: '0'
      });
      return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
    }
    // Fallback: search playlist embed when server has no key or no video found
    if (!hasApiKey || !videoId) {
      const params = new URLSearchParams({
        listType: 'search',
        list: query,
        autoplay: autoplay ? '1' : '0',
        modestbranding: '1',
        rel: '0'
      });
      return `https://www.youtube.com/embed?${params.toString()}`;
    }
    return null;
  }, [query, videoId, hasApiKey, autoplay]);

  if (!src) return null;

  return (
    <div className="yt-embed" style={{ width: '100%', maxWidth: 560 }}>
      <iframe
        width={typeof width === 'number' ? String(width) : width}
        height={typeof height === 'number' ? String(height) : height}
        src={src}
        title={`YouTube player for ${query}`}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
