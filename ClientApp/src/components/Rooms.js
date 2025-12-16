import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Rooms.css';

export function Rooms() {
    const [rooms, setRooms] = useState([]);
    const [name, setName] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (localStorage.getItem('userId') === null) {
            navigate('/login');
            return;
        }

        fetch('/api/room/list').then(r => r.json()).then(setRooms);
    }, [navigate]);

    const createRoom = async () => {
        const userId = localStorage.getItem('userId');
        if (!userId) { navigate('/login'); return; }
        if (!name.trim()) return;

        const res = await fetch('/api/room', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                userId,
                isPrivate,
                password: isPrivate ? password : null
            })
        });

        if (!res.ok) { alert('Failed to create room'); return; }
        const room = await res.json();
        navigate(`/room/${room.id}`);
    };

    const joinRoom = async (room) => {
        const userId = localStorage.getItem('userId');
        if (!userId) { navigate('/login'); return; }

        let pwd = null;
        if (room.isPrivate) {
            pwd = window.prompt('Enter room password');
            if (pwd === null) return;
        }

        const res = await fetch(`/api/room/${room.id}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, password: pwd })
        });

        if (!res.ok) {
            const text = await res.text();
            alert(text || 'Failed to join room');
            return;
        }

        navigate(`/room/${room.id}`);
    };

    const getInitial = (name) => (name || 'R').charAt(0).toUpperCase();

    return (
        <div className="rooms-container">
            <h2 className="rooms-title">Community Rooms</h2>
            <p className="rooms-subtitle">Join a discussion or start your own topic</p>

            <div className="create-room-section">
                <div className="create-room-form">
                    <input 
                        className="create-room-input"
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        placeholder="New Room Name..." 
                        type="text" 
                    />
                    <label className="create-room-checkbox-label">
                        <input 
                            type="checkbox" 
                            checked={isPrivate} 
                            onChange={e => setIsPrivate(e.target.checked)} 
                        />
                        Private
                    </label>
                    {isPrivate && (
                        <input 
                            className="create-room-input"
                            type="password" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            placeholder="Password" 
                        />
                    )}
                    <button className="create-room-btn" onClick={createRoom}>Create Room</button>
                </div>
            </div>

            <div className="rooms-list">
                {rooms.map(r => (
                    <div key={r.id} className="room-item" onClick={() => joinRoom(r)}>
                        <div className="room-avatar">
                            {getInitial(r.name)}
                        </div>
                        <div className="room-info">
                            <div className="room-name-row">
                                <span className="room-name">{r.name}</span>
                                <span className={`room-badge ${r.isPrivate ? 'private' : 'public'}`}>
                                    {r.isPrivate ? 'Private' : 'Public'}
                                </span>
                            </div>
                            <div className="room-meta">
                                <span>{r.memberUserIds?.length || 0} Members</span>
                                <span>•</span>
                                <span>Active now</span>
                            </div>
                        </div>
                        <div className="room-action">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 18l6-6-6-6"/>
                            </svg>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
