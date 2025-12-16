import React, { Component, createRef } from 'react';
import TinderCard from 'react-tinder-card';
import { useSongQueue } from './SongQueueContext';
import { MusicBars } from './MusicBars';

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
    this.togglePlay = this.togglePlay.bind(this);
    this.contentRef = createRef();
    this.cardRef = createRef();
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.isSwiping = false;
    this.embedController = null;
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

    // Initialize Spotify IFrame API after a short delay to ensure DOM is ready
    setTimeout(() => this.initSpotifyEmbed(), 100);
  }

  initSpotifyEmbed() {
    if (window.IFrameAPI) {
      // API already loaded
      this.createSpotifyController();
      return;
    }

    if (!window.SpotifyIframeApiLoaded) {
      window.SpotifyIframeApiLoaded = true;
      const script = document.createElement('script');
      script.src = "https://open.spotify.com/embed-podcast/iframe-api/v1";
      script.async = true;
      document.body.appendChild(script);
    }

    window.onSpotifyIframeApiReady = (IFrameAPI) => {
      window.IFrameAPI = IFrameAPI;
      this.createSpotifyController();
    };
  }

  createSpotifyController() {
    const element = document.getElementById('spotify-embed-hidden');
    if (!element) {
      console.error('Spotify embed element not found');
      return;
    }

    if (!window.IFrameAPI) {
      console.error('Spotify IFrame API not loaded');
      return;
    }

    const options = {
        uri: this.state.currentSong ? `spotify:track:${this.state.currentSong.id}` : 'spotify:track:3n3Ppam7vgaVa1iaRUc9Lp',
        width: '100%',
        height: '80px'
    };
    
    const callback = (EmbedController) => {
        this.embedController = EmbedController;
        console.log('Spotify Embed Controller initialized');
        
        EmbedController.addListener('playback_update', e => {
            this.setState({ isPlaying: !e.data.isPaused });
        });

        // Auto-play if we have a current song
        if (this.state.currentSong) {
             EmbedController.loadUri(`spotify:track:${this.state.currentSong.id}`);
             EmbedController.play();
        }
    };
    
    window.IFrameAPI.createController(element, options, callback);
  }

  componentDidUpdate(prevProps, prevState) {
    // If queue length changed and we don't have a current song, load next
    if (prevProps.songQueue.length !== this.props.songQueue.length && !this.state.currentSong) {
      this.loadNextSong();
    }

    // If song changed, update embed
    if (this.state.currentSong && this.state.currentSong !== prevState.currentSong) {
        if (this.embedController) {
            this.embedController.loadUri(`spotify:track:${this.state.currentSong.id}`);
            this.embedController.play();
        }
    }
  }

  togglePlay() {
    if (this.embedController) {
        console.log('Toggling play/pause');
        this.embedController.togglePlay();
    } else {
        console.error('Embed controller not initialized yet');
        // Try to reinitialize
        this.initSpotifyEmbed();
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

    // Optimistically update XP locally for UI feedback
    // 1 XP for seen, +2 if liked = 3 total
    const xpGain = liked ? 3 : 1;
    window.dispatchEvent(new CustomEvent('xpUpdate', { detail: { amount: xpGain } }));

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

    // Fallback for album art
    const albumArt = song.album && song.album.images && song.album.images.length > 0 
        ? song.album.images[0].url 
        : 'https://via.placeholder.com/200';

    const artistName = song.artists && song.artists.length > 0 ? song.artists[0].name : 'Unknown Artist';

    return (
      <div className="song-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', paddingTop: '10px' }}>
        
        {/* Custom Player UI */}
        <div className="custom-player" style={{ marginBottom: '25px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
            <img 
                src={albumArt} 
                alt={song.name} 
                style={{ width: '250px', height: '250px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', objectFit: 'cover' }} 
            />
            <h3 style={{ margin: '0 0 5px 0', fontSize: '20px', textAlign: 'center', fontWeight: '600' }}>{song.name}</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '15px', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>{artistName}</p>
            
            <button 
                onClick={(e) => { e.stopPropagation(); this.togglePlay(); }}
                className={this.state.isPlaying ? 'btn-play-pulse' : ''}
                style={{ 
                    width: '64px', 
                    height: '64px', 
                    borderRadius: '50%', 
                    border: 'none', 
                    background: '#1DB954', 
                    color: 'white', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(29, 185, 84, 0.4)',
                    transition: 'transform 0.2s ease'
                }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
                {this.state.isPlaying ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: '4px' }}>
                    <path d="M5 3L19 12L5 21V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
            </button>

            {this.state.isPlaying && (
              <div className="now-playing-text">
                <div className="playing-indicator-bar"></div>
                <div className="playing-indicator-bar"></div>
                <div className="playing-indicator-bar"></div>
                <span>Track is now playing</span>
              </div>
            )}
        </div>
        
        {/* Action Buttons */}
        <div className="action-btn-group">
            <button className="btn-action-round btn-dislike-round" onClick={() => isActive && this.swipeWithAnimation('left')}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button className="btn-action-round btn-like-round" onClick={() => isActive && this.swipeWithAnimation('right')}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" stroke="none">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </button>
        </div>

        <p style={{ marginTop: 'auto', marginBottom: '10px', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
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
            {/* Hidden Spotify Embed Container - Always present for API */}
            <div style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', opacity: 0, pointerEvents: 'none', zIndex: -9999 }}>
                <div id="spotify-embed-hidden" style={{ width: '300px', height: '80px' }}></div>
            </div>

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
                    <MusicBars />
                    <h1 className="homepage-title">Discover New Music</h1>
                    <button className="btn-reset-icon" disabled>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                    {nextCardContent}
                </div>
            )}

            {/* Foreground Card (Current Song) */}
            {noMoreSongs ? (
                    <div className="homepage-content spotlight-card no-more-songs-card" style={{ position: 'relative', zIndex: 1 }}>
                        <MusicBars />
                        <h1 className="homepage-title">Discover New Music</h1>
                        <button className="btn-reset-icon" onClick={this.resetData} title="Reset Data">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
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
                    <MusicBars />
                    <h1 className="homepage-title">Discover New Music</h1>
                    <button className="btn-reset-icon" onClick={this.resetData} title="Reset Data">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                    {currentCardContent}
                </div>
            </TinderCard>
            )}
        </div>
    );
  }
}

export const Home = HomeComponent;
