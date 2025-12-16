import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const GENRES = [
    'Pop', 'Rock', 'Hip-Hop', 'Jazz', 'Classical', 'Electronic', 'Country', 'R&B', 'Reggae', 'Metal', 'Blues', 'Folk', 'Latin', 'Soul', 'Punk', 'Indie', 'K-Pop', 'EDM', 'Funk', 'Disco'
];

export function AuthForm({ formType, onSubmit }) {
    const navigate = useNavigate();
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
            await onSubmit({ username, password, genres });
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="auth-container">
            <form onSubmit={handleSubmit} className="auth-form">
                <div className="auth-tabs">
                    <button 
                        type="button" 
                        className={`auth-tab ${formType === 'Login' ? 'active' : ''}`}
                        onClick={() => navigate('/login')}
                    >
                        Login
                    </button>
                    <button 
                        type="button" 
                        className={`auth-tab ${formType === 'Register' ? 'active' : ''}`}
                        onClick={() => navigate('/register')}
                    >
                        Register
                    </button>
                </div>
                
                {error && <p className="auth-error">{error}</p>}
                <div className="form-group">
                    <label htmlFor="username">Username</label>
                    <input
                        id="username"
                        type="text"
                        className="form-control"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        id="password"
                        type="password"
                        className="form-control"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                {formType === 'Register' && (
                    <div className="form-group">
                        <label style={{marginBottom: '15px', display: 'block'}}>Select your favorite genres:</label>
                        <div className="genre-list">
                            {GENRES.map((genre, index) => (
                                <label 
                                    key={genre} 
                                    className={genres.includes(genre) ? 'selected' : ''}
                                    style={{ 
                                        animationDelay: `${index * 0.05}s`,
                                        animationDuration: `${3 + (index % 5) * 0.5}s`
                                    }}
                                >
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
