# 🧠 Consilium — The AI That Debates Itself

> *Four AI systems argue. One best answer wins.*

---

## What is Consilium?

When you ask one AI a question, you get one opinion. It might be wrong. You have no way to know.

**Consilium fixes this.**

It sends your question to **four different AI systems at the same time**, makes them **debate and challenge each other's answers**, and then picks the **most logically correct response** — not the most popular one.

Think of it like asking four experts the same question, locking them in a room to argue, and then having a judge pick the strongest argument.

---

## Why Does This Matter?

| Old Way | Consilium Way |
|---|---|
| Ask 1 AI → get 1 answer | Ask 4 AIs → get 4 answers |
| No way to verify if it's correct | AIs cross-examine each other |
| Popular answer wins | Best-reasoned answer wins |
| You trust blindly | You see the full debate |

---

## How It Works — Simple Version

```
You type a question
        ↓
┌───────────────────────────────────────┐
│  4 AIs answer independently           │
│  OpenAI • Gemini • Perplexity • Claude│
└───────────────────────────────────────┘
        ↓
┌───────────────────────────────────────┐
│  Each AI critiques the other 3        │
│  "Your reasoning has a flaw because…" │
└───────────────────────────────────────┘
        ↓
┌───────────────────────────────────────┐
│  Each AI revises or defends its answer│
└───────────────────────────────────────┘
        ↓
┌───────────────────────────────────────┐
│  A judge AI picks the best reasoning  │
│  (not the most popular answer)        │
└───────────────────────────────────────┘
        ↓
  You get the most trustworthy answer
  + full debate transcript
  + confidence score
```

---

## Features

-  **4 AI engines in one** — OpenAI, Google Gemini, Perplexity, OpenRouter
-  **Real adversarial debate** — AIs genuinely challenge each other's logic
-  **Quality over popularity** — minority answer wins if its reasoning is stronger
-  **Confidence scoring** — see how certain the system is about the answer
-  **Full transparency** — read every AI's individual answer and critique
-  **Chat history** — all your conversations saved and searchable
-  **Secure login** — sign in with your Google account
-  **Fast** — all 4 AIs run simultaneously, not one after another

---

## Live Demo

 **[Try it here →](https://consilium-chatbot.vercel.app)**

Sign in with Google — no password needed.

---

## What It Looks Like

```
┌─────────────────────────────────────────────────────┐
│  💬 You: Is the statement "a teacher is rubbing     │
│          the board" true or false?                  │
├─────────────────────────────────────────────────────┤
│  🤖 OpenAI:     True  (confidence: High)            │
│  🤖 Gemini:     True  (confidence: High)            │
│  🤖 Perplexity: True  (confidence: Medium)          │
│  🤖 Claude:     ⚠️ Cannot be determined —           │
│                 a single statement without context   │
│                 cannot be verified as true or false  │
├─────────────────────────────────────────────────────┤
│   FINAL ANSWER: Cannot be determined              │
│   Selected because: Claude's reasoning was        │
│   logically superior despite being outvoted 3-1   │
└─────────────────────────────────────────────────────┘
```

---

## Cost

Each question costs roughly **$0.001 to $0.003** (less than a fraction of a cent).

For context: you could ask **1,000 questions for about $1-3**.

---

## For Developers — Running Locally

### What You Need First

- [Node.js 18+](https://nodejs.org) installed
- A [Supabase](https://supabase.com) account (free)
- API keys for the AI providers (see table below)

### Step 1 — Get the code

```bash
git clone https://github.com/Lokesh4VIT/consilium-chatbot.git
cd consilium-chatbot
npm install
```

### Step 2 — Set up your secrets

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your API keys:

```
NEXT_PUBLIC_SUPABASE_URL=        ← from supabase.com dashboard
NEXT_PUBLIC_SUPABASE_ANON_KEY=   ← from supabase.com dashboard
SUPABASE_SERVICE_ROLE_KEY=       ← from supabase.com dashboard
OPENAI_API_KEY=                  ← from platform.openai.com
GOOGLE_GEMINI_API_KEY=           ← from aistudio.google.com
PERPLEXITY_API_KEY=              ← from perplexity.ai/settings/api
OPENROUTER_API_KEY=              ← from openrouter.ai/keys
```

### Step 3 — Run it

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## API Keys — Where to Get Them

| AI Provider | Get Key Here | Free Tier? |
|---|---|---|
| OpenAI (GPT-4) | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | No — pay as you go |
| Google Gemini | [aistudio.google.com](https://aistudio.google.com/app/apikey) | ✅ Yes |
| Perplexity | [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) | No — pay as you go |
| OpenRouter | [openrouter.ai/keys](https://openrouter.ai/keys) | ✅ Free credits |
| Supabase | [supabase.com/dashboard](https://supabase.com/dashboard) | ✅ Yes |

---

## Deploying to Vercel

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Add all your environment variables in Vercel dashboard
4. Click Deploy

After deploying, update your Supabase settings:
- **Site URL** → `https://your-app.vercel.app`
- **Redirect URL** → `https://your-app.vercel.app/auth/callback`

---

## Security

-  All AI API keys are **server-side only** — never exposed to the browser
-  Login via Google OAuth — we never store your password
-  Database rules ensure **you can only see your own conversations**
-  Rate limiting prevents abuse — 20 queries/day on free plan
-  All inputs are sanitized to prevent prompt injection attacks

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React, Tailwind CSS |
| Backend | Next.js API Routes (TypeScript) |
| Database | PostgreSQL via Supabase |
| Authentication | Google OAuth via Supabase Auth |
| AI Providers | OpenAI, Gemini, Perplexity, OpenRouter |
| Deployment | Vercel |

---

## Project Structure

```
consilium-chatbot/
├── src/
│   ├── app/
│   │   ├── api/consensus/     ← The debate engine lives here
│   │   ├── chat/              ← The chat interface
│   │   └── login/             ← Google login page
│   ├── components/            ← UI building blocks
│   ├── lib/
│   │   ├── ai/                ← All AI logic
│   │   └── db/                ← Database connection
│   └── middleware.ts          ← Security guard for all routes
├── supabase/migrations/       ← Database schema
└── .env.example               ← Template for your secrets
```

---

## Questions or Issues?

Open an [issue on GitHub](https://github.com/Lokesh4VIT/consilium-chatbot/issues) and describe what you're seeing.

---

<div align="center">

Built with curiosity. Powered by disagreement.

**[⭐ Star this repo](https://github.com/Lokesh4VIT/consilium-chatbot)** if you found it useful.

</div>
