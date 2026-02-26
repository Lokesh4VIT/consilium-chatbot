'use client';

import { useState, useEffect, useRef } from 'react';
import { createSupabaseBrowserClient } from '@/lib/db/supabase';
import type { User } from '@supabase/supabase-js';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  consensusData?: any;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

export default function ChatPage() {
  const supabase = createSupabaseBrowserClient();
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close settings dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function loadConversations() {
    const res = await fetch('/api/history');
    const data = await res.json();
    if (data.success) setConversations(data.conversations || []);
  }

  async function loadConversation(convId: string) {
    setActiveConvId(convId);
    const res = await fetch(`/api/history?conversationId=${convId}`);
    const data = await res.json();
    if (data.success) {
      setMessages(data.messages?.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        consensusData: m.consensus_result,
      })) || []);
    }
  }

  async function deleteConversation(convId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setDeletingId(convId);
    try {
      await fetch(`/api/history?id=${convId}`, { method: 'DELETE' });
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (activeConvId === convId) {
        setActiveConvId(null);
        setMessages([]);
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function newConversation() {
    setActiveConvId(null);
    setMessages([]);
    setInput('');
  }

  async function submit() {
    if (!input.trim() || loading) return;
    const prompt = input.trim();
    setInput('');
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: prompt };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const phases = [
      'Gathering responses from 4 AIs…',
      'Running cross-examination…',
      'Scoring reasoning quality…',
      'Meta-adjudicating final answer…',
    ];
    let pi = 0;
    setPhase(phases[0]);
    const phaseTimer = setInterval(() => {
      pi = Math.min(pi + 1, phases.length - 1);
      setPhase(phases[pi]);
    }, 4000);

    try {
      const res = await fetch('/api/consensus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, conversationId: activeConvId }),
      });
      const data = await res.json();
      clearInterval(phaseTimer);
      setPhase('');

      if (data.success) {
        if (!activeConvId && data.data?.conversationId) {
          setActiveConvId(data.data.conversationId);
          await loadConversations();
        }
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.data?.consensus?.finalAnswer || 'No answer returned.',
          consensusData: data.data,
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Error: ${data.error || 'Something went wrong.'}`,
        }]);
      }
    } catch {
      clearInterval(phaseTimer);
      setPhase('');
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Network error. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  const confidence = (score: number) => {
    if (score >= 85) return { label: 'Very High', color: '#10b981' };
    if (score >= 70) return { label: 'High', color: '#6366f1' };
    if (score >= 50) return { label: 'Moderate', color: '#f59e0b' };
    return { label: 'Low', color: '#ef4444' };
  };

  return (
    <div className="chat-root">
      {/* Starfield */}
      <canvas id="stars" className="stars-canvas" />
      <div className="neb neb-1" /><div className="neb neb-2" />

      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="sidebar-brand">
          <svg viewBox="0 0 100 100" fill="none" width="32" height="32">
            <circle cx="50" cy="50" r="48" fill="#0a0a0f" stroke="#6366f1" strokeWidth="2.5"/>
            <circle cx="22" cy="28" r="0.9" fill="white" opacity="0.8"/>
            <circle cx="76" cy="20" r="0.7" fill="white" opacity="0.7"/>
            <circle cx="83" cy="62" r="0.8" fill="white" opacity="0.9"/>
            <circle cx="18" cy="70" r="0.6" fill="white" opacity="0.6"/>
            <circle cx="62" cy="82" r="0.7" fill="white" opacity="0.8"/>
            <path d="M68 35 C62 27 52 23 42 26 C28 30 22 44 26 58 C30 72 44 78 57 74 C63 72 68 67 70 62"
              stroke="white" strokeWidth="9" strokeLinecap="round" fill="none"/>
          </svg>
          <span className="sidebar-title">Consilium</span>
        </div>

        {/* New conversation button */}
        <button className="new-conv-btn" onClick={newConversation}>
          <span>＋</span> New Conversation
        </button>

        {/* Conversations list */}
        <div className="conv-list-header">Conversations</div>
        <div className="conv-list">
          {conversations.length === 0 && (
            <p className="conv-empty">No conversations yet.<br/>Ask your first question →</p>
          )}
          {conversations.map(conv => (
            <div
              key={conv.id}
              className={`conv-item ${activeConvId === conv.id ? 'conv-item-active' : ''}`}
              onClick={() => loadConversation(conv.id)}
            >
              <div className="conv-item-icon">💬</div>
              <div className="conv-item-text">{conv.title}</div>
              <button
                className={`conv-delete-btn ${deletingId === conv.id ? 'deleting' : ''}`}
                onClick={(e) => deleteConversation(conv.id, e)}
                title="Delete conversation"
              >
                {deletingId === conv.id ? '…' : '🗑'}
              </button>
            </div>
          ))}
        </div>

        {/* User info at bottom */}
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {user?.email?.[0].toUpperCase() || '?'}
          </div>
          <div className="sidebar-user-email">{user?.email || 'Loading…'}</div>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <main className="main-area">
        {/* Top bar */}
        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-dots">
              <span className="dot dot-openai" title="OpenAI" />
              <span className="dot dot-gemini" title="Gemini" />
              <span className="dot dot-perplexity" title="Perplexity" />
              <span className="dot dot-openrouter" title="OpenRouter" />
            </span>
            <span className="topbar-label">4 AI engines active</span>
          </div>

          {/* Settings gear */}
          <div className="settings-wrap" ref={settingsRef}>
            <button className="settings-btn" onClick={() => setShowSettings(v => !v)} title="Settings">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>

            {showSettings && (
              <div className="settings-dropdown">
                <button className="dropdown-item" onClick={() => { setShowProfile(true); setShowSettings(false); }}>
                  👤 My Profile
                </button>
                <div className="dropdown-divider" />
                <button className="dropdown-item dropdown-logout" onClick={logout}>
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Messages */}
        <div className="messages-area">
          {messages.length === 0 && !loading && (
            <div className="empty-state">
              <div className="empty-logo">
                <svg viewBox="0 0 100 100" fill="none" width="64" height="64">
                  <circle cx="50" cy="50" r="48" fill="#0a0a0f" stroke="#6366f1" strokeWidth="2"/>
                  <circle cx="22" cy="28" r="0.9" fill="white" opacity="0.8"/>
                  <circle cx="76" cy="20" r="0.7" fill="white" opacity="0.7"/>
                  <circle cx="83" cy="62" r="0.8" fill="white" opacity="0.9"/>
                  <circle cx="18" cy="70" r="0.6" fill="white" opacity="0.6"/>
                  <circle cx="62" cy="82" r="0.7" fill="white" opacity="0.8"/>
                  <path d="M68 35 C62 27 52 23 42 26 C28 30 22 44 26 58 C30 72 44 78 57 74 C63 72 68 67 70 62"
                    stroke="white" strokeWidth="9" strokeLinecap="round" fill="none"/>
                </svg>
              </div>
              <h2 className="empty-title">Consilium</h2>
              <p className="empty-sub">Four AIs debate. One truth emerges.</p>
              <div className="example-chips">
                {['What causes inflation?','Is free will real?','What is consciousness?','Can AI be creative?'].map(q => (
                  <button key={q} className="chip" onClick={() => setInput(q)}>{q}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`msg-row ${msg.role === 'user' ? 'msg-user' : 'msg-ai'}`}>
              {msg.role === 'user' ? (
                <div className="bubble-user">{msg.content}</div>
              ) : (
                <div className="bubble-ai">
                  <div className="bubble-ai-answer">{msg.content}</div>
                  {msg.consensusData?.consensus && (
                    <div className="consensus-meta">
                      <div className="consensus-score-row">
                        <span className="consensus-label">Consensus</span>
                        <span className="consensus-score" style={{
                          color: confidence(msg.consensusData.consensus.confidenceScore).color
                        }}>
                          {msg.consensusData.consensus.confidenceScore}%
                        </span>
                        <span className="consensus-badge" style={{
                          background: confidence(msg.consensusData.consensus.confidenceScore).color + '22',
                          color: confidence(msg.consensusData.consensus.confidenceScore).color,
                          border: `1px solid ${confidence(msg.consensusData.consensus.confidenceScore).color}44`,
                        }}>
                          {confidence(msg.consensusData.consensus.confidenceScore).label}
                        </span>
                        <span className="consensus-time">
                          {(msg.consensusData.consensus.processingTimeMs / 1000).toFixed(1)}s
                        </span>
                      </div>
                      {/* Provider dots */}
                      <div className="provider-dots">
                        {msg.consensusData.initialResponses?.map((r: any) => (
                          <div key={r.provider} className="provider-dot-item">
                            <span className={`pdot pdot-${r.provider}`} />
                            <span className="pdot-name">{r.provider}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Loading state */}
          {loading && (
            <div className="msg-row msg-ai">
              <div className="bubble-ai bubble-loading">
                <div className="loading-dots">
                  <span /><span /><span />
                </div>
                <div className="loading-phase">{phase}</div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="input-area">
          <div className="input-wrap">
            <textarea
              className="input-box"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder="Ask anything — four AIs will debate the answer…"
              rows={1}
              disabled={loading}
            />
            <button className="send-btn" onClick={submit} disabled={loading || !input.trim()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
          <p className="input-hint">Enter to send · Shift+Enter for new line</p>
        </div>
      </main>

      {/* ── PROFILE MODAL ── */}
      {showProfile && (
        <div className="modal-overlay" onClick={() => setShowProfile(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">My Profile</h2>
              <button className="modal-close" onClick={() => setShowProfile(false)}>✕</button>
            </div>
            <div className="profile-avatar-big">
              {user?.email?.[0].toUpperCase() || '?'}
            </div>
            <div className="profile-field">
              <label className="profile-label">Username / Email</label>
              <div className="profile-value">{user?.email || '—'}</div>
            </div>
            <div className="profile-field">
              <label className="profile-label">Account created</label>
              <div className="profile-value">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
              </div>
            </div>
            <div className="profile-field">
              <label className="profile-label">Auth provider</label>
              <div className="profile-value">Google OAuth</div>
            </div>
            <button className="profile-logout-btn" onClick={logout}>Logout</button>
          </div>
        </div>
      )}

      {/* Starfield script */}
      <script dangerouslySetInnerHTML={{ __html: `
        (function() {
          const canvas = document.getElementById('stars');
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          let stars = [];
          function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
          function init() {
            stars = [];
            const n = Math.floor((canvas.width * canvas.height) / 2800);
            for (let i = 0; i < n; i++) {
              stars.push({
                x: Math.random() * canvas.width, y: Math.random() * canvas.height,
                r: Math.random() * 1.1 + 0.2, a: Math.random() * 0.6 + 0.15,
                ts: Math.random() * 0.006 + 0.001, td: Math.random() > 0.5 ? 1 : -1
              });
            }
          }
          function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (const s of stars) {
              s.a += s.ts * s.td;
              if (s.a > 0.85 || s.a < 0.1) s.td *= -1;
              ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
              ctx.fillStyle = 'rgba(255,255,255,'+s.a+')'; ctx.fill();
            }
            requestAnimationFrame(draw);
          }
          resize(); init(); draw();
          window.addEventListener('resize', () => { resize(); init(); });
        })();
      `}} />

      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; }
        html, body { height:100%; }

        .chat-root {
          display: flex;
          height: 100vh;
          width: 100%;
          background: #04040a;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          overflow: hidden;
          position: relative;
        }

        .stars-canvas {
          position: fixed; inset: 0;
          width: 100%; height: 100%;
          pointer-events: none; z-index: 0;
        }

        .neb { position:fixed; border-radius:50%; filter:blur(140px); pointer-events:none; z-index:0; }
        .neb-1 { width:500px;height:500px; background:radial-gradient(circle,rgba(99,102,241,0.05) 0%,transparent 70%); top:-100px;left:-80px; }
        .neb-2 { width:500px;height:500px; background:radial-gradient(circle,rgba(139,92,246,0.04) 0%,transparent 70%); bottom:-100px;right:-80px; }

        /* ── SIDEBAR ── */
        .sidebar {
          position: relative; z-index: 10;
          width: 260px; min-width: 260px;
          background: rgba(10,10,18,0.95);
          border-right: 1px solid rgba(99,102,241,0.15);
          display: flex; flex-direction: column;
          padding: 0;
          backdrop-filter: blur(20px);
        }

        .sidebar-brand {
          display: flex; align-items: center; gap: 10px;
          padding: 20px 18px 16px;
          border-bottom: 1px solid rgba(99,102,241,0.1);
        }
        .sidebar-title {
          font-size: 18px; font-weight: 700; color: #fff;
          letter-spacing: -0.3px;
        }

        .new-conv-btn {
          margin: 14px 14px 8px;
          padding: 10px 16px;
          background: rgba(99,102,241,0.12);
          border: 1px solid rgba(99,102,241,0.25);
          border-radius: 10px;
          color: #a5b4fc;
          font-size: 14px; font-weight: 500;
          cursor: pointer;
          display: flex; align-items: center; gap: 8px;
          transition: all 0.2s;
        }
        .new-conv-btn:hover { background: rgba(99,102,241,0.2); color: #fff; }

        .conv-list-header {
          padding: 12px 18px 6px;
          font-size: 11px; font-weight: 600;
          color: #334155; letter-spacing: 0.8px; text-transform: uppercase;
        }

        .conv-list {
          flex: 1; overflow-y: auto; padding: 4px 8px;
          scrollbar-width: thin; scrollbar-color: rgba(99,102,241,0.2) transparent;
        }

        .conv-empty {
          font-size: 13px; color: #334155;
          padding: 20px 10px; text-align: center; line-height: 1.6;
        }

        .conv-item {
          display: flex; align-items: center; gap: 8px;
          padding: 9px 10px; border-radius: 8px;
          cursor: pointer; transition: all 0.15s;
          border: 1px solid transparent;
          margin-bottom: 2px;
        }
        .conv-item:hover { background: rgba(99,102,241,0.08); border-color: rgba(99,102,241,0.1); }
        .conv-item-active { background: rgba(99,102,241,0.14) !important; border-color: rgba(99,102,241,0.25) !important; }

        .conv-item-icon { font-size: 13px; flex-shrink: 0; opacity: 0.6; }
        .conv-item-text {
          flex: 1; font-size: 13px; color: #94a3b8;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .conv-item-active .conv-item-text { color: #c7d2fe; }

        .conv-delete-btn {
          flex-shrink: 0; background: none; border: none;
          color: #475569; font-size: 13px;
          cursor: pointer; padding: 2px 4px; border-radius: 4px;
          opacity: 0; transition: all 0.15s;
        }
        .conv-item:hover .conv-delete-btn { opacity: 1; }
        .conv-delete-btn:hover { color: #ef4444; background: rgba(239,68,68,0.1); }
        .conv-delete-btn.deleting { opacity: 1; color: #94a3b8; }

        .sidebar-user {
          border-top: 1px solid rgba(99,102,241,0.1);
          padding: 14px 16px;
          display: flex; align-items: center; gap: 10px;
        }
        .sidebar-user-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; color: white; flex-shrink: 0;
        }
        .sidebar-user-email {
          font-size: 12px; color: #475569;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* ── MAIN AREA ── */
        .main-area {
          flex: 1; display: flex; flex-direction: column;
          position: relative; z-index: 10; overflow: hidden;
        }

        .topbar {
          padding: 14px 20px;
          border-bottom: 1px solid rgba(99,102,241,0.1);
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(4,4,10,0.7); backdrop-filter: blur(10px);
        }
        .topbar-left { display: flex; align-items: center; gap: 10px; }
        .topbar-dots { display: flex; gap: 6px; }
        .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
        .dot-openai { background: #10b981; }
        .dot-gemini { background: #6366f1; }
        .dot-perplexity { background: #f59e0b; }
        .dot-openrouter { background: #8b5cf6; }
        .topbar-label { font-size: 12px; color: #475569; }

        /* Settings gear */
        .settings-wrap { position: relative; }
        .settings-btn {
          background: none; border: 1px solid rgba(99,102,241,0.2);
          border-radius: 8px; padding: 7px; cursor: pointer;
          color: #64748b; transition: all 0.2s;
          display: flex; align-items: center;
        }
        .settings-btn:hover { color: #a5b4fc; border-color: rgba(99,102,241,0.4); background: rgba(99,102,241,0.08); }

        .settings-dropdown {
          position: absolute; top: calc(100% + 8px); right: 0;
          background: #0d0d18; border: 1px solid rgba(99,102,241,0.2);
          border-radius: 10px; min-width: 160px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.6);
          overflow: hidden; z-index: 100;
        }
        .dropdown-item {
          width: 100%; padding: 11px 16px; background: none; border: none;
          color: #94a3b8; font-size: 14px; cursor: pointer;
          text-align: left; transition: background 0.15s;
          display: flex; align-items: center; gap: 8px;
        }
        .dropdown-item:hover { background: rgba(99,102,241,0.1); color: #fff; }
        .dropdown-logout { color: #f87171; }
        .dropdown-logout:hover { background: rgba(239,68,68,0.1); color: #fca5a5; }
        .dropdown-divider { height: 1px; background: rgba(99,102,241,0.1); }

        /* ── MESSAGES ── */
        .messages-area {
          flex: 1; overflow-y: auto; padding: 24px 20px;
          display: flex; flex-direction: column; gap: 20px;
          scrollbar-width: thin; scrollbar-color: rgba(99,102,241,0.2) transparent;
        }

        .empty-state {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 12px;
          padding: 60px 20px;
        }
        .empty-logo { opacity: 0.8; }
        .empty-title { font-size: 26px; font-weight: 700; color: #fff; }
        .empty-sub { font-size: 14px; color: #475569; }
        .example-chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 8px; }
        .chip {
          padding: 8px 14px; background: rgba(99,102,241,0.08);
          border: 1px solid rgba(99,102,241,0.2); border-radius: 20px;
          color: #818cf8; font-size: 13px; cursor: pointer; transition: all 0.2s;
        }
        .chip:hover { background: rgba(99,102,241,0.16); color: #a5b4fc; }

        .msg-row { display: flex; }
        .msg-user { justify-content: flex-end; }
        .msg-ai { justify-content: flex-start; }

        .bubble-user {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: white; padding: 12px 18px; border-radius: 18px 18px 4px 18px;
          max-width: 70%; font-size: 15px; line-height: 1.6;
          box-shadow: 0 4px 20px rgba(99,102,241,0.3);
        }

        .bubble-ai {
          background: rgba(13,13,24,0.9);
          border: 1px solid rgba(99,102,241,0.15);
          border-radius: 18px 18px 18px 4px;
          max-width: 80%; padding: 16px 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .bubble-ai-answer { font-size: 15px; color: #e2e8f0; line-height: 1.7; white-space: pre-wrap; }

        .consensus-meta {
          margin-top: 14px; padding-top: 12px;
          border-top: 1px solid rgba(99,102,241,0.1);
        }
        .consensus-score-row {
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 8px;
        }
        .consensus-label { font-size: 11px; color: #475569; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .consensus-score { font-size: 18px; font-weight: 700; }
        .consensus-badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; }
        .consensus-time { font-size: 11px; color: #334155; margin-left: auto; }

        .provider-dots { display: flex; gap: 12px; flex-wrap: wrap; }
        .provider-dot-item { display: flex; align-items: center; gap: 5px; }
        .pdot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
        .pdot-openai { background: #10b981; }
        .pdot-gemini { background: #6366f1; }
        .pdot-perplexity { background: #f59e0b; }
        .pdot-openrouter { background: #8b5cf6; }
        .pdot-name { font-size: 11px; color: #475569; }

        /* Loading */
        .bubble-loading { display: flex; flex-direction: column; gap: 10px; }
        .loading-dots { display: flex; gap: 5px; align-items: center; }
        .loading-dots span {
          width: 6px; height: 6px; border-radius: 50%; background: #6366f1;
          animation: pulse 1.2s ease-in-out infinite;
        }
        .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
        .loading-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes pulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }
        .loading-phase { font-size: 12px; color: #475569; }

        /* ── INPUT ── */
        .input-area {
          padding: 16px 20px 20px;
          border-top: 1px solid rgba(99,102,241,0.1);
          background: rgba(4,4,10,0.8); backdrop-filter: blur(10px);
        }
        .input-wrap {
          display: flex; align-items: flex-end; gap: 10px;
          background: rgba(13,13,24,0.9);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 14px; padding: 10px 12px;
          transition: border-color 0.2s;
        }
        .input-wrap:focus-within { border-color: rgba(99,102,241,0.5); }
        .input-box {
          flex: 1; background: none; border: none; outline: none;
          color: #e2e8f0; font-size: 15px; line-height: 1.6;
          resize: none; max-height: 120px;
          font-family: inherit;
        }
        .input-box::placeholder { color: #334155; }
        .input-box:disabled { opacity: 0.5; }
        .send-btn {
          flex-shrink: 0; width: 36px; height: 36px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          border: none; border-radius: 9px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: white; transition: all 0.2s;
        }
        .send-btn:hover:not(:disabled) { transform: scale(1.05); box-shadow: 0 4px 12px rgba(99,102,241,0.4); }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .input-hint { font-size: 11px; color: #1e293b; margin-top: 6px; text-align: center; }

        /* ── PROFILE MODAL ── */
        .modal-overlay {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
        }
        .modal-card {
          background: #0d0d18; border: 1px solid rgba(99,102,241,0.25);
          border-radius: 20px; padding: 32px; width: 100%; max-width: 380px;
          display: flex; flex-direction: column; gap: 20px;
          box-shadow: 0 40px 80px rgba(0,0,0,0.7);
        }
        .modal-header { display: flex; align-items: center; justify-content: space-between; }
        .modal-title { font-size: 20px; font-weight: 700; color: #fff; }
        .modal-close { background: none; border: none; color: #475569; font-size: 18px; cursor: pointer; }
        .modal-close:hover { color: #fff; }
        .profile-avatar-big {
          width: 72px; height: 72px; border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex; align-items: center; justify-content: center;
          font-size: 28px; font-weight: 700; color: white; margin: 0 auto;
          box-shadow: 0 0 30px rgba(99,102,241,0.3);
        }
        .profile-field { display: flex; flex-direction: column; gap: 4px; }
        .profile-label { font-size: 11px; color: #475569; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .profile-value {
          font-size: 14px; color: #e2e8f0;
          background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.15);
          border-radius: 8px; padding: 10px 14px;
        }
        .profile-logout-btn {
          width: 100%; padding: 12px; background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.2); border-radius: 10px;
          color: #f87171; font-size: 14px; font-weight: 600; cursor: pointer;
          transition: all 0.2s;
        }
        .profile-logout-btn:hover { background: rgba(239,68,68,0.2); color: #fca5a5; }
      `}</style>
    </div>
  );
}
