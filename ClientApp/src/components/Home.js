import React, { Component } from 'react';

export class Home extends Component {
  static displayName = Home.name;

  constructor(props) {
    super(props);
    this.state = { songs: [], loading: true };
  }

  componentDidMount() {
    this.populateSongsData();
  }

  static renderSongs(songs) {
    return (
      <div>
        {songs.map(song => (
          <div key={song.id}>
            <h2>{song.title}</h2>
            <p>{song.artist}</p>
          </div>
        ))}
      </div>
    );
  }

  render() {
    let contents = this.state.loading
      ? <p><em>Loading...</em></p>
      : Home.renderSongs(this.state.songs);

    return (
      <div>
        <h1>Songs</h1>
        {contents}
      </div>
    );
  }

  async populateSongsData() {
    const response = await fetch('songs');
    const data = await response.json();
    this.setState({ songs: data.songs, loading: false });
  }
}
