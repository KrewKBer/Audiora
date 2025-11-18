import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { useNavigate } from 'react-router-dom';

export function Notifications() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username') || '';
  const nav = useNavigate();
  const connRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/roomHub')
      .withAutomaticReconnect()
      .build();

    connection.on('LikeReceived', (payload) => {
      setItems(prev => [{
        type: 'like',
        fromUserId: payload.fromUserId,
        fromUsername: payload.fromUsername,
        ts: Date.now()
      }, ...prev]);
    });

    connection.on('Matched', (payload) => {
      setItems(prev => [{
        type: 'matched',
        chatId: payload.chatId,
        withUser: payload.withUser,
        ts: Date.now()
      }, ...prev]);
    });

    connection.start().then(() => {
      connection.invoke('RegisterUser', userId);
    }).catch(() => {});

    connRef.current = connection;
    return () => { connection.stop(); };
  }, [userId]);

  const acceptAndChat = async (fromUserId) => {
    try {
      const res = await fetch('/api/match/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, targetUserId: fromUserId })
      });
      const data = await res.json();
      if (data.status === 'matched' && data.chatId) {
        nav(`/directchat/${data.chatId}`);
      }
      setItems(prev => prev.filter(n => !(n.type === 'like' && n.fromUserId === fromUserId)));
    } catch {}
  };

  const gotoChat = (chatId) => {
    nav(`/directchat/${chatId}`);
    setOpen(false);
  };

  if (!userId) return null;

  return (
    <div style={{ position:'relative', marginLeft: 12 }}>
      <button
        className="btn btn-link text-light"
        onClick={() => setOpen(o => !o)}
        title="Notifications"
      >Ping{items.length > 0 ? ` (${items.length})` : ''}</button>
      {open && (
        <div style={{ position:'absolute', right:0, top:'100%', background:'#1f2937', color:'#fff', minWidth:280, borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,.4)', zIndex: 50 }}>
          <div style={{ padding:'10px 12px', borderBottom:'1px solid #374151' }}>
            <strong>Notifications</strong>
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {items.length === 0 && (
              <div style={{ padding:12, color:'#9ca3af' }}>No notifications</div>
            )}
            {items.map((n, i) => (
              <div key={i} style={{ padding:12, borderBottom:'1px solid #374151' }}>
                {n.type === 'like' && (
                  <div>
                    <div><strong>{n.fromUsername || 'Someone'}</strong> liked your profile</div>
                    <div style={{ display:'flex', gap:8, marginTop:8 }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => setItems(prev => prev.filter((_,idx)=>idx!==i))}>Dismiss</button>
                      <button className="btn btn-sm btn-success" onClick={() => acceptAndChat(n.fromUserId)}>Accept & Chat</button>
                    </div>
                  </div>
                )}
                {n.type === 'matched' && (
                  <div>
                    <div>New match! Start chatting.</div>
                    <div style={{ display:'flex', gap:8, marginTop:8 }}>
                      <button className="btn btn-sm btn-primary" onClick={() => gotoChat(n.chatId)}>Open Chat</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
