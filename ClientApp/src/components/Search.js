import React, { Component } from 'react';
import { useSongQueue } from './SongQueueContext';
import './Search.css';
import YouTubePlayer from './YouTubePlayer';

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
      return <p><span className="spinner spinner-dark"></span>Searching...</p>;
    }

    if (error) {
      return <p className="search-error">{error}</p>;
    }

    if (searchResults.length === 0) {
      return <p>No results found.</p>;
    }

    return (
      <div className="search-results">
        {searchResults.map(track => (
          <div key={track.id} className="track">
            <img src={track.album?.images?.[0]?.url} alt={track.name} width="50" />
            <div className="track-info">
              <strong>{track.name}</strong>
              <span>{(track.artists || []).map(artist => artist.name).join(', ')}</span>
            </div>
            <button onClick={() => this.props.addSongsToQueue([track])}>Add to Queue</button>
            {track.preview_url ? (
              <audio controls src={track.preview_url} />
            ) : (
              <div style={{ marginTop: 8, width: '100%' }}>
                <YouTubePlayer
                  query={`${track.name} ${(track.artists || []).map(a => a.name).join(', ')}`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  render() {
    return (
      <div className="search-content">
        {this.state.isSearching && (
          <div className="page-loader-overlay"><div className="page-loader"></div></div>
        )}
        <h1>Song Search</h1>
        <form onSubmit={this.handleSearch} className="search-bar">
          <input
            type="text"
            value={this.state.searchQuery}
            onChange={this.handleSearchChange}
            placeholder="Search for a song..."
          />
          <button type="submit" disabled={this.state.isSearching}>Search</button>
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
