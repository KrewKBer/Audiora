import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Sidebar.css';

export function Sidebar({ open, onClose }) {
  const nav = useNavigate();
  const go = (path) => { onClose?.(); nav(path); };

  return (
    <div className={`sidebar-overlay ${open ? 'open' : ''}`}>
      <div className={`sidebar-panel ${open ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-mark">A</div>
            <div className="brand-text">
              <strong>Audiora</strong>
              <small>your social jukebox</small>
            </div>
          </div>
          <button onClick={onClose} className="btn-close-x" aria-label="Close">✕</button>
        </div>

        <div className="sidebar-content">
          <section className="sidebar-section">
            <h2 className="sidebar-title">Discover</h2>
            <div className="sidebar-actions">
              <button className="sidebar-btn primary" onClick={() => go('/')}>Listen Now</button>
              <button className="sidebar-btn" onClick={() => go('/search')}>Browse</button>
              <button className="sidebar-btn" onClick={() => go('/rooms')}>Rooms</button>
            </div>
          </section>

          <section className="sidebar-section">
            <h2 className="sidebar-title">Library</h2>
            <div className="sidebar-actions">
              <button className="sidebar-btn" onClick={() => go('/matchmaking')}>Matchmaking</button>
              <button className="sidebar-btn" onClick={() => go('/chats')}>Chats</button>
              <button className="sidebar-btn" onClick={() => go('/liked-songs')}>Liked Songs</button>
            </div>
          </section>
        </div>

        <div className="sidebar-footer">
          <button className="footer-btn" onClick={() => go('/profile')}>Profile</button>
          <button className="footer-btn" onClick={() => { localStorage.clear(); window.location.href = '/login'; }}>Logout</button>
        </div>
      </div>
    </div>
  );
}
