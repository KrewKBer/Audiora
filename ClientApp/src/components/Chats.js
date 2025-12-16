import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Chats.css';

export function Chats() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const userId = localStorage.getItem('userId');

  useEffect(() => {
    if (!userId) { navigate('/login'); return; }
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/match/list?userId=${encodeURIComponent(userId)}`);
        if (!res.ok) throw new Error(await res.text() || 'Failed to load chats');
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, navigate]);

  if (loading) return <div className="chats-container"><div className="chats-subtitle">Loading chats...</div></div>;
  if (error) return <div className="chats-container"><div className="chats-subtitle" style={{ color: '#fca5a5' }}>Error: {error}</div></div>;

  return (
    <div className="chats-container">
      <h2 className="chats-title">Chats</h2>
      <p className="chats-subtitle">Your matched conversations</p>
      
      {items.length === 0 && (
        <div className="no-chats">No chats yet. Go to Matchmaking and like someone!</div>
      )}
      
      <div className="chats-list">
        {items.map((m, i) => (
          <div key={i} className="chat-item">
            <div className="chat-info">
              <span className="chat-name">{m.withUsername || m.withUser}</span>
              <span className="chat-meta">Chat ID: {m.chatId}</span>
              <span className="chat-meta">Since: {m.createdAt && new Date(m.createdAt).toLocaleDateString()}</span>
            </div>
            <div>
              <button className="chat-btn" onClick={() => navigate(`/directchat/${m.chatId}`)}>Open</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
