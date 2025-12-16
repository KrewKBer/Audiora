import React, { Component, createRef } from 'react';
import TinderCard from 'react-tinder-card';
import { useSongQueue } from './SongQueueContext';
import { YouTubePlayer } from './YouTubePlayer';

const HomeComponent = (props) => {
    const { songQueue, addSongsToQueue, getNextSong, clearQueue } = useSongQueue();
    return <HomeInternal {...props} songQueue={songQueue} addSongsToQueue={addSongsToQueue} getNextSong={getNextSong} clearQueue={clearQueue} />;
}

class HomeInternal extends Component {
  static displayName = HomeInternal.name;

  constructor(props) {
    super(props);
    this.state = { currentSong: null, loading: false, userId: null, mouse: { x: 0, y: 0 }, fetchingRandom: false, isPlaying: false };
    this.handleLike = this.handleLike.bind(this);
    this.handleDislike = this.handleDislike.bind(this);
    this.resetData = this.resetData.bind(this);
    this.loadNextSong = this.loadNextSong.bind(this);
    this.handleGetRandomSongs = this.handleGetRandomSongs.bind(this);
    this.togglePlayPause = this.togglePlayPause.bind(this);
    this.contentRef = createRef();
    this.audioRef = createRef();
    this.cardRef = createRef();
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.isSwiping = false;
  }

  handleMouseMove(e) {
    if (this.contentRef.current) {
      const rect = this.contentRef.current.getBoundingClientRect();
      this.setState({
        mouse: {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        }
      });
    }
  }

  componentDidMount() {
      const userId = localStorage.getItem('userId');
      if (!userId) {
          window.location.href = '/login';
          return;
      }
      this.setState({ userId });
    
    // Check if there's a saved current song in localStorage
    const savedSongJson = localStorage.getItem('currentSong');
    const { songQueue } = this.props;
    
    // Check if this is a fresh session (browser was reopened)
    const hasActiveSession = sessionStorage.getItem('audioraSession');
    if (!hasActiveSession) {
      // Fresh session - clear any old saved songs
      console.log('New session detected, clearing old saved song');
      localStorage.removeItem('currentSong');
      sessionStorage.setItem('audioraSession', 'active');
      this.loadNextSong();
      return;
    }
    
    // Only restore saved song if there's an active queue OR if queue hasn't loaded yet
    if (savedSongJson) {
      try {
        const savedSong = JSON.parse(savedSongJson);
        // Check if we have a queue - if empty and no saved song needed, clear it
        if (songQueue.length === 0 && !savedSong) {
          console.log('Queue is empty, clearing stale saved song');
          localStorage.removeItem('currentSong');
          this.setState({ currentSong: null });
        } else {
          console.log('Restored song from localStorage:', savedSong);
          this.setState({ currentSong: savedSong });
        }
      } catch (e) {
        console.error('Failed to parse saved song:', e);
        localStorage.removeItem('currentSong');
        this.loadNextSong();
      }
    } else {
      // No saved song, load next from queue
      this.loadNextSong();
    }
  }

  componentDidUpdate(prevProps) {
    // If queue length changed and we don't have a current song, load next
    if (prevProps.songQueue.length !== this.props.songQueue.length && !this.state.currentSong) {
      this.loadNextSong();
    }
  }

  loadNextSong() {
    const nextSong = this.props.getNextSong();
    console.log('Loading next song:', nextSong);
    console.log('Preview URL:', nextSong?.preview_url);
    
    if (nextSong) {
      // Save to localStorage so it persists across tab switches
      localStorage.setItem('currentSong', JSON.stringify(nextSong));
      this.setState({ currentSong: nextSong, isPlaying: false });
    } else {
      // No more songs
      localStorage.removeItem('currentSong');
      this.setState({ currentSong: null, isPlaying: false });
    }
    
    // Stop any playing audio
    if (this.audioRef.current) {
      this.audioRef.current.pause();
      this.audioRef.current.currentTime = 0;
    }
  }

  togglePlayPause() {
    if (!this.audioRef.current) return;
    
    if (this.state.isPlaying) {
      this.audioRef.current.pause();
      this.setState({ isPlaying: false });
    } else {
      this.audioRef.current.play();
      this.setState({ isPlaying: true });
    }
  }

