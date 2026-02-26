// ============================================================
// AI Provider Clients
// Official API integrations for all 4 providers
// ============================================================

import { AIProvider, AIResponse, PROVIDER_COSTS } from '@/types';

const TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS || '15000');

// ---- Utility: timeout wrapper ----
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('AI_TIMEOUT')), ms)
  );
  return Promise.race([promise, timeout]);
}

// ---- Utility: calculate cost ----
function calcCost(provider: AIProvider, inputTokens: number, outputTokens: number): number {
  const costs = PROVIDER_COSTS[provider];
  return (inputTokens * costs.input) + (outputTokens * costs.output);
}

// ============================================================
// OPENAI (gpt-4o-mini)
// https://platform.openai.com/docs/api-reference
// ============================================================
export async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<AIResponse> {
  const start = Date.now();
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  try {
    const response = await withTimeout(
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 1500,
          temperature: 0.3,
        }),
      }),
      TIMEOUT_MS
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const choice = data.choices[0];
    const usage = data.usage;

    return {
      provider: 'openai',
      model,
      content: choice.message.content,
      tokensInput: usage.prompt_tokens,
      tokensOutput: usage.completion_tokens,
      costUsd: calcCost('openai', usage.prompt_tokens, usage.completion_tokens),
      latencyMs: Date.now() - start,
      status: 'success',
    };
  } catch (error: any) {
    return {
      provider: 'openai',
      model,
      content: '',
      tokensInput: 0,
      tokensOutput: 0,
      costUsd: 0,
      latencyMs: Date.now() - start,
      status: error.message === 'AI_TIMEOUT' ? 'timeout' : 'error',
      error: error.message,
    };
  }
}

// ============================================================
// GOOGLE GEMINI
// https://ai.google.dev/gemini-api/docs
// ============================================================
export async function callGemini(systemPrompt: string, userPrompt: string): Promise<AIResponse> {
  const start = Date.now();
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

  try {
    const response = await withTimeout(
      fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1500,
            },
          }),
        }
      ),
      TIMEOUT_MS
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const content = data.candidates[0].content.parts[0].text;
    const usage = data.usageMetadata;

    return {
      provider: 'gemini',
      model,
      content,
      tokensInput: usage.promptTokenCount || 0,
      tokensOutput: usage.candidatesTokenCount || 0,
      costUsd: calcCost('gemini', usage.promptTokenCount || 0, usage.candidatesTokenCount || 0),
      latencyMs: Date.now() - start,
      status: 'success',
    };
  } catch (error: any) {
    return {
      provider: 'gemini',
      model,
      content: '',
      tokensInput: 0,
      tokensOutput: 0,
      costUsd: 0,
      latencyMs: Date.now() - start,
      status: error.message === 'AI_TIMEOUT' ? 'timeout' : 'error',
      error: error.message,
    };
  }
}

// ============================================================
// PERPLEXITY
// https://docs.perplexity.ai
// ============================================================
export async function callPerplexity(systemPrompt: string, userPrompt: string): Promise<AIResponse> {
  const start = Date.now();
  const model = process.env.PERPLEXITY_MODEL || 'llama-3.1-sonar-small-128k-online';

  try {
    const response = await withTimeout(
      fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 1500,
          temperature: 0.3,
        }),
      }),
      TIMEOUT_MS
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Perplexity error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const choice = data.choices[0];
    const usage = data.usage;

    return {
      provider: 'perplexity',
      model,
      content: choice.message.content,
      tokensInput: usage.prompt_tokens || 0,
      tokensOutput: usage.completion_tokens || 0,
      costUsd: calcCost('perplexity', usage.prompt_tokens || 0, usage.completion_tokens || 0),
      latencyMs: Date.now() - start,
      status: 'success',
    };
  } catch (error: any) {
    return {
      provider: 'perplexity',
      model,
      content: '',
      tokensInput: 0,
      tokensOutput: 0,
      costUsd: 0,
      latencyMs: Date.now() - start,
      status: error.message === 'AI_TIMEOUT' ? 'timeout' : 'error',
      error: error.message,
    };
  }
}

// ============================================================
// OPENROUTER (Copilot/Fallback)
// https://openrouter.ai/docs
// ============================================================
export async function callOpenRouter(
  systemPrompt: string,
  userPrompt: string,
  model?: string
): Promise<AIResponse> {
  const start = Date.now();
  const selectedModel = model || process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku';

  try {
    const response = await withTimeout(
      fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Multi-AI Consensus System',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 1500,
          temperature: 0.3,
        }),
      }),
      TIMEOUT_MS
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenRouter error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const choice = data.choices[0];
    const usage = data.usage;

    return {
      provider: 'openrouter',
      model: selectedModel,
      content: choice.message.content,
      tokensInput: usage?.prompt_tokens || 0,
      tokensOutput: usage?.completion_tokens || 0,
      costUsd: calcCost('openrouter', usage?.prompt_tokens || 0, usage?.completion_tokens || 0),
      latencyMs: Date.now() - start,
      status: 'success',
    };
  } catch (error: any) {
    return {
      provider: 'openrouter',
      model: selectedModel,
      content: '',
      tokensInput: 0,
      tokensOutput: 0,
      costUsd: 0,
      latencyMs: Date.now() - start,
      status: error.message === 'AI_TIMEOUT' ? 'timeout' : 'error',
      error: error.message,
    };
  }
}
