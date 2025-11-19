import React, { useEffect, useMemo, useState, useRef } from 'react';
import YouTube from 'react-youtube';

export default function YouTubePlayer({ query, autoplay = false, muted = false }) {
  const [videoId, setVideoId] = useState(null);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [isReady, setIsReady] = useState(false);
  const playerRef = useRef(null);

  useEffect(() => {
    let aborted = false;
    async function run() {
      setVideoId(null);
      setIsReady(false);
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

  const onReady = (event) => {
    playerRef.current = event.target;
    setIsReady(true);
    if (autoplay) {
      playerRef.current.playVideo();
    }
  };

  const onStateChange = (event) => {
    if (event.data === window.YT.PlayerState.PLAYING) {
      setIsPlaying(true);
    } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) {
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (playerRef.current && isReady) {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    }
  };

  const fallbackSrc = useMemo(() => {
    if (!query || typeof query !== 'string' || videoId) return null;
    if (!hasApiKey) {
      const params = new URLSearchParams({
        listType: 'search',
        list: query,
        autoplay: autoplay ? '1' : '0',
        mute: muted ? '1' : '0',
        playsinline: '1',
        modestbranding: '1',
        rel: '0'
      });
      return `https://www.youtube.com/embed?${params.toString()}`;
    }
    return null;
  }, [query, videoId, hasApiKey, autoplay, muted]);

  const opts = {
    height: '0', // Hide player
    width: '0', // Hide player
    playerVars: {
      autoplay: autoplay ? 1 : 0,
      controls: 0,
      modestbranding: 1,
      playsinline: 1,
      rel: 0,
      mute: muted ? 1 : 0,
    },
  };

  if (!videoId && !fallbackSrc) {
    return <div style={{color: '#888', fontSize: '14px'}}>Loading player...</div>;
  }

  return (
    <div className="yt-player-container" style={{ width: '100%', textAlign: 'center' }}>
      {videoId ? (
        <>
          <div style={{ display: 'none' }}>
            <YouTube
              videoId={videoId}
              opts={opts}
              onReady={onReady}
              onStateChange={onStateChange}
            />
          </div>
          <button onClick={togglePlay} disabled={!isReady} style={{
            fontSize: '24px',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: '2px solid #1DB954',
            background: isReady ? '#1DB954' : '#555',
            color: 'white',
            cursor: isReady ? 'pointer' : 'not-allowed',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {isPlaying ? '❚❚' : '▶'}
          </button>
        </>
      ) : (
        // Fallback to simple iframe if no API key/video ID
        <iframe
          width="100%"
          height="70"
          src={fallbackSrc}
          title={`YouTube player for ${query}`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      )}
    </div>
  );
}

