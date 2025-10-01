import React, { Component } from 'react';

export class Home extends Component {
  static displayName = Home.name;

  constructor(props) {
    super(props);
    this.state = { songs: [], loading: true, currentSongIndex: 0, userId: null };
    this.handleLike = this.handleLike.bind(this);
    this.handleDislike = this.handleDislike.bind(this);
    this.resetData = this.resetData.bind(this);
  }

  componentDidMount() {
    // hardcoded userId for simplicity
    const userId = localStorage.getItem('userId') || "test-user";
    localStorage.setItem('userId', userId);
    this.setState({ userId }, this.populateSongsData);
  }

  async populateSongsData() {
    const { userId } = this.state;
    if (!userId) return;

    try {
        const songsResponse = await fetch('songs');
        if (!songsResponse.ok) {
            const errorText = await songsResponse.text();
            console.error('Failed to fetch songs:', songsResponse.status, errorText);
            throw new Error(`Failed to fetch songs: ${songsResponse.status}`);
        }
        const songsData = await songsResponse.json();

        const seenSongsResponse = await fetch(`api/user-songs/seen?userId=${userId}`);
        if (!seenSongsResponse.ok) {
            const errorText = await seenSongsResponse.text();
            console.error('Failed to fetch seen songs:', seenSongsResponse.status, errorText);
            throw new Error(`Failed to fetch seen songs: ${seenSongsResponse.status}`);
        }
        const seenSongs = await seenSongsResponse.json();
        const seenSongIds = seenSongs.map(s => s.id);

        const unseenSongs = songsData.filter(song => !seenSongIds.includes(song.id));

        this.setState({ songs: unseenSongs, loading: false, currentSongIndex: 0 });
    } catch (error) {
        console.error("Error populating songs data:", error);
        this.setState({ loading: false, error: 'Failed to load song data. See console for details.' });
    }
  }

  async handleInteraction(liked) {
    const { songs, currentSongIndex, userId } = this.state;
    if (currentSongIndex >= songs.length || !userId) return;

    const song = songs[currentSongIndex];
    const seenSong = { id: song.id, liked: liked };

    await fetch('api/user-songs/seen', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: userId, song: seenSong }),
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
    const { userId } = this.state;
    if (!userId) return;

    await fetch(`api/user-songs/seen?userId=${userId}`, { method: 'DELETE' });
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
        <h2>{song.title}</h2>
        <p>Artist: {song.artist}</p>
                <p>Genre: {song.genre}</p>
        <button onClick={this.handleLike}>Like</button>
        <button onClick={this.handleDislike}>Dislike</button>
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
