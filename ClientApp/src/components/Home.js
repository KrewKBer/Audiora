import React, { Component, createRef } from 'react';
import TinderCard from 'react-tinder-card';
import { useSongQueue } from './SongQueueContext';

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
    // hardcoded userId for simplicity
    const userId = localStorage.getItem('userId') || "test-user";
    localStorage.setItem('userId', userId);
    this.setState({ userId }, this.loadNextSong);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.songQueue.length !== this.props.songQueue.length && !this.state.currentSong) {
      this.loadNextSong();
    }
  }

  loadNextSong() {
    const nextSong = this.props.getNextSong();
    console.log('Loading next song:', nextSong);
    console.log('Preview URL:', nextSong?.preview_url);
    this.setState({ currentSong: nextSong, isPlaying: false });
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
      // Check if credentials are stored in localStorage
      const clientId = localStorage.getItem('spotifyClientId');
      const clientSecret = localStorage.getItem('spotifyClientSecret');
      
      if (!clientId || !clientSecret) {
        alert('Please configure Spotify credentials in the Search page first.');
        this.setState({ fetchingRandom: false });
        return;
      }

      // Configure credentials on backend
      await fetch('/spotify/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientSecret })
      });

      // Now fetch recommendations
      const response = await fetch('/spotify/recommendations?genre=pop');
      if (!response.ok) {
        let errorMessage = `Failed to fetch random songs: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        console.error('Error response:', errorMessage);
        throw new Error(errorMessage);
      }
      const data = await response.json();
      console.log('Raw API response:', data);
      
      // Extract tracks from the response
      const songs = data.items || data;
      console.log('Extracted songs:', songs);
      console.log('First song preview_url:', songs[0]?.preview_url);
      
      if (!songs || songs.length === 0) {
        alert('No songs returned. Please try again or check your Spotify credentials.');
        return;
      }
      
      this.props.addSongsToQueue(songs);
      if (!this.state.currentSong) {
        this.loadNextSong();
      }
    } catch (error) {
      console.error("Error fetching random songs:", error);
      alert(`Failed to fetch random songs: ${error.message}\n\nPlease make sure you have configured valid Spotify credentials in the Search page.`);
    } finally {
      this.setState({ fetchingRandom: false });
    }
  }

  async handleInteraction(liked) {
    const { currentSong, userId } = this.state;
    if (!currentSong || !userId) return;

    const seenSong = { 
      id: currentSong.id, 
      liked: liked,
      name: currentSong.name,
      artist: currentSong.artists?.map(a => a.name).join(', ') || 'Unknown',
      albumImageUrl: currentSong.album?.images?.[0]?.url || ''
    };

    await fetch('api/user-songs/seen', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: userId, song: seenSong }),
    });

    this.loadNextSong();
  }

  handleLike() {
    this.handleInteraction(true);
  }

  handleDislike() {
    this.handleInteraction(false);
  }

  async resetData() {
    const { userId } = this.state;
    if (!userId) return;

    if (!window.confirm('Are you sure you want to reset everything? This will clear the queue and delete all liked/disliked songs.')) {
      return;
    }

    try {
      // Delete seen songs (includes liked/disliked)
      await fetch(`api/user-songs/seen?userId=${userId}`, { method: 'DELETE' });
      
      // Clear the song queue
      this.props.clearQueue();
      
      // Reset current song
      this.setState({ currentSong: null });
      
      alert('Successfully reset! Queue cleared and all song data deleted.');
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
          <p className="no-songs">No songs in queue. Add songs from the Search page or get random recommendations!</p>
          <button 
            className="btn-random" 
            onClick={this.handleGetRandomSongs}
            disabled={fetchingRandom}
          >
            {fetchingRandom ? 'Loading...' : 'Get 25 Random Songs'}
          </button>
        </div>
      );
    }

    if (!currentSong) {
      return <p className="no-songs">Loading next song...</p>;
    }

    return (
      <div className="song-card">
        {currentSong.album?.images?.[0]?.url && (
          <img src={currentSong.album.images[0].url} alt={currentSong.name} width="200" />
        )}
        <h2 className="song-title">{currentSong.name}</h2>
        <p className="song-artist">Artist: <span>{currentSong.artists?.map(artist => artist.name).join(', ')}</span></p>
        {currentSong.preview_url ? (
          <div style={{ marginTop: '15px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <button 
                onClick={this.togglePlayPause}
                style={{
                  fontSize: '24px',
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  border: '2px solid #1DB954',
                  background: '#1DB954',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {this.state.isPlaying ? '⏸️' : '▶️'}
              </button>
              <span style={{ fontSize: '14px', color: '#888' }}>
                {this.state.isPlaying ? 'Playing 30s preview...' : 'Click to play preview'}
              </span>
            </div>
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
          <p style={{ fontSize: '12px', color: '#888', marginTop: '10px', padding: '10px', background: '#f5f5f5', borderRadius: '5px' }}>
            ℹ️ Audio preview not available for this song (regional restriction)
          </p>
        )}
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
            <div className="homepage-actions">
                <button
                    className="btn-dislike"
                    onClick={() => this.swipeWithAnimation('left')}
                >Dislike</button>
                <button
                    className="btn-like"
                    onClick={() => this.swipeWithAnimation('right')}
                >Like</button>
            </div>
        </div>
    );
  }
}

export const Home = HomeComponent;
