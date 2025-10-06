import React, { Component } from 'react';
import './Search.css';

export class Search extends Component {
  static displayName = Search.name;

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
      // Persist locally for convenience
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
      const response = await fetch(`/spotify/search?query=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        let message = 'Request failed';
        try {
          const err = await response.json();
          message = err?.message || message;
        } catch (_) { /* ignore */ }
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
      return <p><em>Searching...</em></p>;
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
            {track.preview_url && <audio controls src={track.preview_url}></audio>}
          </div>
        ))}
      </div>
    );
  }

  render() {
    const { clientId, clientSecret, isConfiguring, configured } = this.state;
    return (
      <div className="search-content">
        <h1>Song Search</h1>

        <form onSubmit={this.handleConfigure} className="search-credentials">
          <h3>Spotify Credentials</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              name="clientId"
              value={clientId}
              onChange={this.handleCredsChange}
              placeholder="Client ID"
              style={{ width: 280 }}
            />
            <input
              type="password"
              name="clientSecret"
              value={clientSecret}
              onChange={this.handleCredsChange}
              placeholder="Client Secret"
              style={{ width: 280 }}
            />
            <button type="submit" disabled={isConfiguring}>{configured ? 'Update' : 'Save'}</button>
            {configured && <small style={{ color: 'green' }}>Configured</small>}
          </div>
        </form>

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
