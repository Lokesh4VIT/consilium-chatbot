"use client";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/db/supabase";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const supabase = createSupabaseBrowserClient();

  const handleLogin = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", display:"flex", alignItems:"center", justifyContent:"center", padding:"2rem" }}>
      <div style={{ width:"100%", maxWidth:"400px", background:"#111", border:"1px solid #222", borderRadius:"16px", padding:"2.5rem", textAlign:"center" }}>
        <div style={{ fontFamily:"DM Serif Display,serif", fontSize:"1.75rem", color:"#e8e4df", marginBottom:"0.5rem" }}>Consilium</div>
        <p style={{ color:"#888880", fontSize:"0.875rem", marginBottom:"2rem" }}>4 AI systems. One verified answer.</p>

        <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginBottom:"2rem" }}>
          {[{c:"#10a37f",l:"OpenAI GPT-4o"},{c:"#4285f4",l:"Google Gemini"},{c:"#20b2aa",l:"Perplexity AI"},{c:"#9b59b6",l:"OpenRouter"}].map(({c,l}) => (
            <div key={l} style={{ display:"flex", alignItems:"center", gap:"10px", padding:"8px 12px", background:"#0d0d0d", borderRadius:"8px", border:"1px solid #1a1a1a" }}>
              <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:c }} />
              <span style={{ color:"#888880", fontSize:"0.8rem" }}>{l}</span>
            </div>
          ))}
        </div>

        <button onClick={handleLogin} disabled={loading} style={{ width:"100%", padding:"0.875rem", background:loading?"#1a1a1a":"#e8e4df", color:"#0a0a0a", border:"none", borderRadius:"10px", fontSize:"0.875rem", fontWeight:"500", cursor:loading?"not-allowed":"pointer", fontFamily:"DM Sans,sans-serif" }}>
          {loading ? "Connecting..." : "Continue with Google"}
        </button>
        <p style={{ color:"#444", fontSize:"0.72rem", marginTop:"1rem" }}>Free: 20 queries/day</p>
      </div>
    </div>
  );
}
