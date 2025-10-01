import React, { Component } from 'react';

export class Home extends Component {
  static displayName = Home.name;

  constructor(props) {
    super(props);
    this.state = { songs: [], loading: true, currentSongIndex: 0 };
    this.handleLike = this.handleLike.bind(this);
    this.handleDislike = this.handleDislike.bind(this);
    this.resetData = this.resetData.bind(this);
  }

  componentDidMount() {
    this.populateSongsData();
  }

  async populateSongsData() {
    const songsResponse = await fetch('songs');
    const songsData = await songsResponse.json();

    const seenSongsResponse = await fetch('seensongs');
    const seenSongs = await seenSongsResponse.json();
    const seenSongIds = seenSongs.map(s => s.id);

    const unseenSongs = songsData.songs.filter(song => !seenSongIds.includes(song.id));

    this.setState({ songs: unseenSongs, loading: false, currentSongIndex: 0 });
  }

  async handleInteraction(liked) {
    const { songs, currentSongIndex } = this.state;
    if (currentSongIndex >= songs.length) return;

    const song = songs[currentSongIndex];
    const seenSong = { id: song.id, liked: liked };

    await fetch('seensongs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(seenSong),
    });

    this.setState(prevState => ({
      currentSongIndex: prevState.currentSongIndex + 1
    }));
  }

  handleLike() {
    this.handleInteraction(true);
  }

  handleDislike() {
    this.handleInteraction(false);
  }

  async resetData() {
    await fetch('seensongs', { method: 'DELETE' });
    this.setState({ loading: true });
    this.populateSongsData();
  }

  renderCurrentSong() {
    const { songs, currentSongIndex } = this.state;

    if (currentSongIndex >= songs.length) {
      return <p>No more songs to display.</p>;
    }

    const song = songs[currentSongIndex];

    return (
      <div>
        <div className="card">
          <img className="card-img-top" src={song.imageUrl} alt={song.title} style={{width: "200px", height: "200px"}} />
          <div className="card-body">
            <h5 className="card-title">{song.title}</h5>
            <p className="card-text">{song.artist}</p>
            <button className="btn btn-success" onClick={this.handleLike}>Like</button>
            <button className="btn btn-danger" onClick={this.handleDislike}>Dislike</button>
          </div>
        </div>
      </div>
    );
  }

  render() {
    let contents = this.state.loading
      ? <p><em>Loading...</em></p>
      : this.renderCurrentSong();

    return (
      <div>
        <h1>Discover New Music</h1>
        <button className="btn btn-secondary mb-3" onClick={this.resetData}>Reset</button>
        {contents}
      </div>
    );
  }
}
