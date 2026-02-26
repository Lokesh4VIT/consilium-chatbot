# ============================================================
# Consilium - Complete Project Setup Script
# Run this from inside C:\Users\HP\Downloads\files
# ============================================================

Write-Host "Setting up Consilium project..." -ForegroundColor Cyan

# STEP 1: Create all directories
Write-Host "`n[1/5] Creating folder structure..." -ForegroundColor Yellow
$dirs = @(
    "src\app\api\consensus",
    "src\app\api\history",
    "src\app\auth\callback",
    "src\app\chat",
    "src\app\login",
    "src\components\chat",
    "src\components\consensus",
    "src\lib\ai",
    "src\lib\db",
    "src\lib\utils",
    "src\types",
    "supabase\migrations",
    ".vscode"
)
foreach ($d in $dirs) {
    New-Item -ItemType Directory -Force -Path $d | Out-Null
}
Write-Host "  Folders created." -ForegroundColor Green

# STEP 2: Move loose files to correct locations
Write-Host "`n[2/5] Moving files to correct locations..." -ForegroundColor Yellow
$moves = @{
    "consensus-engine.ts"  = "src\lib\ai\consensus-engine.ts"
    "providers.ts"         = "src\lib\ai\providers.ts"
    "ConsensusResult.tsx"  = "src\components\consensus\ConsensusResult.tsx"
    "index.ts"             = "src\types\index.ts"
    "route.ts"             = "src\app\api\consensus\route.ts"
    "001_schema.sql"       = "supabase\migrations\001_schema.sql"
}
foreach ($src in $moves.Keys) {
    if (Test-Path $src) {
        Move-Item -Force $src $moves[$src]
        Write-Host "  Moved $src -> $($moves[$src])" -ForegroundColor Green
    }
}

# page.tsx - move to chat (if not already there)
if ((Test-Path "page.tsx") -and -not (Test-Path "src\app\chat\page.tsx")) {
    Move-Item -Force "page.tsx" "src\app\chat\page.tsx"
    Write-Host "  Moved page.tsx -> src\app\chat\page.tsx" -ForegroundColor Green
}

# Remove broken next.js file
if (Test-Path "next.js") { Remove-Item -Force "next.js" }

# STEP 3: Create config files
Write-Host "`n[3/5] Creating config files..." -ForegroundColor Yellow

# package.json
@'
{
  "name": "consilium",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.5",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@supabase/supabase-js": "^2.43.0",
    "@supabase/ssr": "^0.3.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "openai": "^4.52.0",
    "@google/generative-ai": "^0.15.0",
    "zod": "^3.23.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.400.0",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@types/uuid": "^10",
    "typescript": "^5"
  }
}
'@ | Set-Content "package.json" -Encoding UTF8

# next.config.js
@'
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};
module.exports = nextConfig;
'@ | Set-Content "next.config.js" -Encoding UTF8

