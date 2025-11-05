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
          {songs.map(song =>
            <tr key={song.id}>
              <td>
                {song.albumImageUrl && <img src={song.albumImageUrl} alt={song.name} width="50" />}
              </td>
              <td>{song.name}</td>
              <td>{song.artist}</td>
            </tr>
          )}
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
      const response = await fetch(`/api/user-songs/liked?userId=${userId}`);
      const data = await response.json();
      this.setState({ songs: data, loading: false });
    } catch (error) {
      console.error('Error fetching liked songs:', error);
      this.setState({ loading: false });
    }
  }
}
