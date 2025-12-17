import React, { Component } from 'react';
import { useSongQueue } from './SongQueueContext';
import './Search.css';

class SearchInternal extends Component {
  static displayName = SearchInternal.name;

  constructor(props) {
    super(props);
    const savedClientId = localStorage.getItem('spotifyClientId') || '';
    const savedClientSecret = localStorage.getItem('spotifyClientSecret') || '';
    this.state = {
      searchQuery: '',
      searchResults: [],
      isSearching: false,
      error: null,
      clientId: savedClientId,
      clientSecret: savedClientSecret,
      isConfiguring: false,
      configured: !!(savedClientId && savedClientSecret)
    };
    this.handleSearchChange = this.handleSearchChange.bind(this);
    this.handleSearch = this.handleSearch.bind(this);
    this.handleCredsChange = this.handleCredsChange.bind(this);
    this.handleConfigure = this.handleConfigure.bind(this);
  }

  handleSearchChange(event) {
    this.setState({ searchQuery: event.target.value });
  }

  handleCredsChange(event) {
    const { name, value } = event.target;
    this.setState({ [name]: value });
  }

  async handleConfigure(event) {
    event.preventDefault();
    const { clientId, clientSecret } = this.state;
    if (!clientId || !clientSecret) {
      this.setState({ error: 'Both Client ID and Client Secret are required.' });
      return;
    }

    this.setState({ isConfiguring: true, error: null });
    try {
      const res = await fetch('/spotify/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientSecret })
      });
      if (!res.ok) {
        let message = 'Failed to configure credentials';
        try {
          const err = await res.json();
          message = err?.message || message;
        } catch (_) {}
        throw new Error(message);
      }
      localStorage.setItem('spotifyClientId', clientId);
      localStorage.setItem('spotifyClientSecret', clientSecret);
      this.setState({ configured: true });
    } catch (e) {
      this.setState({ error: e.message || 'Configuration failed' });
    } finally {
      this.setState({ isConfiguring: false });
    }
  }

  async handleSearch(event) {
    event.preventDefault();
    this.setState({ isSearching: true, error: null });
    const { searchQuery, configured } = this.state;
    if (!configured) {
      this.setState({ isSearching: false, error: 'Please configure Spotify credentials first.' });
      return;
    }
    if (!searchQuery) {
      this.setState({ isSearching: false });
      return;
    }

    try {
      const response = await fetch(`/spotify/search?query=\${encodeURIComponent(searchQuery)}`);
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
      return <div className="search-status"><em>Searching...</em></div>;
    }

    if (error) {
      return <div className="search-status error">{error}</div>;
    }

    if (searchResults.length === 0) {
      return <div className="search-status">No results found.</div>;
    }

    return (
      <div className="search-results">
        {searchResults.map(track => (
          <div key={track.id} className="track">
            <img className="track-image" src={track.album?.images?.[0]?.url} alt={track.name} />
            <div className="track-info">
              <div className="track-name">{track.name}</div>
              <div className="track-artist">{(track.artists || []).map(artist => artist.name).join(', ')}</div>
            </div>
            <div className="track-actions">
                {track.preview_url && (
                    <div className="preview-player-wrapper">
                        <audio controls src={track.preview_url} style={{ height: '30px', maxWidth: '200px' }}></audio>
                    </div>
                )}
                <button className="btn-add-queue" onClick={() => this.props.addSongsToQueue([track])}>Add to Queue</button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  render() {
    const { clientId, clientSecret, isConfiguring, configured } = this.state;
    return (
      <div className="search-container">
        <h1 className="search-title">Song Search</h1>

        <form onSubmit={this.handleConfigure} className="search-credentials">
          <h3 className="credentials-title">Spotify Credentials</h3>
          <div className="credentials-form">
            <input
              className="search-input-creds"
              type="text"
              name="clientId"
              value={clientId}
              onChange={this.handleCredsChange}
              placeholder="Client ID"
            />
            <input
              className="search-input-creds"
              type="password"
              name="clientSecret"
              value={clientSecret}
              onChange={this.handleCredsChange}
              placeholder="Client Secret"
            />
            <button className="btn-creds" type="submit" disabled={isConfiguring}>{configured ? 'Update' : 'Save'}</button>
            {configured && <span className="creds-status">Configured</span>}
          </div>
        </form>

        <form onSubmit={this.handleSearch} className="search-bar">
          <input
            className="search-input"
            type="text"
            value={this.state.searchQuery}
            onChange={this.handleSearchChange}
            placeholder="Search for a song..."
          />
          <button className="search-btn" type="submit" disabled={this.state.isSearching}>Search</button>
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
