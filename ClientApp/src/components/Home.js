import React, { Component, createRef } from 'react';
import TinderCard from 'react-tinder-card';

export class Home extends Component {
  static displayName = Home.name;

  constructor(props) {
    super(props);
    this.state = { songs: [], loading: true, currentSongIndex: 0, userId: null, mouse: { x: 0, y: 0 }, hoverDir: null, dragX: 0, dragging: false, };
    this.handleLike = this.handleLike.bind(this);
    this.handleDislike = this.handleDislike.bind(this);
    this.resetData = this.resetData.bind(this);
    this.contentRef = createRef();
    this.cardRef = createRef();
    this.handleMouseMove = this.handleMouseMove.bind(this);
  }

  handleMouseMove(e) {
    if (this.contentRef.current) {
      const rect = this.contentRef.current.getBoundingClientRect();
      this.setState({
        mouse: {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        }
      });
    }
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
      return <p className="no-songs">No more songs to display.</p>;
    }

    const song = songs[currentSongIndex];
    return (
      <div className="song-card">
        <h2 className="song-title">{song.title}</h2>
        <p className="song-artist">Artist: <span>{song.artist}</span></p>
        <p className="song-genre">Genre: <span>{song.primaryGenre || 'Unknown'}</span></p>
      </div>
    );
  }

    swipeWithAnimation(direction) {
        if (!this.cardRef.current || !this.contentRef.current) return;

        const isLeft = direction === 'left';
        const distance = isLeft ? -1000 : 1000;
        const rotation = isLeft ? -15 : 15;
        const element = this.contentRef.current;
        
        element.style.transition = 'none';
        
        requestAnimationFrame(() => {
            element.style.transform = `translateX(${distance * 0.05}px) rotate(${rotation * 0.2}deg)`;

            requestAnimationFrame(() => {
                element.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                
                element.style.transform = `translateX(${distance * 0.3}px) rotate(${rotation * 0.7}deg)`;
                
                setTimeout(() => {
                    this.cardRef.current.swipe(direction);
                }, 150);
            });
        });
    }


render() {
    const { mouse, hoverDir } = this.state;
    let contents = this.state.loading
        ? <div className="loading"><em>Loading...</em></div>
        : this.renderCurrentSong();

    const spotlightStyle = {
        background: `radial-gradient(650px circle at ${mouse.x}px ${mouse.y}px, rgba(14, 165, 233, 0.15), transparent 80%)`,
        transition: 'background 0.2s',
    };

    const cardTransform =
        hoverDir === 'left' ? 'translateX(-20px)' :
            hoverDir === 'right' ? 'translateX(20px)' : 'none';

    return (
        <div className="homepage-container">
            <TinderCard
                ref={this.cardRef}
                key={this.state.currentSongIndex}
                onSwipe={dir => {
                    if (dir === 'right') this.handleLike();
                    if (dir === 'left') this.handleDislike();
                }}
                preventSwipe={['up', 'down']}
                swipeRequirementType='position'
                swipeThreshold={400}
                flickOnSwipe={true}
            >
                <div
                    className="homepage-content spotlight-card"
                    ref={this.contentRef}
                >
                    <h1 className="homepage-title">Discover New Music</h1>
                    <button className="btn-reset" onClick={this.resetData}>Reset</button>
                    {contents}
                </div>
            </TinderCard>
            <div className="homepage-actions">
                <button
                    className="btn-dislike"
                    onClick={() => this.swipeWithAnimation('left')}
                >Dislike</button>
                <button
                    className="btn-like"
                    onClick={() => this.swipeWithAnimation('right')}
                >Like</button>
            </div>
        </div>
    );
    }
}
