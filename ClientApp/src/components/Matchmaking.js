import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TinderCard from 'react-tinder-card';
import './Matchmaking.css';

// Simple placeholder avatar using initials
function Avatar({ username }) {
  const initials = (username || '?')
    .split(/\s+/)
    .map(p => p[0])
    .join('')
    .substring(0,2)
    .toUpperCase();
  return (
    <div style={{
      width:64,height:64,borderRadius:'50%',
      background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
      display:'flex',alignItems:'center',justifyContent:'center',
      color:'#fff',fontWeight:'600',fontSize:22,boxShadow:'0 4px 12px rgba(0,0,0,0.25)'
    }}>{initials}</div>
  );
}

export function Matchmaking() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liking, setLiking] = useState(false);

  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');

  // Fetch candidates
  useEffect(() => {
    if (!userId) { navigate('/login'); return; }
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/match/candidates?userId=${encodeURIComponent(userId)}`);
        if (!res.ok) throw new Error(await res.text() || 'Failed to load candidates');
        const data = await res.json();
        setCandidates(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, navigate]);

  const likeUser = useCallback(async (targetUserId) => {
    if (!userId || liking) return;
    setLiking(true);
    try {
      const res = await fetch('/api/match/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId, targetUserId: targetUserId })
      });
      if (!res.ok) throw new Error(await res.text() || 'Like failed');
      const data = await res.json();
      // Remove candidate locally
      setCandidates(prev => prev.filter(c => c.id !== targetUserId));
      if (data.status === 'matched' && data.chatId) {
        // Navigate to direct chat
        navigate(`/directchat/${data.chatId}`);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLiking(false);
    }
  }, [userId, liking, navigate]);

  const skipUser = useCallback((targetUserId) => {
    setCandidates(prev => prev.filter(c => c.id !== targetUserId));
  }, []);

  if (loading) return <div className="mm-wrap"><div className="mm-status">Loading candidates...</div></div>;
  if (error) return <div className="mm-wrap"><div className="mm-status error">Error: {error}</div></div>;

  return (
    <div className="mm-wrap">
      <h2 className="mm-title">Matchmaking</h2>
      <p className="mm-sub">Swipe or use buttons to like / skip users. Mutual likes open a chat.</p>
      <div className="mm-stack">
        {candidates.length === 0 && (
          <div className="mm-empty">
            <h3>No more candidates</h3>
            <button className="mm-btn" onClick={() => window.location.reload()}>Refresh</button>
          </div>
        )}
        {candidates.map(user => (
          <TinderCard
            key={user.id}
            onSwipe={(dir) => {
              if (dir === 'right') likeUser(user.id);
              else if (dir === 'left') skipUser(user.id);
            }}
            preventSwipe={['up','down']}
          >
            <div className="mm-card">
              <div className="mm-head">
                <Avatar username={user.username} />
                <div className="mm-user">
                  <h3>{user.username}</h3>
                  <small>{user.id}</small>
                </div>
              </div>
              <div className="mm-body">
                <h4>Top Songs</h4>
                {(user.topSongs || []).slice(0,3).map((s,i) => (
                  <div key={i} className="mm-song">
                    <strong>{s.name || 'Unknown'}</strong>
                    <span>{s.artist || ''}</span>
                  </div>
                ))}
                {(user.topSongs || []).length === 0 && (
                  <div className="mm-note">No songs available</div>
                )}
              </div>
              <div className="mm-actions">
                <button className="mm-btn ghost" onClick={() => skipUser(user.id)} disabled={liking}>Skip</button>
                <button className="mm-btn primary" onClick={() => likeUser(user.id)} disabled={liking}>{liking ? '...' : 'Like'}</button>
              </div>
            </div>
          </TinderCard>
        ))}
      </div>
    </div>
  );
}
 
