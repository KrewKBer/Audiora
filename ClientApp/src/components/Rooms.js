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

    return (
        <div className="rooms-container">
            <h2 className="rooms-title">Rooms</h2>

            <div className="create-room">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Room name" type="text" />
                <label>
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
                        <div className="room-info">
                            <h4>{r.name}</h4>
                            <p>{r.memberUserIds?.length || 0} Members</p>
                        </div>
                        <div className="room-status">
                            {r.isPrivate ? '🔒' : '🔓'}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
