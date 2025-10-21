import React, { useEffect, useState, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useParams, useNavigate } from 'react-router-dom';
import './Room.css';

export function Room() {
    const [room, setRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);

    const hubConnection = useRef(null);
    const { id: roomId } = useParams();
    const navigate = useNavigate();

    const [userId, setUserId] = useState(localStorage.getItem('userId') || '');
    const [username, setUsername] = useState(localStorage.getItem('username') || '');
    
    useEffect(() => {
        if (!userId) { navigate('/login'); return; }
        if (!username) {
            (async () => {
                try {
                    const res = await fetch(`/auth/user?userId=${encodeURIComponent(userId)}`);
                    if (!res.ok) return;
                    const u = await res.json();
                    if (u?.username) {
                        localStorage.setItem('username', u.username);
                        setUsername(u.username);
                    }
                } catch { /* ignore */ }
            })();
        }
    }, [userId, username, navigate]);

    // Load room and messages
    useEffect(() => {
        if (!userId) return;
        (async () => {
            try {
                const r = await fetch(`/api/room/${roomId}`);
                if (!r.ok) throw new Error('Room not found');
                const data = await r.json();
                setRoom(data);
                const msgs = await (await fetch(`/api/room/${roomId}/messages`)).json();
                setMessages(msgs);
            } finally {
                setLoading(false);
            }
        })();
    }, [roomId, userId]);

    // SignalR setup
    useEffect(() => {
        if (!userId) return;

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`/roomHub`)
            .configureLogging(signalR.LogLevel.Information)
            .withAutomaticReconnect()
            .build();

        connection.onreconnecting(() => setIsConnected(false));
        connection.onreconnected(() => setIsConnected(true));
        connection.onclose(() => setIsConnected(false));

        connection.on('ReceiveMessage', (fromUserId, fromUsername, message, timestamp) => {
            setMessages(prev => [...prev, { userId: fromUserId, username: fromUsername || 'Anonymous', message, timestamp }]);
        });

        hubConnection.current = connection;

        connection.start()
            .then(async () => {
                setIsConnected(true);
                await connection.invoke('JoinRoom', roomId, userId, username || 'Anonymous');
            })
            .catch(() => setIsConnected(false));

        return () => {
            if (connection.state === signalR.HubConnectionState.Connected) {
                connection.invoke('LeaveRoom', roomId, username || 'Anonymous').finally(() => connection.stop());
            } else {
                connection.stop();
            }
        };
    }, [roomId, userId, username]);

    const sendMessage = async () => {
        if (!messageInput.trim() || !isConnected) return;
        try {
            await hubConnection.current.invoke('SendMessage', roomId, userId, username || 'Anonymous', messageInput);
            setMessageInput('');
        } catch { /* ignore */ }
    };

    if (loading) return <div className="room-loading">Loading room...</div>;
    if (!room) return <div className="room-loading">Room not found</div>;

    return (
        <div className="room-container">
            <div className="chat-header">
                <div className="title">
                    <span className="badge">{room.isPrivate ? 'Private' : 'Public'}</span>
                    <h2>{room.name}</h2>
                </div>
                <div className="status">
                    <span className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
                    <span>{isConnected ? 'Connected' : 'Reconnecting...'}</span>
                </div>
            </div>

            <div className="chat-box">
                <div className="messages">
                    {messages.map((msg, i) => {
                        const mine = msg.userId === userId;
                        const ts = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';
                        return (
                            <div key={i} className={`message ${mine ? 'self' : ''}`}>
                                <div className="meta">
                                    <strong>{msg.username || 'Anonymous'}</strong>
                                    <span>•</span>
                                    <span>{ts}</span>
                                </div>
                                <div className="bubble">{msg.message}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Show current username near the composer and in the placeholder */}
                <div className="message-input">
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 6 }}>
                        <small style={{ color: '#6b7280' }}>
                            Signed in as <strong>{username || '...'}</strong>
                        </small>
                        <input
                            value={messageInput}
                            onChange={e => setMessageInput(e.target.value)}
                            placeholder={`Message as ${username || '...'}`}
                            onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
                        />
                    </div>
                    <button onClick={sendMessage} disabled={!isConnected}>Send</button>
                </div>
            </div>
        </div>
    );
}