"use client";
import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/db/supabase";

export default function Sidebar({ isOpen, onToggle, onNewChat, onLoadConversation, currentConversationId }: any) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    fetch("/api/history").then(r => r.json()).then(d => { if (d.success) setConversations(d.conversations || []); });
  }, []);

  if (!isOpen) return null;

  return (
    <div style={{ width:"260px", flexShrink:0, height:"100vh", background:"#0d0d0d", borderRight:"1px solid #1a1a1a", display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"1rem", borderBottom:"1px solid #1a1a1a", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontFamily:"DM Serif Display,serif", fontSize:"1rem", color:"#c8b89a" }}>Consilium</span>
        <button onClick={onToggle} style={{ background:"none", border:"none", cursor:"pointer", color:"#555" }}>âœ•</button>
      </div>
      <div style={{ padding:"0.75rem" }}>
        <button onClick={onNewChat} style={{ width:"100%", padding:"0.625rem", background:"none", border:"1px solid #2a2a2a", borderRadius:"8px", color:"#888880", fontSize:"0.8rem", cursor:"pointer", fontFamily:"DM Sans,sans-serif" }}>
          + New conversation
        </button>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"0.25rem 0.75rem" }}>
        {conversations.map((c: any) => (
          <div key={c.id} onClick={() => onLoadConversation(c.id)}
            style={{ padding:"0.625rem 0.75rem", borderRadius:"7px", cursor:"pointer", background:c.id===currentConversationId?"#1a1a1a":"transparent", marginBottom:"2px" }}>
            <p style={{ color:c.id===currentConversationId?"#e8e4df":"#888880", fontSize:"0.78rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.title}</p>
          </div>
        ))}
      </div>
      {user && (
        <div style={{ padding:"0.75rem", borderTop:"1px solid #1a1a1a", display:"flex", alignItems:"center", gap:"10px" }}>
          <div style={{ width:"28px", height:"28px", borderRadius:"50%", background:"#2a2a2a", display:"flex", alignItems:"center", justifyContent:"center", color:"#888", fontSize:"0.7rem" }}>
            {user.email?.[0]?.toUpperCase()}
          </div>
          <span style={{ color:"#888880", fontSize:"0.75rem", flex:1, overflow:"hidden", textOverflow:"ellipsis" }}>{user.email}</span>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}
            style={{ background:"none", border:"none", cursor:"pointer", color:"#444", fontSize:"0.7rem" }}>Out</button>
        </div>
      )}
    </div>
  );
}
