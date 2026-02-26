"use client";
const PROVIDERS = [
  { id: "openai", label: "OpenAI", color: "#10a37f" },
  { id: "gemini", label: "Gemini", color: "#4285f4" },
  { id: "perplexity", label: "Perplexity", color: "#20b2aa" },
  { id: "openrouter", label: "OpenRouter", color: "#9b59b6" },
];
export default function LoadingConsensus({ phase }: { phase: string }) {
  return (
    <div style={{ background:"#111", border:"1px solid #1e1e1e", borderRadius:"14px", padding:"1.5rem" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"1.5rem" }}>
        <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:"#c8b89a", animation:"pulse 1s ease-in-out infinite" }} />
        <span style={{ color:"#888880", fontSize:"0.8rem" }}>{phase}</span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
        {PROVIDERS.map((p, i) => (
          <div key={p.id} style={{ background:"#0d0d0d", border:`1px solid ${p.color}22`, borderRadius:"10px", padding:"0.875rem" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"10px" }}>
              <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:p.color, animation:`pulse 1.5s ease-in-out infinite`, animationDelay:`${i*0.2}s` }} />
              <span style={{ color:p.color, fontSize:"0.75rem" }}>{p.label}</span>
            </div>
            {[100,80,60].map((w,j) => (
              <div key={j} style={{ height:"6px", width:`${w}%`, borderRadius:"3px", background:"#1e1e1e", marginBottom:"5px",
                backgroundImage:"linear-gradient(90deg,#1e1e1e 25%,#2a2a2a 50%,#1e1e1e 75%)",
                backgroundSize:"200% 100%", animation:`shimmer 1.5s infinite`, animationDelay:`${j*0.2}s` }} />
            ))}
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}`}</style>
    </div>
  );
}
