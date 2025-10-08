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
    const userId = localStorage.getItem('userId');
    const inputRefs = [useRef(), useRef(), useRef()];

    useEffect(() => {
        async function fetchProfile() {
            setLoading(true);
            setError('');
            try {
                const response = await fetch(`/auth/user?userId=${userId}`);
                if (!response.ok) throw new Error('Failed to fetch user profile');
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
    }, [userId]);

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
        <div className="profile-content">
            {(searching[0] || searching[1] || searching[2]) && (
                <div className="page-loader-overlay"><div className="page-loader"></div></div>
            )}
            <h2>User Profile</h2>
            {error && <p className="auth-error">{error}</p>}
            {success && <p className="auth-success">{success}</p>}
            <form onSubmit={handleSave}>
                <div className="form-group" style={{ marginBottom: 32 }}>
                    <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Favorite Genres:</label>
                    <div className="genre-list">
                        {GENRES.map((genre) => (
                            <label key={genre} className="genre-chip">
                                <input
                                    type="checkbox"
                                    value={genre}
                                    checked={genres.includes(genre)}
                                    onChange={handleGenreChange}
                                />
                                <span className="check" aria-hidden="true"></span>
                                <span className="text">{genre}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="form-group">
                    <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Top 3 Favorite Songs:</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                        {[0, 1, 2].map(idx => (
                            <div key={idx} style={{ minHeight: 240, borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 16, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
                                {topSongs[idx] ? (
                                    <>
                                        {topSongs[idx].AlbumImageUrl && <img src={topSongs[idx].AlbumImageUrl} alt={topSongs[idx].Name} width="160" height="160" style={{ objectFit: 'cover', borderRadius: 8, marginBottom: 10 }} />}
                                        <div style={{ fontWeight: 600, fontSize: 18, color:"white", textAlign: 'center', marginBottom: 4 }}>{topSongs[idx].Name}</div>
                                        <div style={{ fontSize: 16, color: '#666', color:"white", textAlign: 'center', marginBottom: 10 }}>{topSongs[idx].Artist}</div>
                                        <button type="button" className="icon-btn" title="Remove" style={{ marginTop: 'auto' }} onClick={() => handleRemoveSong(idx)}>
                                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                                <path d="M9 3h6m-8 4h10m-1 0-.7 12.25a2 2 0 0 1-2 1.75H9.7a2 2 0 0 1-2-1.75L7 7m4 3v7m2-7v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </button>
                                    </>
                                ) : (
                                    <div style={{ width: '100%' }}>
                                        <input
                                            ref={inputRefs[idx]}
                                            type="text"
                                            placeholder="Search for a song..."
                                            value={searchQueries[idx]}
                                            onChange={e => handleSongInputChange(idx, e.target.value)}
                                            style={{ width: '100%', marginBottom: 6, padding: 6, borderRadius: 5, border: '1px solid #ccc' }}
                                            onFocus={() => setDropdownOpen(arr => arr.map((v, i) => i === idx ? true : v))}
                                            onBlur={() => handleBlurDropdown(idx)}
                                        />
                                        <button type="button" className="btn btn-secondary btn-sm" style={{ width: '100%', marginBottom: 6 }} onClick={() => handleSongSearch(idx)} disabled={searching[idx]}>
                                            {searching[idx] ? (<><span className="spinner spinner-dark spinner-sm"></span>Searching...</>) : 'Search'}
                                        </button>
                                        {dropdownOpen[idx] && (
                                            <div style={{ background: '#fff', border: '1px solid #ccc', maxHeight: '180px', overflowY: 'auto', position: 'absolute', zIndex: 100, left: 0, top: '110px', width: '90%', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                                                {searchResults[idx] && searchResults[idx].length > 0 ? (
                                                    searchResults[idx].map(song => (
                                                        <div key={song.id} style={{ padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', borderBottom: '1px solid #eee' }} onClick={() => handleSelectSong(idx, song)}>
                                                            {song.album?.images?.[0]?.url && <img src={song.album.images[0].url} alt={song.name} width="36" style={{ marginRight: '10px', borderRadius: 4 }} />}
                                                            <span>{song.name} - {song.artists?.map(a => a.name).join(', ')}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    !searching[idx] && <div style={{ padding: '8px', color: '#888' }}>No results found.</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop: 32, width: 180, fontWeight: 600, fontSize: 16 }} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </form>
        </div>
    );
}
