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

  async handleInteraction(liked) {
    const { currentSong, userId } = this.state;
    console.log('[handleInteraction] Called with liked:', liked);
    console.log('[handleInteraction] currentSong:', currentSong);
    console.log('[handleInteraction] userId:', userId);
    
    if (!currentSong || !userId) {
      console.log('[handleInteraction] Missing currentSong or userId, returning');
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
    
    console.log('[handleInteraction] Sending POST to /api/user-songs/seen with payload:', payload);

    try {
      const response = await fetch('/api/user-songs/seen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      console.log('[handleInteraction] Response status:', response.status);
      const responseText = await response.text();
      console.log('[handleInteraction] Response body:', responseText);
    } catch (error) {
      console.error('[handleInteraction] Fetch error:', error);
    }

    // Remove saved song from localStorage since we're moving to the next one
    localStorage.removeItem('currentSong');
    this.loadNextSong();
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

  renderCurrentSong() {
    const { currentSong, fetchingRandom } = this.state;
    const { songQueue } = this.props;

    if (!currentSong && songQueue.length === 0) {
      return (
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
    }

    if (!currentSong) {
      return <div className="loading"><span className="spinner"></span>Loading next song...</div>;
    }

    return (
      <div className="song-card">
        {currentSong.album?.images?.[0]?.url && (
          <img src={currentSong.album.images[0].url} alt={currentSong.name} width="200" />
        )}
        <h2 className="song-title">{currentSong.name}</h2>
        <p className="song-artist">Artist: <span>{currentSong.artists?.map(artist => artist.name).join(', ')}</span></p>
        
        <div className="player-controls">
            <button className="btn-action dislike" onClick={() => this.swipeWithAnimation('left')}>✕</button>
            
            {currentSong.preview_url ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <button 
                    className="btn-player"
                    onClick={this.togglePlayPause}
                >
                    {this.state.isPlaying ? '❚❚' : '▶'}
                </button>
                <span style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                    {this.state.isPlaying ? 'Playing Preview' : 'Preview'}
                </span>
                <audio 
                ref={this.audioRef}
                src={currentSong.preview_url}
                onEnded={() => this.setState({ isPlaying: false })}
                onPlay={() => this.setState({ isPlaying: true })}
                onPause={() => this.setState({ isPlaying: false })}
                >
                Your browser does not support the audio element.
                </audio>
            </div>
            ) : (
                <YouTubePlayer
                query={`${currentSong.name} ${currentSong.artists?.map(a => a.name).join(', ') || ''}`}
                autoplay={true}
                muted={false}
                />
            )}

            <button className="btn-action like" onClick={() => this.swipeWithAnimation('right')}>♥</button>
        </div>

        <p style={{ marginTop: '10px', fontSize: '14px', color: '#888' }}>
          {songQueue.length} song{songQueue.length !== 1 ? 's' : ''} remaining in queue
        </p>
      </div>
    );
  }

    swipeWithAnimation(direction) {
        const { songQueue } = this.props;
        const { currentSong } = this.state;
        
        if (!songQueue || songQueue.length === 0 || !currentSong) {
            return;
        }

        if (!this.cardRef.current || !this.contentRef.current) return;

        const isLeft = direction === 'left';
        const distance = isLeft ? -1000 : 1000;
        const rotation = isLeft ? -15 : 15;
        const element = this.contentRef.current;

        element.style.transition = 'none';

        requestAnimationFrame(() => {
            element.style.transform = `translateX(${distance * 0.05}px) rotate(${rotation * 0.2}deg)`;

            requestAnimationFrame(() => {
                element.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

                element.style.transform = `translateX(${distance * 0.3}px) rotate(${rotation * 0.7}deg)`;

                setTimeout(() => {
                    this.cardRef.current.swipe(direction);
                }, 150);
            });
        });
    }



render() {
    const { currentSong } = this.state;
    const { songQueue } = this.props;
    const noMoreSongs = (!currentSong && (!songQueue || songQueue.length === 0));
    let contents = this.state.loading
        ? <div className="loading"><em>Loading...</em></div>
        : this.renderCurrentSong();
        
    /* temporarily removed effects  
    const spotlightStyle = {
        background: `radial-gradient(650px circle at ${mouse.x}px ${mouse.y}px, rgba(14, 165, 233, 0.15), transparent 80%)`,
        transition: 'background 0.2s',
    };

    const cardTransform =
        hoverDir === 'left' ? 'translateX(-20px)' :
            hoverDir === 'right' ? 'translateX(20px)' : 'none';*/

    return (
        <div className="homepage-container">
            {this.state.fetchingRandom && (
                <div className="page-loader-overlay"><div className="page-loader"></div></div>
            )}
            {noMoreSongs ? (
                    <div className="homepage-content spotlight-card no-more-songs-card">
                        <h1 className="homepage-title">Discover New Music</h1>
                        <button className="btn-reset" onClick={this.resetData}>Reset</button>
                        {contents}
                    </div>
                ) : (
            <TinderCard
                ref={this.cardRef}
                key={this.state.currentSong?.id || 'empty'}
                onSwipe={dir => {
                    if (dir === 'right') this.handleLike();
                    if (dir === 'left') this.handleDislike();
                }}
                preventSwipe={['up', 'down']}
                swipeRequirementType='position'
                swipeThreshold={400}
                flickOnSwipe={true}
            >
                <div
                    className="homepage-content spotlight-card"
                    ref={this.contentRef}
                >
                    <h1 className="homepage-title">Discover New Music</h1>
                    <button className="btn-reset" onClick={this.resetData}>Reset</button>
                    {contents}
                </div>
            </TinderCard>
            )}
        </div>
    );
  }
}

export const Home = HomeComponent;
