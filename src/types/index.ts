// ============================================================
// Multi-AI Consensus System - Type Definitions
// ============================================================

export type AIProvider = 'openai' | 'gemini' | 'perplexity' | 'openrouter';
export type VoteType = 'agree' | 'partial' | 'disagree';
export type ConfidenceLabel = 'unanimous' | 'high' | 'moderate' | 'low';

// ---- AI Response (Phase 1) ----
export interface AIResponse {
  provider: AIProvider;
  model: string;
  content: string;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  latencyMs: number;
  status: 'success' | 'error' | 'timeout' | 'fallback';
  error?: string;
}

// ---- AI Critique (Phase 2) ----
export interface AICritique {
  reviewerProvider: AIProvider;
  reviewedProvider: AIProvider;
  vote: VoteType;
  critiqueText: string;
  factualErrors: string[];
  reasoningIssues: string[];
  tokensUsed: number;
  costUsd: number;
}

// ---- Agreement Matrix ----
export interface AgreementMatrix {
  [reviewerProvider: string]: {
    [reviewedProvider: string]: VoteType;
  };
}

// ---- Consensus Result (Phase 3) ----
export interface ConsensusResult {
  finalAnswer: string;
  confidenceScore: number;        // 0-100
  confidenceLabel: ConfidenceLabel;
  agreementMatrix: AgreementMatrix;
  refinementApplied: boolean;
  refinementRounds: number;
  totalTokens: number;
  totalCostUsd: number;
  processingTimeMs: number;
}

// ---- Full Consensus Pipeline Output ----
export interface ConsensusPipelineResult {
  messageId: string;
  userPrompt: string;
  initialResponses: AIResponse[];
  critiques: AICritique[];
  refinedResponses?: AIResponse[];
  consensus: ConsensusResult;
}

// ---- Conversation ----
export interface Conversation {
  id: string;
  userId: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

// ---- Message ----
export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  consensus?: ConsensusResult;
  aiResponses?: AIResponse[];
  aiCritiques?: AICritique[];
}

// ---- User Profile ----
export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  plan: 'free' | 'pro' | 'admin';
  dailyLimit: number;
  totalQueries: number;
  totalCostUsd: number;
}

// ---- API Request/Response ----
export interface ConsensusRequest {
  prompt: string;
  conversationId?: string;
}

export interface ConsensusAPIResponse {
  success: boolean;
  data?: ConsensusPipelineResult;
  error?: string;
}

// ---- Vote weights for scoring ----
export const VOTE_WEIGHTS: Record<VoteType, number> = {
  agree: 1.0,
  partial: 0.5,
  disagree: 0.0,
};

// ---- Cost per 1K tokens (USD) ----
export const PROVIDER_COSTS: Record<AIProvider, { input: number; output: number }> = {
  openai:      { input: 0.000150, output: 0.000600 },   // gpt-4o-mini
  gemini:      { input: 0.000075, output: 0.000300 },   // gemini-1.5-flash
  perplexity:  { input: 0.000200, output: 0.000200 },   // sonar-small
  openrouter:  { input: 0.000025, output: 0.000125 },   // claude-3-haiku
};
