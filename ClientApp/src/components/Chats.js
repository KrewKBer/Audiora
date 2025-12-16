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
        {items.map((m, i) => {
          const getInitial = (name) => (name || 'U').charAt(0).toUpperCase();
          const matchDate = m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
          
          return (
            <div key={i} className="chat-item" onClick={() => navigate(`/directchat/${m.chatId}`)}>
              <div className="chat-avatar">
                {getInitial(m.withUsername || m.withUser)}
              </div>
              <div className="chat-info">
                <div className="chat-name-row">
                  <span className="chat-name">{m.withUsername || m.withUser}</span>
                  <span className="chat-level-badge">Lvl {m.withLevel || 1}</span>
                </div>
                <span className="chat-date">Matched on {matchDate}</span>
              </div>
              <div className="chat-action">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
