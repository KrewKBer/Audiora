import React, { useEffect, useState, useRef } from 'react';
import './Profile.css';

const GENRES = [
    'Pop', 'Rock', 'Hip-Hop', 'Jazz', 'Classical', 'Electronic', 'Country', 'R&B', 'Reggae', 'Metal', 'Blues', 'Folk', 'Latin', 'Soul', 'Punk', 'Indie', 'EDM', 'Funk', 'Disco', 'Rap', 'Lithuanian', 'Alternative'
];

export function Profile() {
    const [genres, setGenres] = useState([]);
    const [topSongs, setTopSongs] = useState([null, null, null]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchResults, setSearchResults] = useState([[], [], []]);
    const [searchQueries, setSearchQueries] = useState(['', '', '']);
    const [searching, setSearching] = useState([false, false, false]);
    const [dropdownOpen, setDropdownOpen] = useState([false, false, false]);
    const inputRefs = [useRef(), useRef(), useRef()];

    useEffect(() => {
        async function fetchProfile() {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                window.location.href = '/login';
                return;
            }
            
            setLoading(true);
            setError('');
            try {
                const response = await fetch(`/auth/user?userId=${userId}`);
                if (!response.ok) throw new Error('Failed to fetch profile');
                const user = await response.json();
                setGenres(user.genres || []);
                const rawTop = (user.topSongs && user.topSongs.length > 0) ? user.topSongs : [];
                // Normalize properties regardless of server casing policy
                const normalized = rawTop.map(s => ({
                    Id: s.Id ?? s.id ?? '',
                    Name: s.Name ?? s.name ?? '',
                    Artist: s.Artist ?? s.artist ?? '',
                    AlbumImageUrl: s.AlbumImageUrl ?? s.albumImageUrl ?? ''
                }));
                setTopSongs(normalized.concat([null, null, null]).slice(0, 3));
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchProfile();
    }, []);

    const handleGenreChange = (e) => {
        const { value, checked } = e.target;
        setGenres((prev) =>
            checked ? [...prev, value] : prev.filter((g) => g !== value)
        );
    };

    const handleSongInputChange = (idx, value) => {
        setSearchQueries(qs => qs.map((q, i) => i === idx ? value : q));
    };

    // Always use the latest value from the input field
    const handleSongSearch = async (idx) => {
        const query = inputRefs[idx].current ? inputRefs[idx].current.value : searchQueries[idx];
        setSearchQueries(qs => qs.map((q, i) => i === idx ? query : q));
        if (!query) {
            setSearchResults(results => results.map((r, i) => i === idx ? [] : r));
            setDropdownOpen(arr => arr.map((v, i) => i === idx ? false : v));
            return;
        }
        setSearching(arr => arr.map((v, i) => i === idx ? true : v));
        setDropdownOpen(arr => arr.map((v, i) => i === idx ? true : v));
        try {
            const response = await fetch(`/spotify/search?query=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('Failed to search songs');
            const data = await response.json();
            setSearchResults(results => results.map((r, i) => i === idx ? data.items || data : r));
        } catch {
            setSearchResults(results => results.map((r, i) => i === idx ? [] : r));
        } finally {
            setSearching(arr => arr.map((v, i) => i === idx ? false : v));
        }
    };

    const handleSelectSong = (idx, song) => {
        setTopSongs(songs => songs.map((s, i) => i === idx ? {
            Id: song.id,
            Name: song.name,
            Artist: song.artists?.map(a => a.name).join(', ') || '',
            AlbumImageUrl: song.album?.images?.[0]?.url || ''
        } : s));
        setSearchResults(results => results.map((r, i) => i === idx ? [] : r));
        setSearchQueries(qs => qs.map((q, i) => i === idx ? '' : q));
        setDropdownOpen(arr => arr.map((v, i) => i === idx ? false : v));
    };

    const handleRemoveSong = (idx) => {
        setTopSongs(songs => songs.map((s, i) => i === idx ? null : s));
    };

    const handleBlurDropdown = (idx) => {
        setTimeout(() => {
            setDropdownOpen(arr => arr.map((v, i) => i === idx ? false : v));
        }, 200); // Delay to allow click
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            const userId = localStorage.getItem('userId');
            // Save genres
            await fetch('/auth/update-genres', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, genres }),
            });
            // Save top songs
            await fetch('/auth/update-top-songs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, topSongs: topSongs.filter(Boolean) }),
            });
            setSuccess('Profile updated successfully!');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading profile...</div>;

    return (
        <div className="profile-container">
            {(searching[0] || searching[1] || searching[2]) && (
                <div className="page-loader-overlay"><div className="page-loader"></div></div>
            )}
            <h2 className="profile-title">Your Profile</h2>
            
            <div className="profile-content">
                {error && <div className="alert alert-danger">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}
                
                <div className="profile-section">
                    <h3>Favorite Genres</h3>
                    <div className="genre-list">
                        {GENRES.map((g) => (
                            <label key={g} className="genre-chip">
                                <input
                                    type="checkbox"
                                    value={g}
                                    checked={genres.includes(g)}
                                    onChange={handleGenreChange}
                                />
                                {g}
                            </label>
                        ))}
                    </div>
                </div>

                <div className="profile-section">
                    <h3>Top 3 Songs</h3>
                    {topSongs.map((song, idx) => (
                        <div key={idx} className="song-input-group">
                            {song ? (
                                <div className="selected-song-card">
                                    <img src={song.AlbumImageUrl || 'https://via.placeholder.com/48'} alt="Album" />
                                    <div className="selected-song-info">
                                        <div className="selected-song-name">{song.Name}</div>
                                        <div className="selected-song-artist">{song.Artist}</div>
                                    </div>
                                    <button className="btn-remove" onClick={() => handleRemoveSong(idx)}>✕</button>
                                </div>
                            ) : (
                                <div className="song-search-container">
                                    <input
                                        ref={inputRefs[idx]}
                                        type="text"
                                        className="song-search-input"
                                        placeholder={`Search for song #${idx + 1}...`}
                                        value={searchQueries[idx]}
                                        onChange={(e) => handleSongInputChange(idx, e.target.value)}
                                        onKeyUp={(e) => { if (e.key === 'Enter') handleSongSearch(idx); }}
                                    />
                                    {dropdownOpen[idx] && searchResults[idx].length > 0 && (
                                        <div className="search-dropdown">
                                            {searchResults[idx].map(track => (
                                                <div key={track.id} className="search-result-item" onClick={() => handleSelectSong(idx, track)}>
                                                    <img src={track.album?.images?.[0]?.url || 'https://via.placeholder.com/40'} alt="Art" />
                                                    <div className="search-result-info">
                                                        <div className="search-result-name">{track.name}</div>
                                                        <div className="search-result-artist">{track.artists?.map(a => a.name).join(', ')}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <button className="btn-save" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Profile'}
                </button>
            </div>
        </div>
    );
}