# tailwind.config.js
@'
/** @type {import("tailwindcss").Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
'@ | Set-Content "tailwind.config.js" -Encoding UTF8

# postcss.config.js
@'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
'@ | Set-Content "postcss.config.js" -Encoding UTF8

# tsconfig.json
@'
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
'@ | Set-Content "tsconfig.json" -Encoding UTF8

# .gitignore
@'
/node_modules
/.next/
.env.local
.env
.DS_Store
'@ | Set-Content ".gitignore" -Encoding UTF8

Write-Host "  Config files created." -ForegroundColor Green

# STEP 4: Create all missing source files
Write-Host "`n[4/5] Creating missing source files..." -ForegroundColor Yellow

# src/app/globals.css
@'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #0a0a0a;
  --surface: #111111;
  --surface-2: #1a1a1a;
  --border: #2a2a2a;
  --text: #e8e4df;
  --text-muted: #888880;
  --accent: #c8b89a;
  --openai: #10a37f;
  --gemini: #4285f4;
  --perplexity: #20b2aa;
  --openrouter: #9b59b6;
  --agree: #4caf84;
  --partial: #f0a444;
  --disagree: #e05555;
}
* { box-sizing: border-box; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: "DM Sans", sans-serif;
  font-weight: 300;
}
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-in { animation: fadeIn 0.3s ease forwards; }
@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}
'@ | Set-Content "src\app\globals.css" -Encoding UTF8

# src/app/layout.tsx
@'
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Consilium - Multi-AI Consensus",
  description: "Cross-verify answers across 4 AI systems",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
'@ | Set-Content "src\app\layout.tsx" -Encoding UTF8

# src/app/page.tsx (root redirect)
@'
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/db/supabase";

export default async function RootPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/chat");
  else redirect("/login");
}
'@ | Set-Content "src\app\page.tsx" -Encoding UTF8

# src/app/login/page.tsx
@'
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
'@ | Set-Content "src\app\login\page.tsx" -Encoding UTF8

# src/app/auth/callback/route.ts
@'
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/db/supabase";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/chat`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
'@ | Set-Content "src\app\auth\callback\route.ts" -Encoding UTF8

# src/app/api/history/route.ts
@'
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/db/supabase";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const conversationId = url.searchParams.get("conversationId");

  if (conversationId) {
    const { data: messages } = await supabase
      .from("messages")
      .select("*, consensus_results(*), ai_responses(*), ai_critiques(*)")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    return NextResponse.json({ success: true, messages });
  }

  const { data: conversations } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);
  return NextResponse.json({ success: true, conversations });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await supabase.from("conversations").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ success: true });
}
'@ | Set-Content "src\app\api\history\route.ts" -Encoding UTF8

# src/lib/db/supabase.ts
@'
import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    }
  );
}

export function createSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
'@ | Set-Content "src\lib\db\supabase.ts" -Encoding UTF8

# src/lib/utils/rate-limit.ts
@'
import { createSupabaseServiceClient } from "@/lib/db/supabase";

export async function checkRateLimit(userId: string, plan: string) {
  const supabase = createSupabaseServiceClient();
  const today = new Date().toISOString().split("T")[0];
  const limit = plan === "pro" ? 200 : 20;
  const { data } = await supabase
    .from("usage_tracking")
    .select("message_id")
    .eq("user_id", userId)
    .eq("date", today)
    .not("message_id", "is", null);
  const used = new Set(data?.map((r: any) => r.message_id) || []).size;
  return { allowed: used < limit, remaining: Math.max(0, limit - used), limit };
}
'@ | Set-Content "src\lib\utils\rate-limit.ts" -Encoding UTF8

# src/middleware.ts
@'
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  const isProtected = ["/chat", "/api/consensus", "/api/history"].some(p => pathname.startsWith(p));
  if (isProtected && !user) return NextResponse.redirect(new URL("/login", request.url));
  if (pathname === "/login" && user) return NextResponse.redirect(new URL("/chat", request.url));
  return response;
}

export const config = {
  matcher: ["/chat", "/api/consensus/:path*", "/api/history/:path*", "/login"],
};
'@ | Set-Content "src\middleware.ts" -Encoding UTF8

# src/components/consensus/LoadingConsensus.tsx
@'
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
'@ | Set-Content "src\components\consensus\LoadingConsensus.tsx" -Encoding UTF8

# src/components/chat/ChatInput.tsx
@'
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
      <p style={{ textAlign:"center", color:"#333", fontSize:"0.7rem", marginTop:"0.5rem" }}>Enter to send · Shift+Enter for new line</p>
    </div>
  );
}
'@ | Set-Content "src\components\chat\ChatInput.tsx" -Encoding UTF8

# src/components/chat/Sidebar.tsx
@'
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
        <button onClick={onToggle} style={{ background:"none", border:"none", cursor:"pointer", color:"#555" }}>✕</button>
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
'@ | Set-Content "src\components\chat\Sidebar.tsx" -Encoding UTF8

Write-Host "  Source files created." -ForegroundColor Green

# STEP 5: Install dependencies
Write-Host "`n[5/5] Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  Setup complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Make sure .env.local has your API keys" -ForegroundColor Yellow
Write-Host "  2. Run: npm run dev" -ForegroundColor Yellow
Write-Host "  3. Open: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
