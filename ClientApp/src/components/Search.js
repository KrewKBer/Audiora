import React, { Component } from 'react';
import { useSongQueue } from './SongQueueContext';
import './Search.css';

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
        const { searchResults, error } = this.state;
        if (error) {
            return <div className="search-error">{error}</div>;
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
        return (
            <div className="search-container">
                <h1 className="search-title">Song Search</h1>
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
