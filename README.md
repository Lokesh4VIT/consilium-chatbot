# Consilium — Multi-AI Consensus System

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BROWSER / CLIENT                                 │
│                                                                          │
│  ┌──────────────┐  ┌──────────────────────────────────────────────────┐ │
│  │   Sidebar    │  │              Chat Interface                       │ │
│  │  (History)   │  │  UserMessage → LoadingConsensus → ConsensusResult │ │
│  └──────────────┘  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │ POST /api/consensus
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS SERVER (Vercel Edge)                          │
│                                                                          │
│  middleware.ts → Auth check → Rate limit check                           │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    consensus-engine.ts                             │   │
│  │                                                                    │   │
│  │  Phase 1: Parallel Fetch (Promise.all)                            │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │   │
│  │  │ OpenAI   │ │ Gemini   │ │Perplexity│ │OpenRouter│           │   │
│  │  │ GPT-4o   │ │1.5-flash │ │  Sonar   │ │  Claude  │           │   │
│  │  │ (15s TO) │ │ (15s TO) │ │ (15s TO) │ │ (15s TO) │           │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │   │
│  │       │             │             │              │                │   │
│  │  Phase 2: Cross-Review (4×3=12 critiques)                        │   │
│  │  Each AI reviews other 3 → vote: agree/partial/disagree          │   │
│  │                                                                    │   │
│  │  Phase 3: Refinement (if confidence < 75%)                        │   │
│  │  Disagreed AIs revise or defend positions                         │   │
│  │                                                                    │   │
│  │  Synthesis: OpenAI synthesizes final answer                       │   │
│  │                                                                    │   │
│  │  Score = Σ(vote_weights) / max_points × 100                      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                         │
│                                                                          │
│  PostgreSQL:                                                             │
│  profiles → conversations → messages                                     │
│                          → ai_responses (×4 per query)                  │
│                          → ai_critiques (×12 per query)                 │
│                          → consensus_results (×1 per query)             │
│  usage_tracking (per provider, per day)                                  │
│                                                                          │
│  Auth: Google OAuth → JWT → RLS policies                                │
└─────────────────────────────────────────────────────────────────────────┘
```

## Consensus Scoring Algorithm

```
Providers: [OpenAI, Gemini, Perplexity, OpenRouter] (n = 4)

Vote weights:
  agree    = 1.0
  partial  = 0.5
  disagree = 0.0

Agreement matrix: n × (n-1) = 12 review slots

Max possible points = n × (n-1) = 12

Confidence score = Σ(vote_weight_i) / 12 × 100

Labels:
  100%      → unanimous
  75–99%    → high
  50–74%    → moderate
  < 50%     → low (triggers refinement)
```

## Folder Structure

```
multi-ai-consensus/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── consensus/route.ts      # Main pipeline endpoint
│   │   │   └── history/route.ts        # Conversation CRUD
│   │   ├── auth/callback/route.ts      # OAuth callback
│   │   ├── chat/page.tsx               # Main chat UI
│   │   ├── login/page.tsx              # Google OAuth login
│   │   ├── layout.tsx                  # Root layout
│   │   ├── page.tsx                    # Root redirect
│   │   └── globals.css
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatInput.tsx
│   │   │   └── Sidebar.tsx
│   │   └── consensus/
│   │       ├── ConsensusResult.tsx     # Main result display
│   │       └── LoadingConsensus.tsx    # Loading skeleton
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── providers.ts            # 4 AI provider clients
│   │   │   └── consensus-engine.ts     # 3-phase orchestration
│   │   ├── db/
│   │   │   └── supabase.ts             # Supabase clients
│   │   └── utils/
│   │       └── rate-limit.ts
│   ├── types/index.ts                  # TypeScript types
│   └── middleware.ts                   # Auth + protection
├── supabase/migrations/
│   └── 001_schema.sql                  # Full DB schema
├── .env.example
├── next.config.js
├── tailwind.config.js
└── package.json
```

## Deployment Guide

### 1. Supabase Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Init and link project
supabase init
supabase login
supabase link --project-ref YOUR_PROJECT_ID

# Run migrations
supabase db push

# Enable Google OAuth in Supabase Dashboard:
# Authentication → Providers → Google
# Add your Google OAuth credentials from Google Cloud Console
# Set callback URL: https://YOUR_PROJECT.supabase.co/auth/v1/callback
```

### 2. Environment Variables

```bash
cp .env.example .env.local
# Fill in all values in .env.local
```

### 3. Local Development

```bash
npm install
npm run dev
# Visit http://localhost:3000
```

### 4. Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Add environment variables in Vercel Dashboard:
# Settings → Environment Variables
# Add all variables from .env.example
```

### 5. Post-deployment

- Update Supabase Auth → URL Configuration:
  - Site URL: `https://your-app.vercel.app`
  - Redirect URLs: `https://your-app.vercel.app/auth/callback`

- Update Google OAuth console:
  - Authorized redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`

## API Keys Required

| Provider    | Where to get                                  | Cost          |
|-------------|-----------------------------------------------|---------------|
| OpenAI      | https://platform.openai.com/api-keys          | ~$0.15/1M in  |
| Gemini      | https://aistudio.google.com/app/apikey        | Free tier     |
| Perplexity  | https://www.perplexity.ai/settings/api        | ~$0.20/1M     |
| OpenRouter  | https://openrouter.ai/keys                    | ~$0.025/1M    |
| Supabase    | https://supabase.com/dashboard                | Free tier     |

## Estimated Cost per Query

Each query = 3 phases × 4 providers:
- Phase 1 (initial): ~600 tokens × 4 = ~2,400 tokens
- Phase 2 (critiques): ~800 tokens × 4 = ~3,200 tokens  
- Phase 3 (refinement if needed): ~1,000 tokens × 4 = ~4,000 tokens
- Synthesis: ~1,500 tokens

**Total: ~7,000-11,000 tokens ≈ $0.001–$0.003 per query**

## Security Notes

- All API keys are server-side only (no `NEXT_PUBLIC_` prefix)
- Supabase RLS ensures users only see their own data
- Input sanitized to prevent prompt injection
- Rate limiting: 20 queries/day (free), 200/day (pro)
- Auth via Supabase JWT — validated server-side on every request
