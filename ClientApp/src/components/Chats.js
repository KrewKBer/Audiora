import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

  if (loading) return <div style={{ padding: 24 }}>Loading chats...</div>;
  if (error) return <div style={{ padding: 24, color: '#ef4444' }}>Error: {error}</div>;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 16px' }}>
      <h2 style={{ margin: 0 }}>Chats</h2>
      <p style={{ marginTop: 6, color: '#9ca3af' }}>Your matched conversations</p>
      {items.length === 0 && (
        <div style={{ marginTop: 20, color: '#9ca3af' }}>No chats yet. Go to Matchmaking and like someone!</div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 16 }}>
        {items.map((m, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#111827', color: '#fff', border: '1px solid #374151', borderRadius: 12, padding: '12px 14px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <strong style={{ fontSize: 16 }}>{m.withUsername || m.withUser}</strong>
              <small style={{ color: '#9ca3af' }}>Chat ID: {m.chatId}</small>
              <small style={{ color: '#6b7280' }}>Since: {m.createdAt && new Date(m.createdAt).toLocaleString()}</small>
            </div>
            <div>
              <button className="btn btn-primary" onClick={() => navigate(`/directchat/${m.chatId}`)}>Open</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
