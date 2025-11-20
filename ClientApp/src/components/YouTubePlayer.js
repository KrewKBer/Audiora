import React, { useEffect, useState, useRef } from 'react';

export function YouTubePlayer({ query, autoplay = false, muted = false }) {
  const [videoId, setVideoId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const playerRef = useRef(null);
  const containerRef = useRef(null);

  // 1. Load YouTube IFrame API if not already loaded
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // 2. Fetch Video ID from our backend
  useEffect(() => {
    let aborted = false;
    async function fetchVideoId() {
      setVideoId(null);
      setIsReady(false);
      setError(null);
      try {
        const res = await fetch(`/youtube/search?query=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('search failed');
        const data = await res.json();
        if (!aborted) {
            if (data?.videoId) {
                setVideoId(data.videoId);
            } else {
                setError("No video found");
            }
        }
      } catch (e) {
        console.error("Error fetching video ID:", e);
        if (!aborted) setError("Search error");
      }
    }
    if (query) fetchVideoId();
    return () => { aborted = true; };
  }, [query]);

  // 3. Initialize Player when videoId is available and API is ready
  useEffect(() => {
    if (!videoId || !containerRef.current) return;

    const onPlayerReady = (event) => {
      setIsReady(true);
      if (autoplay) {
        event.target.playVideo();
      }
    };

    const onPlayerStateChange = (event) => {
      if (event.data === window.YT.PlayerState.PLAYING) {
        setIsPlaying(true);
      } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) {
        setIsPlaying(false);
      }
    };

    const initPlayer = () => {
      // If player already exists, destroy it to create a new one or load new video
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        height: '0',
        width: '0',
        videoId: videoId,
        playerVars: {
          'playsinline': 1,
          'controls': 0,
          'autoplay': autoplay ? 1 : 0,
          'mute': muted ? 1 : 0
        },
        events: {
          'onReady': onPlayerReady,
          'onStateChange': onPlayerStateChange
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      // Wait for API to be ready
      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    }

    return () => {
      if (playerRef.current) {
        try {
            playerRef.current.destroy();
        } catch(e) {}
      }
    };
  }, [videoId, autoplay, muted]);

  const togglePlay = () => {
    if (playerRef.current && isReady) {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    }
  };

  if (error) {
    return <div style={{color: '#d32f2f', fontSize: '14px'}}>{error}</div>;
  }

  if (!videoId) {
    return <div style={{color: '#888', fontSize: '14px'}}>Searching...</div>;
  }

  return (
    <div className="yt-player-container">
      {/* The div where the iframe will be mounted */}
      <div ref={containerRef} style={{ display: 'none' }}></div>
      
      <button onClick={togglePlay} disabled={!isReady} className="btn-player" style={{
        background: isReady ? 'linear-gradient(145deg, #1db954, #1aa34a)' : '#333',
        cursor: isReady ? 'pointer' : 'not-allowed',
        boxShadow: isReady ? '0 4px 15px rgba(29, 185, 84, 0.4)' : 'none'
      }}>
        {isPlaying ? '❚❚' : '▶'}
      </button>
      <div style={{marginTop: '8px', fontSize: '12px', color: '#aaa'}}>
        {isReady ? (isPlaying ? 'Playing' : 'Paused') : 'Loading Audio...'}
      </div>
    </div>
  );
}

