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

  static renderLikedSongsTable(songs) {
    if (songs.length === 0) {
      return <p>No liked songs yet. Start swiping!</p>;
    }
    
    return (
      <table className='table text-light' aria-labelledby="tableLabel">
        <thead>
          <tr className='liked-songs-content'>
            <th>Album Art</th>
            <th>Title</th>
            <th>Artist</th>
          </tr>
        </thead>
        <tbody>
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
              <tr key={songId}>
                <td>
                  {albumImageUrl && 
                    <img src={albumImageUrl} 
                         alt={name || 'Song'} 
                         width="50" />}
                </td>
                <td>{name || 'Unknown'}</td>
                <td>{artist || 'Unknown'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  render() {
    let contents = this.state.loading
      ? <p><em>Loading...</em></p>
      : LikedSongs.renderLikedSongsTable(this.state.songs);

    return (
      <div className='liked-songs-content'>
        <h1 id="tableLabel">Your Liked Songs</h1>
        <p>Here are the songs you've liked.</p>
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
