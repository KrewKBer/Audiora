import React, { Component, useState, useRef } from 'react';
import { useSongQueue } from './SongQueueContext';
import './Search.css';
import { YouTubePlayer } from './YouTubePlayer';

const TrackItem = ({ track, onAddToQueue }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      // Pause all other audios
      document.querySelectorAll('audio').forEach(el => {
          if(el !== audioRef.current) el.pause();
      });
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="track">
      <img src={track.album?.images?.[0]?.url} alt={track.name} className="track-image" />
      <div className="track-info">
        <div className="track-name">{track.name}</div>
        <div className="track-artist">{(track.artists || []).map(artist => artist.name).join(', ')}</div>
      </div>
      
      <div className="track-actions">
        {track.preview_url ? (
          <div className="preview-player-wrapper">
            <button className={`btn-mini-player ${isPlaying ? 'playing' : ''}`} onClick={togglePlay}>
               {isPlaying ? '❚❚' : '▶'}
            </button>
            <audio 
                ref={audioRef} 
                src={track.preview_url} 
                onEnded={() => setIsPlaying(false)}
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
            />
          </div>
        ) : (
           <div className="preview-player-wrapper">
             <YouTubePlayer query={`${track.name} ${(track.artists || []).map(a => a.name).join(', ')}`} />
           </div>
        )}
        
        <button className="btn-add-queue" onClick={() => onAddToQueue([track])}>
          Add to Queue
        </button>
      </div>
    </div>
  );
};

class SearchInternal extends Component {
  static displayName = SearchInternal.name;

  constructor(props) {
    super(props);
    this.state = {
      searchQuery: '',
      searchResults: [],
      isSearching: false,
      error: null
    };
    this.handleSearchChange = this.handleSearchChange.bind(this);
    this.handleSearch = this.handleSearch.bind(this);
  }

  handleSearchChange(event) {
    this.setState({ searchQuery: event.target.value });
  }

  async handleSearch(event) {
    event.preventDefault();
    this.setState({ isSearching: true, error: null });
    const { searchQuery } = this.state;
    if (!searchQuery) {
      this.setState({ isSearching: false });
      return;
    }

    try {
      const response = await fetch(`/spotify/search?query=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        let message = 'Request failed';
        try {
          const err = await response.json();
          message = err?.message || message;
        } catch (_) {}
        throw new Error(message);
      }
      const data = await response.json();
      const items = Array.isArray(data) ? data : (data.items || []);
      this.setState({ searchResults: items, isSearching: false });
    } catch (error) {
      this.setState({ isSearching: false, error: error.message || 'Unexpected error' });
    }
  }

  renderSearchResults() {
    const { searchResults, isSearching, error } = this.state;

    if (isSearching) {
      return <div className="search-status"><span className="spinner spinner-dark"></span>Searching...</div>;
    }

    if (error) {
      return <div className="search-status error">{error}</div>;
    }

    if (searchResults.length === 0) {
      return null;
    }

    return (
      <div className="search-results">
        {searchResults.map(track => (
          <TrackItem key={track.id} track={track} onAddToQueue={this.props.addSongsToQueue} />
        ))}
      </div>
    );
  }

  render() {
    return (
      <div className="search-container">
        {this.state.isSearching && (
          <div className="page-loader-overlay"><div className="page-loader"></div></div>
        )}
        <h1 className="search-title">Find Your Vibe</h1>
        <form onSubmit={this.handleSearch} className="search-bar">
          <input
            type="text"
            value={this.state.searchQuery}
            onChange={this.handleSearchChange}
            placeholder="Search for songs, artists..."
            className="search-input"
          />
          <button type="submit" disabled={this.state.isSearching} className="search-btn">
            Search
          </button>
        </form>
        {this.renderSearchResults()}
      </div>
    );
  }
}

export const Search = (props) => {
    const { addSongsToQueue } = useSongQueue();
    return <SearchInternal {...props} addSongsToQueue={addSongsToQueue} />;
};
