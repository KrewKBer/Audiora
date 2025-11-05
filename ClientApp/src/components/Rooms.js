import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Rooms.css';
import { isAuthenticated } from '../utils/api';

export function Rooms() {
    const [rooms, setRooms] = useState([]);
    const [name, setName] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (!isAuthenticated()) {
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

    return (
        <div className="rooms-container">
            <h2>Rooms</h2>

            <div className="create-room">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Room name" />
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} />
                    Private
                </label>
                {isPrivate && (
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
                )}
                <button onClick={createRoom}>Create</button>
            </div>

            <div className="rooms-list">
                {rooms.map(r => (
                    <div key={r.id} className="room-item" onClick={() => joinRoom(r)}>
                        <h4>
                            {r.name} {r.isPrivate ? '🔒' : '🔓'}
                        </h4>
                        <p>Members: {r.memberUserIds?.length || 0}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
