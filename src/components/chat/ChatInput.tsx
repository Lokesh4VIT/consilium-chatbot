"use client";
import { useState, useRef, useEffect } from "react";

export default function ChatInput({ onSubmit, isLoading }: { onSubmit: (p: string) => void; isLoading: boolean }) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = Math.min(ref.current.scrollHeight, 200) + "px";
    }
  }, [value]);

  const submit = () => {
    if (!value.trim() || isLoading) return;
    onSubmit(value.trim());
    setValue("");
    if (ref.current) ref.current.style.height = "auto";
  };

  return (
    <div style={{ padding:"1rem 2rem 1.5rem", background:"#0a0a0a", borderTop:"1px solid #1a1a1a", maxWidth:"900px", margin:"0 auto", width:"100%" }}>
      <div style={{ display:"flex", alignItems:"flex-end", gap:"10px", background:"#111", border:"1px solid #2a2a2a", borderRadius:"14px", padding:"12px 12px 12px 16px" }}>
        <textarea ref={ref} value={value} onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          disabled={isLoading}
          placeholder="Ask anything to verify across 4 AI systems..."
          rows={1}
          style={{ flex:1, background:"none", border:"none", outline:"none", resize:"none", color:"#e8e4df", fontSize:"0.9rem", lineHeight:1.6, fontFamily:"DM Sans,sans-serif", minHeight:"24px", maxHeight:"200px" }}
        />
        <button onClick={submit} disabled={!value.trim() || isLoading}
          style={{ width:"36px", height:"36px", flexShrink:0, background:(!value.trim()||isLoading)?"#1e1e1e":"#c8b89a", border:"none", borderRadius:"9px", cursor:(!value.trim()||isLoading)?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:(!value.trim()||isLoading)?"#555":"#0a0a0a" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
      <p style={{ textAlign:"center", color:"#333", fontSize:"0.7rem", marginTop:"0.5rem" }}>Enter to send Â· Shift+Enter for new line</p>
    </div>
  );
}
