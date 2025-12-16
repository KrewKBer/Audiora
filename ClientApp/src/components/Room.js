import React, { useEffect, useState, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useParams, useNavigate } from 'react-router-dom';
import './Room.css';
import './RoomMedia.css';

export function Room() {
    const [room, setRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [sending, setSending] = useState(false);

    const hubConnection = useRef(null);
    const messagesEndRef = useRef(null);
    const { id: roomId } = useParams();
    const navigate = useNavigate();

    const [userId, setUserId] = useState(localStorage.getItem('userId') || '');
    const [username, setUsername] = useState(localStorage.getItem('username') || '');
    
    useEffect(() => {
        if (!userId) { navigate('/login'); return; }
    }, [userId, navigate]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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
            } catch (e) {
                console.error(e);
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
            setMessages(prev => {
                // Avoid duplicates if we already added the message optimistically
                const exists = prev.some(m => 
                    m.userId === fromUserId && 
                    m.message === message && 
                    Math.abs(new Date(m.timestamp) - new Date(timestamp)) < 2000
                );
                if (exists) return prev;
                return [...prev, { userId: fromUserId, username: fromUsername || 'Anonymous', message, timestamp }];
            });
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
        if (!messageInput.trim() || !isConnected || sending) return;
        
        const msgText = messageInput.trim();
        setMessageInput('');
        setSending(true);

        // Optimistic update
        const optimisticMsg = {
            userId,
            username: username || 'Anonymous',
            message: msgText,
            timestamp: new Date().toISOString(),
            isOptimistic: true
        };
        setMessages(prev => [...prev, optimisticMsg]);

        try {
            await hubConnection.current.invoke('SendMessage', roomId, userId, username || 'Anonymous', msgText);
        } catch (e) {
            console.error(e);
            // Remove optimistic message on failure
            setMessages(prev => prev.filter(m => m !== optimisticMsg));
        } finally {
            setSending(false);
        }
    };

    const getInitial = (name) => {
        return (name || 'R').charAt(0).toUpperCase();
    };

    const renderMessageContent = (text) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);
        
        return parts.map((part, i) => {
            if (part.match(urlRegex)) {
                // Spotify Embed
                if (part.includes('open.spotify.com')) {
                    const embedUrl = part.replace('open.spotify.com', 'open.spotify.com/embed');
                    return (
                        <div key={i} className="media-embed">
                            <iframe 
                                src={embedUrl} 
                                width="100%" 
                                height="80" 
                                frameBorder="0" 
                                allowtransparency="true" 
                                allow="encrypted-media"
                                title="Spotify Embed"
                            />
                        </div>
                    );
                }
                // YouTube Embed
                if (part.includes('youtube.com/watch') || part.includes('youtu.be/')) {
                    let videoId = '';
                    if (part.includes('v=')) {
                        videoId = part.split('v=')[1].split('&')[0];
                    } else if (part.includes('youtu.be/')) {
                        videoId = part.split('youtu.be/')[1].split('?')[0];
                    }
                    
                    if (videoId) {
                        return (
                            <div key={i} className="media-embed youtube">
                                <iframe 
                                    width="100%" 
                                    height="200" 
                                    src={`https://www.youtube.com/embed/${videoId}`} 
                                    frameBorder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                    allowFullScreen
                                    title="YouTube Embed"
                                />
                            </div>
                        );
                    }
                }
                return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="message-link">{part}</a>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    if (loading) {
        return (
            <div className="room-loading">
                <div className="room-skeleton" style={{ height: 64, width: '100%', maxWidth: 400 }}></div>
                <div className="room-skeleton" style={{ height: 500, width: '100%' }}></div>
            </div>
        );
    }

    if (!room) return <div className="room-loading">Room not found</div>;

    return (
        <div className="room-container">
            <div className="room-header">
                <div className="room-info">
                    <div className="room-avatar">
                        {getInitial(room.name)}
                    </div>
                    <div className="room-details">
                        <div className="room-name-wrapper">
                            <h2 className="room-name">{room.name}</h2>
                        </div>
                        <div className="room-meta-row">
                            <span className={`room-badge ${room.isPrivate ? 'private' : 'public'}`}>
                                {room.isPrivate ? 'Private' : 'Public'}
                            </span>
                            <div className="room-status">
                                <span className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
                                <span>{isConnected ? 'Live' : 'Connecting...'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="room-messages-box">
                <div className="room-messages">
                    {messages.length === 0 ? (
                        <div className="room-empty">
                            <div style={{ fontSize: '3rem' }}>💬</div>
                            <div>No messages yet. Start the discussion!</div>
                        </div>
                    ) : (
                        messages.map((m, index) => {
                            const mine = m.userId === userId;
                            const ts = m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                            
                            return (
                                <div key={index} className={`room-message ${mine ? 'mine' : 'theirs'}`}>
                                    <div className="room-message-header">
                                        <span className="room-message-author">{mine ? 'You' : m.username}</span>
                                        <span className="room-message-time">{ts}</span>
                                    </div>
                                    <div className="room-message-text">{renderMessageContent(m.message)}</div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="room-input-area">
                    <input
                        className="room-input"
                        placeholder={`Message #${room.name}...`}
                        value={messageInput}
                        onChange={e => setMessageInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        disabled={!isConnected || sending}
                    />
                    <button
                        className="room-send-btn"
                        onClick={sendMessage}
                        disabled={!isConnected || sending || !messageInput.trim()}
                    >
                        {sending ? '...' : 'Send'}
                    </button>
                </div>
            </div>
        </div>
    );
}
