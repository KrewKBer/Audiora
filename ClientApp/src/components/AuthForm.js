import React, { useState } from 'react';

const GENRES = [
    'Pop', 'Rock', 'Hip-Hop', 'Jazz', 'Classical', 'Electronic', 'Country', 'R&B', 'Reggae', 'Metal', 'Blues', 'Folk', 'Latin', 'Soul', 'Punk', 'Indie', 'K-Pop', 'EDM', 'Funk', 'Disco'
];

export function AuthForm({ formType, onSubmit }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [genres, setGenres] = useState([]);
    const [error, setError] = useState('');

    const handleGenreChange = (e) => {
        const { value, checked } = e.target;
        setGenres((prev) =>
            checked ? [...prev, value] : prev.filter((g) => g !== value)
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); // Clear previous errors
        try {
            if (formType === 'Register') {
                await onSubmit({ username, password, genres });
            } else {
                await onSubmit({ username, password });
            }
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="auth-container">
            <form onSubmit={handleSubmit} className="auth-form">
                <h2>{formType}</h2>
                {error && <p className="auth-error">{error}</p>}
                <div className="form-group">
                    <label>Username</label>
                    <input
                        type="text"
                        className="form-control"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Password</label>
                    <input
                        type="password"
                        className="form-control"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                {formType === 'Register' && (
                    <div className="form-group">
                        <label>Select your favorite genres:</label>
                        <div className="genre-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
                            {GENRES.map((genre) => (
                                <label key={genre} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <input
                                        type="checkbox"
                                        value={genre}
                                        checked={genres.includes(genre)}
                                        onChange={handleGenreChange}
                                    />
                                    {genre}
                                </label>
                            ))}
                        </div>
                    </div>
                )}
                <button type="submit" className="btn btn-primary btn-block">{formType}</button>
            </form>
        </div>
    );
}
