-- ============================================================
-- Multi-AI Consensus System - Complete Supabase Schema
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'admin')),
  daily_limit INTEGER DEFAULT 20,
  total_queries INTEGER DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  total_cost_usd DECIMAL(10,6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONVERSATIONS
-- ============================================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  model_config JSONB DEFAULT '{}',
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AI RESPONSES (Phase 1: Initial Answers)
-- ============================================================
CREATE TABLE ai_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'gemini', 'perplexity', 'openrouter')),
  model TEXT NOT NULL,
  content TEXT NOT NULL,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  cost_usd DECIMAL(10,6) DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error', 'timeout', 'fallback')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AI CRITIQUES (Phase 2: Cross-Review)
-- ============================================================
CREATE TABLE ai_critiques (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  reviewer_provider TEXT NOT NULL,
  reviewed_provider TEXT NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('agree', 'partial', 'disagree')),
  critique_text TEXT NOT NULL,
  factual_errors TEXT[],
  reasoning_issues TEXT[],
  tokens_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10,6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONSENSUS RESULTS (Phase 3: Final Output)
-- ============================================================
CREATE TABLE consensus_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  final_answer TEXT NOT NULL,
  confidence_score DECIMAL(5,2) NOT NULL,
  confidence_label TEXT NOT NULL CHECK (confidence_label IN ('unanimous', 'high', 'moderate', 'low')),
  agreement_matrix JSONB NOT NULL DEFAULT '{}',
  refinement_applied BOOLEAN DEFAULT FALSE,
  refinement_rounds INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_cost_usd DECIMAL(10,6) DEFAULT 0,
  processing_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USAGE TRACKING
-- ============================================================
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  cost_usd DECIMAL(10,6) DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_ai_responses_message_id ON ai_responses(message_id);
CREATE INDEX idx_ai_critiques_message_id ON ai_critiques(message_id);
CREATE INDEX idx_consensus_results_message_id ON consensus_results(message_id);
CREATE INDEX idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX idx_usage_tracking_date ON usage_tracking(date);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_critiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE consensus_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only see/edit their own
CREATE POLICY "Users view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Conversations: users can only CRUD their own
CREATE POLICY "Users manage own conversations" ON conversations FOR ALL USING (auth.uid() = user_id);

-- Messages: users can only see messages in their conversations
CREATE POLICY "Users manage own messages" ON messages FOR ALL USING (auth.uid() = user_id);

-- AI Responses: readable by message owner
CREATE POLICY "Users view own ai_responses" ON ai_responses FOR SELECT
  USING (EXISTS (SELECT 1 FROM messages m WHERE m.id = message_id AND m.user_id = auth.uid()));

-- AI Critiques: readable by message owner
CREATE POLICY "Users view own ai_critiques" ON ai_critiques FOR SELECT
  USING (EXISTS (SELECT 1 FROM messages m WHERE m.id = message_id AND m.user_id = auth.uid()));

-- Consensus Results: readable by message owner
CREATE POLICY "Users view own consensus_results" ON consensus_results FOR SELECT
  USING (EXISTS (SELECT 1 FROM messages m WHERE m.id = message_id AND m.user_id = auth.uid()));

-- Usage: users see only their own
CREATE POLICY "Users view own usage" ON usage_tracking FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- SERVICE ROLE POLICIES (backend writes)
-- ============================================================
CREATE POLICY "Service role full access ai_responses" ON ai_responses FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access ai_critiques" ON ai_critiques FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access consensus" ON consensus_results FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access usage" ON usage_tracking FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access messages" ON messages FOR ALL TO service_role USING (true);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Increment conversation message count
CREATE OR REPLACE FUNCTION increment_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET message_count = message_count + 1 WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION increment_message_count();

-- Daily usage view
CREATE OR REPLACE VIEW daily_usage_stats AS
SELECT
  user_id,
  date,
  SUM(tokens_input + tokens_output) AS total_tokens,
  SUM(cost_usd) AS total_cost,
  COUNT(*) AS api_calls
FROM usage_tracking
GROUP BY user_id, date;
