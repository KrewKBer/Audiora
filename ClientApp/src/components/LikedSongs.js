import React, { Component } from 'react';
import './LikedSongs.css';

export class LikedSongs extends Component {
  static displayName = LikedSongs.name;

  constructor(props) {
    super(props);
    this.state = { songs: [], loading: true };
  }

  componentDidMount() {
    this.populateLikedSongsData();
  }

  static renderLikedSongsList(songs) {
    if (songs.length === 0) {
      return <div className="empty-state">No liked songs yet. Start swiping!</div>;
    }
    
    return (
      <div className="liked-songs-list">
        {songs.map(song => {
          const songId = song.songId || song.SongId || song.id || song.Id;
          const name = song.name || song.Name;
          const artist = song.artist || song.Artist;
          const albumImageUrl = song.albumImageUrl || song.AlbumImageUrl;
          
          // Skip songs without basic info (old data before migration)
          if (!name && !artist) {
            return null;
          }
          
          return (
            <div key={songId} className="liked-song-item">
              <img 
                src={albumImageUrl || 'https://via.placeholder.com/60'} 
                alt={name || 'Song'} 
                className="liked-song-image"
              />
              <div className="liked-song-info">
                <div className="liked-song-name">{name || 'Unknown'}</div>
                <div className="liked-song-artist">{artist || 'Unknown'}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  render() {
    let contents = this.state.loading
      ? <div className="loading-state">Loading...</div>
      : LikedSongs.renderLikedSongsList(this.state.songs);

    return (
      <div className="liked-songs-container">
        <h1 className="liked-songs-title">Your Liked Songs</h1>
        {contents}
      </div>
    );
  }

  async populateLikedSongsData() {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        window.location.href = '/login';
        return;
      }
      console.log('Fetching liked songs for userId:', userId);
      const response = await fetch(`/api/user-songs/liked?userId=${userId}`);
      const data = await response.json();
      console.log('Liked songs data:', data);
      this.setState({ songs: data, loading: false });
    } catch (error) {
      console.error('Error fetching liked songs:', error);
      this.setState({ loading: false });
    }
  }
}
