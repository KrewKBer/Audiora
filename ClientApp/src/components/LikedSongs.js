import React, { Component } from 'react';
import '../custom.css'; 

export class LikedSongs extends Component {
  static displayName = LikedSongs.name;

  constructor(props) {
    super(props);
    this.state = { songs: [], loading: true, userId: null };
  }

  componentDidMount() {
    const userId = localStorage.getItem('userId');
    this.setState({ userId }, this.populateLikedSongsData);
  }

  static renderLikedSongsTable(songs) {
    return (
      <table className='table text-light' aria-labelledby="tableLabel">
        <thead>
          <tr className='liked-songs-content'>
            <th>Title</th>
            <th>Artist</th>
            <th>Genre</th>
          </tr>
        </thead>
        <tbody>
          {songs.map(song =>
            <tr key={song.id}>
              <td>{song.title}</td>
              <td>{song.artist}</td>
              <td>{song.primaryGenre}</td>
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
    const response = await fetch(`api/user-songs/liked?userId=${this.state.userId}`);
    const data = await response.json();
    this.setState({ songs: data, loading: false });
  }
}
