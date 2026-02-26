"use client";
import { useState, useRef, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/db/supabase";

export default function ChatPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<any[]>([]);
  const [convId, setConvId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    fetch("/api/history").then(r => r.json()).then(d => {
      if (d.success) setConversations(d.conversations || []);
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;
    const prompt = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: prompt }]);
    setLoading(true);

    const phases = [
      "Gathering responses from 4 AI systems...",
      "Running cross-verification...",
      "Computing consensus score...",
      "Synthesizing final answer...",
    ];
    let i = 0;
    setPhase(phases[0]);
    const t = setInterval(() => { i = Math.min(i + 1, phases.length - 1); setPhase(phases[i]); }, 4000);

    try {
      const res = await fetch("/api/consensus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, conversationId: convId }),
      });
      const data = await res.json();
      clearInterval(t);
      if (!data.success) throw new Error(data.error || "Failed");
      if (data.data?.conversationId) setConvId(data.data.conversationId);
      setMessages(prev => [...prev, { role: "assistant", content: data.data?.consensus?.finalAnswer || data.data?.consensus?.final_answer || "No answer", consensusData: data.data }]);
    } catch (err: any) {
      clearInterval(t);
      setMessages(prev => [...prev, { role: "assistant", content: "Error: " + err.message }]);
    } finally {
      setLoading(false);
      setPhase("");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const newChat = () => { setMessages([]); setConvId(null); };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0a0a0a", fontFamily: "DM Sans, sans-serif" }}>

      {/* Sidebar */}
      {sidebarOpen && (
        <div style={{ width: "260px", flexShrink: 0, background: "#0d0d0d", borderRight: "1px solid #1a1a1a", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "1rem", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", color: "#c8b89a" }}>Consilium</span>
            <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "1rem" }}>✕</button>
          </div>
          <div style={{ padding: "0.75rem" }}>
            <button onClick={newChat} style={{ width: "100%", padding: "0.6rem", background: "none", border: "1px solid #2a2a2a", borderRadius: "8px", color: "#888", fontSize: "0.8rem", cursor: "pointer" }}>
              + New conversation
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0 0.75rem" }}>
            {conversations.map((c: any) => (
              <div key={c.id} style={{ padding: "0.6rem 0.75rem", borderRadius: "7px", cursor: "pointer", color: "#888", fontSize: "0.78rem", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                onClick={() => setConvId(c.id)}>
                {c.title}
              </div>
            ))}
          </div>
          {user && (
            <div style={{ padding: "0.75rem", borderTop: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: "0.75rem", flexShrink: 0 }}>
                {user.email?.[0]?.toUpperCase()}
              </div>
              <span style={{ color: "#666", fontSize: "0.72rem", flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</span>
              <button onClick={handleLogout} style={{ background: "none", border: "1px solid #2a2a2a", borderRadius: "5px", color: "#555", fontSize: "0.65rem", cursor: "pointer", padding: "2px 8px" }}>Out</button>
            </div>
          )}
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "0.875rem 1.5rem", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: "1rem" }}>
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "1.1rem" }}>☰</button>
          )}
          <span style={{ fontFamily: "Georgia, serif", color: "#e8e4df", fontSize: "1rem" }}>Consilium</span>
          <div style={{ display: "flex", gap: "4px" }}>
            {["#10a37f","#4285f4","#20b2aa","#9b59b6"].map(c => (
              <div key={c} style={{ width: "6px", height: "6px", borderRadius: "50%", background: c }} />
            ))}
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "860px", margin: "0 auto", width: "100%" }}>

          {messages.length === 0 && !loading && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2rem", paddingTop: "4rem" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "Georgia, serif", fontSize: "2rem", color: "#e8e4df", marginBottom: "0.5rem" }}>Ask anything.</div>
                <p style={{ color: "#555", fontSize: "0.875rem" }}>4 AI systems independently answer, critique each other, and reach consensus.</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", width: "100%", maxWidth: "580px" }}>
                {["What causes inflation?", "Explain quantum entanglement", "Pros and cons of nuclear energy", "How does CRISPR work?"].map(q => (
                  <button key={q} onClick={() => { setInput(q); }} style={{ padding: "0.875rem", background: "#111", border: "1px solid #222", borderRadius: "10px", color: "#888", fontSize: "0.8rem", cursor: "pointer", textAlign: "left" }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i}>
              {msg.role === "user" ? (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ maxWidth: "70%", padding: "0.875rem 1.125rem", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "14px 14px 4px 14px", color: "#e8e4df", fontSize: "0.9rem", lineHeight: 1.6 }}>
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "14px", overflow: "hidden" }}>
                  {msg.consensusData && (
                    <ConsensusHeader data={msg.consensusData} />
                  )}
                  <div style={{ padding: "1.25rem", color: "#e8e4df", fontSize: "0.9rem", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
                    {msg.content}
                  </div>
                  {msg.consensusData && (
                    <ConsensusDetails data={msg.consensusData} />
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "14px", padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1.25rem" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#c8b89a" }} />
                <span style={{ color: "#888", fontSize: "0.8rem" }}>{phase}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {[{l:"OpenAI",c:"#10a37f"},{l:"Gemini",c:"#4285f4"},{l:"Perplexity",c:"#20b2aa"},{l:"OpenRouter",c:"#9b59b6"}].map(p => (
                  <div key={p.l} style={{ background: "#0d0d0d", border: `1px solid ${p.c}22`, borderRadius: "10px", padding: "0.875rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: p.c }} />
                      <span style={{ color: p.c, fontSize: "0.75rem" }}>{p.l}</span>
                    </div>
                    {[100,75,50].map((w,j) => (
                      <div key={j} style={{ height: "5px", width: `${w}%`, background: "#1e1e1e", borderRadius: "3px", marginBottom: "4px" }} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "1rem 1.5rem 1.5rem", background: "#0a0a0a", borderTop: "1px solid #1a1a1a", maxWidth: "860px", margin: "0 auto", width: "100%" }}>
          <div style={{ display: "flex", gap: "10px", background: "#111", border: "1px solid #2a2a2a", borderRadius: "14px", padding: "10px 10px 10px 16px", alignItems: "flex-end" }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              disabled={loading}
              placeholder="Ask anything to verify across 4 AI systems..."
              rows={1}
              style={{ flex: 1, background: "none", border: "none", outline: "none", resize: "none", color: "#e8e4df", fontSize: "0.9rem", fontFamily: "DM Sans, sans-serif", lineHeight: 1.6, minHeight: "24px", maxHeight: "160px" }}
            />
            <button onClick={handleSubmit} disabled={!input.trim() || loading}
              style={{ width: "36px", height: "36px", background: (!input.trim() || loading) ? "#1e1e1e" : "#c8b89a", border: "none", borderRadius: "9px", cursor: (!input.trim() || loading) ? "not-allowed" : "pointer", color: (!input.trim() || loading) ? "#555" : "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              ➤
            </button>
          </div>
          <p style={{ textAlign: "center", color: "#333", fontSize: "0.68rem", marginTop: "0.4rem" }}>Enter to send · Shift+Enter for new line · Verified by 4 AI providers</p>
        </div>
      </div>
    </div>
  );
}

function ConsensusHeader({ data }: { data: any }) {
  const score = data?.consensus?.confidenceScore ?? data?.consensus?.confidence_score ?? 0;
  const label = data?.consensus?.confidenceLabel ?? data?.consensus?.confidence_label ?? "";
  const color = score === 100 ? "#4caf84" : score >= 75 ? "#a8d94c" : score >= 50 ? "#f0a444" : "#e05555";
  return (
    <div style={{ padding: "0.875rem 1.25rem", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: "1rem" }}>
      <span style={{ fontSize: "0.65rem", color: "#444", textTransform: "uppercase", letterSpacing: "0.08em" }}>Consensus</span>
      <div style={{ flex: 1, height: "3px", background: "#1e1e1e", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, background: color, transition: "width 1s ease" }} />
      </div>
      <span style={{ color, fontSize: "0.8rem", fontFamily: "monospace", fontWeight: 500 }}>{score}%</span>
      <span style={{ color: "#444", fontSize: "0.65rem", padding: "1px 7px", background: "#1a1a1a", borderRadius: "10px" }}>{label}</span>
      <div style={{ display: "flex", gap: "4px" }}>
        {["#10a37f","#4285f4","#20b2aa","#9b59b6"].map(c => (
          <div key={c} style={{ width: "6px", height: "6px", borderRadius: "50%", background: c }} />
        ))}
      </div>
    </div>
  );
}

function ConsensusDetails({ data }: { data: any }) {
  const [open, setOpen] = useState(false);
  const responses = data?.initialResponses || [];
  const cost = data?.consensus?.totalCostUsd ?? data?.consensus?.total_cost_usd ?? 0;
  const ms = data?.consensus?.processingTimeMs ?? data?.consensus?.processing_time_ms ?? 0;

  return (
    <div style={{ borderTop: "1px solid #1a1a1a" }}>
      <div style={{ padding: "0.5rem 1.25rem", display: "flex", gap: "1.5rem" }}>
        <span style={{ color: "#444", fontSize: "0.68rem" }}>⏱ {(ms/1000).toFixed(1)}s</span>
        <span style={{ color: "#444", fontSize: "0.68rem" }}>💰 ${cost.toFixed(4)}</span>
        <span style={{ color: "#444", fontSize: "0.68rem" }}>🤖 {responses.filter((r:any) => r.status === "success" || r.content).length}/4 providers</span>
      </div>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", padding: "0.5rem 1.25rem", background: "none", border: "none", borderTop: "1px solid #111", color: "#555", fontSize: "0.75rem", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between" }}>
        <span>Individual AI responses</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && responses.map((r: any, i: number) => {
        const colors: any = { openai:"#10a37f", gemini:"#4285f4", perplexity:"#20b2aa", openrouter:"#9b59b6" };
        const c = colors[r.provider] || "#888";
        return (
          <div key={i} style={{ padding: "0.875rem 1.25rem", borderTop: "1px solid #111", background: "#0d0d0d" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: c }} />
              <span style={{ color: c, fontSize: "0.75rem", fontWeight: 500 }}>{r.provider?.toUpperCase()}</span>
              <span style={{ color: "#333", fontSize: "0.65rem", marginLeft: "auto" }}>{r.latencyMs}ms · ${r.costUsd?.toFixed(5)}</span>
            </div>
            <p style={{ color: "#888", fontSize: "0.8rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{r.content || r.error || "No response"}</p>
          </div>
        );
      })}
    </div>
  );
}