import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';
import './DirectChat.css';

export function DirectChat() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [realtime, setRealtime] = useState(false);
  const [otherUser, setOtherUser] = useState(null);
  const [showSongs, setShowSongs] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const hubConnectionRef = useRef(null);

  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username') || 'Anonymous';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load existing messages
  const loadMessages = async () => {
    try {
      const res = await fetch(`/api/directchat/messages?chatId=${encodeURIComponent(chatId)}`);
      if (!res.ok) throw new Error(await res.text() || 'Failed to load messages');
      const data = await res.json();
      setMessages(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) { navigate('/login'); return; }
    loadMessages();
    
    // Fetch other user details
    if (chatId) {
      const parts = chatId.split('_');
      const myId = userId.toLowerCase();
      const otherId = parts.find(p => p.toLowerCase() !== myId);
      
      if (otherId) {
        fetch(`/api/match/user/${otherId}`)
          .then(res => {
             if(res.ok) return res.json();
             return null;
          })
          .then(data => {
             if(data) {
               // Normalize property names (backend uses PascalCase, we want camelCase)
               setOtherUser({
                 id: data.id || data.Id,
                 username: data.username || data.Username,
                 level: data.level || data.Level || 1,
                 role: data.role || data.Role,
                 genres: data.genres || data.Genres || [],
                 topSongs: (data.topSongs || data.TopSongs || []).map(s => ({
                   name: s.name || s.Name,
                   artist: s.artist || s.Artist,
                   albumImageUrl: s.albumImageUrl || s.AlbumImageUrl
                 }))
               });
             } else {
               setOtherUser({ username: 'User', level: 1, genres: [], topSongs: [] });
             }
          })
          .catch(err => {
            console.error('Profile fetch error:', err);
            setOtherUser({ username: 'User', level: 1, genres: [], topSongs: [] });
          });
      } else {
        setOtherUser({ username: 'Chat', level: 1, genres: [], topSongs: [] });
      }
    }
  }, [chatId, userId, navigate]);

  // Real-time join via RoomHub using JoinDirectChat
  useEffect(() => {
    if (!userId) return;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/roomHub')
      .withAutomaticReconnect()
      .build();

    hubConnectionRef.current = connection;

    connection.on('ReceiveMessage', (fromUserId, fromUsername, message, timestamp) => {
      // Avoid duplicates if we already added the message optimistically
      setMessages(prev => {
        const exists = prev.some(m => 
          m.userId === fromUserId && 
          m.message === message && 
          Math.abs(new Date(m.timestamp) - new Date(timestamp)) < 2000
        );
        if (exists) return prev;
        return [...prev, { userId: fromUserId, username: fromUsername, message, timestamp }];
      });
    });

    connection.start().then(() => {
      setRealtime(true);
      connection.invoke('JoinDirectChat', chatId, userId, username);
    }).catch(() => {
      setRealtime(false);
    });

    return () => { connection.stop(); };
  }, [chatId, userId, username]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    
    const messageText = input.trim();
    setInput('');
    setSending(true);
    
    // Optimistic update - show the message immediately
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      userId,
      username,
      message: messageText,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMessage]);
    
    try {
      const res = await fetch('/api/directchat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, userId, username, message: messageText })
      });
      if (!res.ok) throw new Error(await res.text() || 'Send failed');
      const saved = await res.json();
      
      // Replace optimistic message with the saved one (with real ID)
      setMessages(prev => prev.map(m => 
        m.id === optimisticMessage.id ? { ...saved } : m
      ));
    } catch (e) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const getInitial = (name) => {
    return (name || 'U').charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <div className="direct-chat-container">
        <div className="direct-chat-loading">
          <div className="direct-chat-skeleton" style={{ height: 56, width: 200 }}></div>
          <div className="direct-chat-skeleton" style={{ height: 24, width: 150 }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="direct-chat-container">
      {/* Header with user info */}
      <div className="direct-chat-header">
        {otherUser ? (
          <>
            <div className="direct-chat-user">
              <div className="direct-chat-avatar">
                {getInitial(otherUser.username)}
              </div>
              <div className="direct-chat-user-info">
                <h2 className="direct-chat-username">
                  {otherUser.username}
                  <span className="direct-chat-level">Lvl {otherUser.level}</span>
                </h2>
                <div className="direct-chat-genres">
                  {otherUser.genres && otherUser.genres.length > 0 ? (
                    otherUser.genres.slice(0, 5).map((g, i) => (
                      <span key={i} className="direct-chat-genre-tag">{g}</span>
                    ))
                  ) : (
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>No genres set</span>
                  )}
                </div>
              </div>
            </div>
            
            <button 
              className="direct-chat-songs-toggle"
              onClick={() => setShowSongs(!showSongs)}
            >
              <span>{showSongs ? '▼' : '▶'}</span>
              <span>Top Songs</span>
              {otherUser.topSongs && otherUser.topSongs.length > 0 && (
                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', opacity: 0.7 }}>({otherUser.topSongs.length})</span>
              )}
            </button>

            <div className={`direct-chat-songs-panel ${showSongs ? 'open' : ''}`}>
                {otherUser.topSongs && otherUser.topSongs.length > 0 ? (
                  otherUser.topSongs.slice(0, 3).map((song, i) => (
                    <div key={i} className="direct-chat-song-item">
                      {song.albumImageUrl ? (
                        <img src={song.albumImageUrl} alt="" className="direct-chat-song-art" />
                      ) : (
                        <div className="direct-chat-song-art" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🎵</div>
                      )}
                      <div className="direct-chat-song-info">
                        <div className="direct-chat-song-name">{song.name}</div>
                        <div className="direct-chat-song-artist">{song.artist}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '12px' }}>
                    No top songs available
                  </div>
                )}
            </div>
          </>
        ) : (
          <div className="direct-chat-loading">
            <div className="direct-chat-skeleton" style={{ height: 56, width: 56, borderRadius: '50%' }}></div>
            <div className="direct-chat-skeleton" style={{ height: 24, width: 150 }}></div>
          </div>
        )}
      </div>

      {error && <div className="direct-chat-error">{error}</div>}

      {/* Messages area */}
      <div className="direct-chat-messages-box">
        <div className="direct-chat-messages">
          {messages.length === 0 ? (
            <div className="direct-chat-empty">
              No messages yet. Say hi! 👋
            </div>
          ) : (
            messages.map((m, index) => {
              const mine = m.userId && m.userId.toLowerCase() === userId?.toLowerCase();
              const ts = m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
              return (
                <div 
                  key={m.id || `msg-${index}`} 
                  className={`direct-chat-message ${mine ? 'mine' : 'theirs'}`}
                >
                  <div className="direct-chat-message-meta">
                    {!mine && <strong>{m.username || 'Anon'}</strong>}
                    {!mine && ' • '}{ts}
                  </div>
                  <div className="direct-chat-message-text">{m.message}</div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="direct-chat-input-area">
          <input
            className="direct-chat-input"
            placeholder={`Message ${otherUser?.username || ''}...`}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            disabled={sending}
          />
          <button
            className="direct-chat-send-btn"
            onClick={sendMessage}
            disabled={sending || !input.trim()}
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}