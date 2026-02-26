'use client';

import { createSupabaseBrowserClient } from '@/lib/db/supabase';

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient();

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="login-root">
      {/* Starfield canvas */}
      <canvas id="starfield" className="starfield-canvas" />

      {/* Nebula blobs — subtle, dark */}
      <div className="nebula nebula-1" />
      <div className="nebula nebula-2" />
      <div className="nebula nebula-3" />

      {/* Login card */}
      <div className="login-card">
        {/* Logo + Title */}
        <div className="login-brand">
          <div className="login-logo">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="52" height="52">
              <circle cx="50" cy="50" r="48" fill="#0a0a0f" stroke="#6366f1" strokeWidth="2"/>
              {/* Stars inside logo circle */}
              <circle cx="20" cy="25" r="0.8" fill="white" opacity="0.9"/>
              <circle cx="75" cy="18" r="0.6" fill="white" opacity="0.7"/>
              <circle cx="82" cy="60" r="0.9" fill="white" opacity="0.8"/>
              <circle cx="15" cy="72" r="0.7" fill="white" opacity="0.6"/>
              <circle cx="60" cy="80" r="0.5" fill="white" opacity="0.9"/>
              <circle cx="35" cy="82" r="0.8" fill="white" opacity="0.7"/>
              <circle cx="88" cy="35" r="0.6" fill="white" opacity="0.8"/>
              <circle cx="45" cy="15" r="0.7" fill="white" opacity="0.6"/>
              {/* C letter */}
              <path
                d="M68 35 C62 27 52 23 42 26 C28 30 22 44 26 58 C30 72 44 78 57 74 C63 72 68 67 70 62"
                stroke="white"
                strokeWidth="9"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>
          <h1 className="login-title">Consilium</h1>
        </div>

        <p className="login-subtitle">Four AIs debate. One truth emerges.</p>

        <div className="login-divider" />

        <p className="login-desc">
          Sign in to access your personal AI debate history and start asking questions that matter.
        </p>

        <button className="google-btn" onClick={handleGoogleLogin}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p className="login-privacy">
          Your conversations are private and secured to your account only.
        </p>
      </div>

      {/* Starfield script */}
      <script dangerouslySetInnerHTML={{ __html: `
        (function() {
          const canvas = document.getElementById('starfield');
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          let stars = [];
          
          function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
          }
          
          function initStars() {
            stars = [];
            const count = Math.floor((canvas.width * canvas.height) / 3000);
            for (let i = 0; i < count; i++) {
              stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 1.2 + 0.2,
                alpha: Math.random() * 0.7 + 0.2,
                twinkleSpeed: Math.random() * 0.008 + 0.002,
                twinkleDir: Math.random() > 0.5 ? 1 : -1,
              });
            }
          }
          
          function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (const s of stars) {
              s.alpha += s.twinkleSpeed * s.twinkleDir;
              if (s.alpha > 0.9 || s.alpha < 0.1) s.twinkleDir *= -1;
              ctx.beginPath();
              ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(255,255,255,' + s.alpha + ')';
              ctx.fill();
            }
            requestAnimationFrame(draw);
          }
          
          resize();
          initStars();
          draw();
          window.addEventListener('resize', () => { resize(); initStars(); });
        })();
      `}} />

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }

        .login-root {
          min-height: 100vh;
          width: 100%;
          background: #04040a;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .starfield-canvas {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 0;
        }

        /* Subtle nebula blobs — dark, not glowing */
        .nebula {
          position: fixed;
          border-radius: 50%;
          filter: blur(120px);
          pointer-events: none;
          z-index: 0;
        }
        .nebula-1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%);
          top: -100px; left: -100px;
        }
        .nebula-2 {
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%);
          bottom: -150px; right: -150px;
        }
        .nebula-3 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(6,182,212,0.04) 0%, transparent 70%);
          top: 40%; left: 60%;
        }

        /* Login card — solid dark, no galaxy inside */
        .login-card {
          position: relative;
          z-index: 10;
          background: #0d0d14;
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 20px;
          padding: 48px 44px;
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          box-shadow:
            0 0 0 1px rgba(99,102,241,0.1),
            0 40px 80px rgba(0,0,0,0.6);
        }

        .login-brand {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 10px;
        }

        .login-logo {
          flex-shrink: 0;
        }

        .login-title {
          font-size: 32px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.5px;
        }

        .login-subtitle {
          font-size: 14px;
          color: #6366f1;
          text-align: center;
          margin-bottom: 24px;
          letter-spacing: 0.3px;
        }

        .login-divider {
          width: 100%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent);
          margin-bottom: 24px;
        }

        .login-desc {
          font-size: 14px;
          color: #64748b;
          text-align: center;
          line-height: 1.6;
          margin-bottom: 28px;
          padding: 0 8px;
        }

        .google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 14px 24px;
          background: #ffffff;
          color: #1a1a2e;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 20px;
        }
        .google-btn:hover {
          background: #f0f0f0;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .google-btn:active { transform: translateY(0); }

        .login-privacy {
          font-size: 12px;
          color: #334155;
          text-align: center;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}