  async handleGetRandomSongs() {
    this.setState({ fetchingRandom: true });
    try {
      const { userId } = this.state;
      const response = await fetch(`/spotify/recommendations?userId=${userId}`);
      const data = await response.json();
      console.log('Raw API response:', data);
      // Extract tracks from the response
      const songs = data.items || data;
      console.log('Extracted songs:', songs);
      console.log('First song preview_url:', songs[0]?.preview_url);
      if (!songs || songs.length === 0) {
        alert('No songs returned. Please try again or check your Spotify credentials in appsettings.json.');
        return;
      }
      this.props.addSongsToQueue(songs);
      if (!this.state.currentSong) {
        this.loadNextSong();
      }
    } catch (error) {
      console.error("Error fetching random songs:", error);
      alert(`Failed to fetch random songs: ${error.message}\n\nPlease make sure you have configured valid Spotify credentials in appsettings.json.`);
    } finally {
      this.setState({ fetchingRandom: false });
    }
  }

  handleInteraction(liked) {
    const { currentSong, userId } = this.state;
    console.log('[handleInteraction] Called with liked:', liked);
    
    if (!currentSong || !userId) {
      return;
    }

    // Extract artist names from Spotify track object
    const artistName = currentSong.artists?.map(a => a.name).join(', ') || 'Unknown Artist';
    
    // Extract album image URL from Spotify track object
    const albumImageUrl = currentSong.album?.images?.[0]?.url || '';

    const payload = {
      userId: userId,
      songId: currentSong.id,
      liked: liked,
      name: currentSong.name || 'Unknown Song',
      artist: artistName,
      albumImageUrl: albumImageUrl
    };
    
    // Update UI immediately - don't wait for server
    localStorage.removeItem('currentSong');
    this.loadNextSong();

    // Send API request in background
    console.log('[handleInteraction] Sending POST to /api/user-songs/seen with payload:', payload);
    fetch('/api/user-songs/seen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(response => {
        if (!response.ok) console.warn('Failed to sync seen song', response.status);
    }).catch(error => {
      console.error('[handleInteraction] Fetch error:', error);
    });
  }

  handleLike() {
    this.handleInteraction(true);
  }

  handleDislike() {
    this.handleInteraction(false);
  }

  async resetData() {
    try {
      const { userId } = this.state;
      // Delete seen songs (includes liked/disliked)
      await fetch(`/api/user-songs/seen?userId=${userId}`, { method: 'DELETE' });
      
      // Clear the song queue
      this.props.clearQueue();
      
      // Reset current song and clear from localStorage
      localStorage.removeItem('currentSong');
      this.setState({ currentSong: null });
      
    } catch (error) {
      console.error('Error resetting data:', error);
      alert('Failed to reset data. Please try again.');
    }
  }

  renderSongCard(song, isActive) {
    const { songQueue } = this.props;

    if (!song) {
      return <div className="loading"><span className="spinner"></span>Loading next song...</div>;
    }

    return (
      <div className="song-card">
        {song.album?.images?.[0]?.url && (
          <img src={song.album.images[0].url} alt={song.name} width="200" />
        )}
        <h2 className="song-title">{song.name}</h2>
        <p className="song-artist">Artist: <span>{song.artists?.map(artist => artist.name).join(', ')}</span></p>
        
        <div className="player-controls">
            <button className="btn-action dislike" onClick={() => isActive && this.swipeWithAnimation('left')}>✕</button>
            
            {song.preview_url ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <button 
                    className="btn-player"
                    onClick={isActive ? this.togglePlayPause : undefined}
                    disabled={!isActive}
                >
                    {isActive && this.state.isPlaying ? '❚❚' : '▶'}
                </button>
                <span style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                    {isActive && this.state.isPlaying ? 'Playing Preview' : 'Preview'}
                </span>
                <audio 
                ref={isActive ? this.audioRef : null}
                src={song.preview_url}
                onEnded={() => isActive && this.setState({ isPlaying: false })}
                onPlay={() => isActive && this.setState({ isPlaying: true })}
                onPause={() => isActive && this.setState({ isPlaying: false })}
                >
                Your browser does not support the audio element.
                </audio>
            </div>
            ) : (
                isActive ? (
                <YouTubePlayer
                query={`${song.name} ${song.artists?.map(a => a.name).join(', ') || ''}`}
                autoplay={true}
                muted={false}
                />
                ) : (
                    <div className="youtube-placeholder">
                        <p>Video will play when card is active</p>
                    </div>
                )
            )}

            <button className="btn-action like" onClick={() => isActive && this.swipeWithAnimation('right')}>♥</button>
        </div>

        <p style={{ marginTop: '10px', fontSize: '14px', color: '#888' }}>
          {songQueue.length} song{songQueue.length !== 1 ? 's' : ''} remaining in queue
        </p>
      </div>
    );
  }

    swipeWithAnimation(direction) {
        if (this.isSwiping) return;

        const { songQueue } = this.props;
        const { currentSong } = this.state;
        
        if (!songQueue || songQueue.length === 0 || !currentSong) {
            return;
        }

        if (!this.cardRef.current) return;

        this.isSwiping = true;
        
        // Immediately trigger like/dislike and load next song
        if (direction === 'right') this.handleLike();
        if (direction === 'left') this.handleDislike();
        
        // The card ref swipe triggers the animation (which runs while new card is already showing)
        this.cardRef.current.swipe(direction);
        this.isSwiping = false;
    }



