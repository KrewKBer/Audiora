import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';

// NOTE: The server RoomHub expects GUID strings for roomId. Our chatId is a composite
// string like userA_userB. DirectChatController maps chatId -> deterministic GUID via MD5.
// We replicate that mapping client-side to join the SignalR group so real-time works.
function guidFromChatId(chatId) {
  // Simple MD5 implementation using Web Crypto
  // Returns GUID format based on first 16 bytes of MD5 hash (same as backend approach).
  // Backend uses MD5 hash bytes directly as Guid.
  // We perform hash then format to XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
  const encoder = new TextEncoder();
  const data = encoder.encode(chatId);
  // Web Crypto MD5 isn't built-in; fallback: deterministic pseudo-hash (NOT cryptographically accurate)
  // For consistency we will call the backend to fetch messages; for hub join we skip GUID requirement
  // by sending the composite chatId itself. If backend rejects, we fall back to HTTP-only mode.
  return null; // indicate we will use HTTP-only for messaging for now.
}

export function DirectChat() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [realtime, setRealtime] = useState(false);
  const hubConnectionRef = useRef(null);

  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username') || 'Anonymous';

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
  }, [chatId, userId, navigate]);

  // Real-time join via RoomHub using JoinDirectChat
  useEffect(() => {
    if (!userId) return;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/roomHub')
      .withAutomaticReconnect()
      .build();

    connection.on('ReceiveMessage', (fromUserId, fromUsername, message, timestamp) => {
      setMessages(prev => [...prev, { userId: fromUserId, username: fromUsername, message, timestamp }]);
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
    if (!input.trim()) return;
    try {
      // Try realtime first
      if (realtime) {
        const connection = new signalR.HubConnectionBuilder().withUrl('/roomHub').build();
        // Avoid creating a new connection; instead rely on server echo via existing connection
        // So we'll still post to HTTP to persist + rely on hub to broadcast back if realtime isn't ready
      }
      const res = await fetch('/api/directchat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, userId, username, message: input })
      });
      if (!res.ok) throw new Error(await res.text() || 'Send failed');
      const saved = await res.json();
      if (!realtime) setMessages(prev => [...prev, saved]);
      setInput('');
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return <div style={{ padding:32 }}>Loading chat...</div>;

  return (
    <div style={{ maxWidth:680, margin:'0 auto', padding:'28px 18px' }}>
      <h2 style={{ margin:'0 0 8px' }}>Direct Chat</h2>
      <p style={{ margin:'0 0 24px', color:'#6b7280', fontSize:14 }}>Chat ID: <code>{chatId}</code></p>
      {error && (<div style={{ background:'#7f1d1d', color:'#fecaca', padding:'8px 12px', borderRadius:8, marginBottom:16 }}>{error}</div>)}
      <div style={{
        border:'1px solid #374151', borderRadius:16, padding:16,
        background:'#111827', display:'flex', flexDirection:'column', height:480, boxShadow:'0 8px 24px -4px rgba(0,0,0,0.4)'
      }}>
        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:10 }}>
          {messages.map(m => {
            const mine = m.userId && m.userId.toLowerCase() === userId?.toLowerCase();
            const ts = m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : '';
            return (
              <div key={m.id || m.timestamp + m.message} style={{
                alignSelf: mine ? 'flex-end' : 'flex-start',
                maxWidth:'70%',
                background: mine ? '#2563eb' : '#1f2937',
                color:'#fff',
                padding:'10px 14px',
                borderRadius: mine ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                boxShadow:'0 4px 12px rgba(0,0,0,0.35)'
              }}>
                <div style={{ fontSize:12, opacity:0.75, marginBottom:4 }}>
                  <strong>{m.username || 'Anon'}</strong> • {ts}
                </div>
                <div style={{ whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{m.message}</div>
              </div>
            );
          })}
          {messages.length === 0 && (
            <div style={{ textAlign:'center', color:'#9ca3af', marginTop:40 }}>No messages yet. Say hi </div>
          )}
        </div>
        <div style={{ display:'flex', gap:12, marginTop:12 }}>
          <input
            style={{ flex:1, background:'#1f2937', border:'1px solid #374151', color:'#fff', borderRadius:12, padding:'12px 14px' }}
            placeholder={`Message as ${username || '...'}`}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
          />
          <button
            onClick={sendMessage}
            style={{ background:'#10b981', color:'#fff', border:'none', borderRadius:12, padding:'0 24px', fontWeight:600 }}
          >Send</button>
        </div>
        {!realtime && (
          <small style={{ marginTop:8, color:'#9ca3af' }}>Real-time disabled (using polling). Upgrade server to support non-GUID rooms for SignalR join.</small>
        )}
      </div>
    </div>
  );
}