render() {
    const { currentSong, fetchingRandom } = this.state;
    const { songQueue } = this.props;
    const noMoreSongs = (!currentSong && (!songQueue || songQueue.length === 0));
    
    // Determine content for the current card
    let currentCardContent = null;
    if (this.state.loading) {
        currentCardContent = <div className="loading"><em>Loading...</em></div>;
    } else if (noMoreSongs) {
        currentCardContent = (
            <div>
              <p className="no-songs" color="white">No songs in queue. Add songs from the Search page or get random recommendations!</p>
              <button 
                className="btn-random" 
                onClick={this.handleGetRandomSongs}
                disabled={fetchingRandom}
              >
                {fetchingRandom ? (<><span className="spinner spinner-sm"></span>Loading...</>) : 'Get 25 Random Songs'}
              </button>
            </div>
        );
    } else {
        currentCardContent = this.renderSongCard(currentSong, true);
    }

    // Determine content for the background card (next song)
    let nextCardContent = null;
    if (songQueue && songQueue.length > 0) {
        nextCardContent = this.renderSongCard(songQueue[0], false);
    }

    return (
        <div className="homepage-container" style={{ position: 'relative' }}>
            {this.state.fetchingRandom && (
                <div className="page-loader-overlay"><div className="page-loader"></div></div>
            )}
            
            {/* Background Card (Next Song) */}
            {!noMoreSongs && nextCardContent && (
                <div 
                    className="homepage-content spotlight-card" 
                    style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        right: 0,
                        margin: 'auto',
                        zIndex: 0,
                        transform: 'scale(0.95) translateY(10px)',
                        opacity: 0.7,
                        pointerEvents: 'none'
                    }}
                >
                    <h1 className="homepage-title">Discover New Music</h1>
                    <button className="btn-reset" disabled>Reset</button>
                    {nextCardContent}
                </div>
            )}

            {/* Foreground Card (Current Song) */}
            {noMoreSongs ? (
                    <div className="homepage-content spotlight-card no-more-songs-card" style={{ position: 'relative', zIndex: 1 }}>
                        <h1 className="homepage-title">Discover New Music</h1>
                        <button className="btn-reset" onClick={this.resetData}>Reset</button>
                        {currentCardContent}
                    </div>
                ) : (
            <TinderCard
                ref={this.cardRef}
                key={this.state.currentSong?.id || 'empty'}
                onSwipe={dir => {
                    // Trigger like/dislike immediately when swipe direction is decided
                    if (dir === 'right') this.handleLike();
                    if (dir === 'left') this.handleDislike();
                }}
                onCardLeftScreen={() => {
                    // Animation complete, reset swiping flag
                    this.isSwiping = false;
                }}
                preventSwipe={['up', 'down']}
                swipeRequirementType='velocity'
                swipeThreshold={200}
                flickOnSwipe={true}
                className="tinder-card-wrapper"
            >
                <div
                    className="homepage-content spotlight-card"
                    ref={this.contentRef}
                >
                    <h1 className="homepage-title">Discover New Music</h1>
                    <button className="btn-reset" onClick={this.resetData}>Reset</button>
                    {currentCardContent}
                </div>
            </TinderCard>
            )}
        </div>
    );
  }
}

export const Home = HomeComponent;
