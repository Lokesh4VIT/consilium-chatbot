// ============================================================
// Consensus Engine v2 — Reasoning-Quality Based Selection
// Selects the BEST REASONED answer, not the majority answer.
// A minority answer with superior logic beats 3 wrong answers.
// ============================================================

import {
  AIProvider,
  AIResponse,
  AICritique,
  AgreementMatrix,
  ConsensusResult,
  ConsensusPipelineResult,
  VoteType,
  VOTE_WEIGHTS,
  ConfidenceLabel,
} from '@/types';
import { callOpenAI, callGemini, callPerplexity, callOpenRouter } from './providers';

const MAX_RETRIES = parseInt(process.env.AI_MAX_RETRIES || '1');

// ============================================================
// REASONING QUALITY SCORE (RQS)
// Scores each response on logical quality, NOT agreement count.
// ============================================================
interface ReasoningAudit {
  provider: AIProvider;
  premises: string[];
  reasoningSteps: string[];
  conclusion: string;
  confidence: string;
  paradoxFlag: boolean;
  uncertaintyFlag: boolean;
  rqs: number; // 0-100
  flags: string[];
}

function computeRQS(content: string, provider: AIProvider): ReasoningAudit {
  const lower = content.toLowerCase();
  const flags: string[] = [];

  // ── Extract structured sections ─────────────────────────────
  const extractSection = (labels: string[]): string => {
    for (const label of labels) {
      const regex = new RegExp(`(?:${label})[:\\s]*([\\s\\S]*?)(?=\\n\\*\\*|\\n##|$)`, 'i');
      const match = content.match(regex);
      if (match?.[1]?.trim()) return match[1].trim();
    }
    return '';
  };

  const answerSection    = extractSection(['\\*\\*Answer\\*\\*', 'Answer', 'ANSWER']);
  const reasoningSection = extractSection(['\\*\\*Reasoning\\*\\*', 'Reasoning', 'REASONING', 'Explanation']);
  const confidenceSection= extractSection(['\\*\\*Confidence\\*\\*', 'Confidence', 'CONFIDENCE']);
  const uncertaintySection=extractSection(['\\*\\*Uncertainties\\*\\*', 'Uncertainties', 'UNCERTAINTIES', 'Caveats']);

  // ── Detect premises (sentences that set up the argument) ────
  const reasoningLines = reasoningSection.split('\n').filter(l => l.trim().length > 15);
  const premises = reasoningLines.slice(0, 3);
  const reasoningSteps = reasoningLines;

  // ── Detect if AI acknowledged ambiguity / uncertainty ───────
  const uncertaintyKeywords = [
    'cannot be determined', 'cannot determine', 'insufficient information',
    'ambiguous', 'unclear', 'depends on', 'without more context',
    'single statement', 'cannot conclude', 'not enough information',
    'need more', 'impossible to say', 'indeterminate', 'underdetermined'
  ];
  const uncertaintyFlag = uncertaintyKeywords.some(k => lower.includes(k));
  if (uncertaintyFlag) flags.push('ACKNOWLEDGED_AMBIGUITY');

  // ── Detect paradox or self-referential logic ─────────────────
  const paradoxKeywords = ['paradox', 'self-referential', 'circular', 'contradiction', 'undefined'];
  const paradoxFlag = paradoxKeywords.some(k => lower.includes(k));
  if (paradoxFlag) flags.push('PARADOX_DETECTED');

  // ── Detect overconfidence (strong claim, no reasoning) ──────
  const strongClaims = ['definitely', 'certainly', 'absolutely', 'obviously', 'clearly'];
  const hasStrongClaim = strongClaims.some(k => lower.includes(k));
  const hasWeakReasoning = reasoningSteps.length < 2;
  if (hasStrongClaim && hasWeakReasoning) flags.push('OVERCONFIDENT');

  // ── Detect self-refutation ───────────────────────────────────
  const negPairs: [RegExp, RegExp][] = [
    [/\bis true\b/i, /\bis false\b/i],
    [/\bcan\b/i, /\bcannot\b/i],
    [/\bpossible\b/i, /\bimpossible\b/i],
  ];
  const combined = answerSection + ' ' + reasoningSection;
  const selfRefuting = negPairs.some(([a, b]) => a.test(combined) && b.test(combined) &&
    combined.indexOf(combined.match(a)?.[0] ?? '') < combined.indexOf(combined.match(b)?.[0] ?? ''));
  if (selfRefuting) flags.push('SELF_REFUTING');

  // ── Compute RQS ──────────────────────────────────────────────
  // Component 1: Premise/reasoning depth (30%)
  const reasoningScore = reasoningSteps.length === 0 ? 10
    : reasoningSteps.length >= 4 ? 100
    : (reasoningSteps.length / 4) * 100;

  // Component 2: Conclusion clarity (20%)
  const conclusionScore = answerSection.length < 5 ? 20
    : selfRefuting ? 0 : 100;

  // Component 3: Uncertainty acknowledgment (25%)
  // CRITICAL: Saying "cannot be determined" when ambiguous is CORRECT and scored HIGH
  const uncertaintyScore = uncertaintyFlag ? 100 : 50;

  // Component 4: Confidence calibration (15%)
  const confLower = confidenceSection.toLowerCase();
  const isHighConf = confLower.includes('high') || confLower.includes('certain');
  const isMedConf  = confLower.includes('medium') || confLower.includes('moderate');
  const confScore  = (hasStrongClaim && hasWeakReasoning) ? 20
    : isHighConf ? 70 : isMedConf ? 85 : 90;

  // Component 5: No self-refutation (10%)
  const coherenceScore = selfRefuting ? 0 : 100;

  const rqs = Math.round(
    reasoningScore   * 0.30 +
    conclusionScore  * 0.20 +
    uncertaintyScore * 0.25 +
    confScore        * 0.15 +
    coherenceScore   * 0.10
  );

  return {
    provider,
    premises,
    reasoningSteps,
    conclusion: answerSection || content.substring(0, 200),
    confidence: confidenceSection,
    paradoxFlag,
    uncertaintyFlag,
    rqs,
    flags,
  };
}

// ============================================================
// PROMPTS — Force structured reasoning from every AI
// ============================================================

const INITIAL_SYSTEM_PROMPT = `You are participating in a rigorous multi-AI verification system.
Your answer will be critically reviewed by other AI systems.

You MUST follow this exact format:

**Answer:**
[Your direct, precise answer to the question]

**Reasoning:**
[Step-by-step logical reasoning. Number each step. Be explicit about your premises.]
[If you cannot determine the answer from the given information alone, say so clearly and explain why.]

**Confidence:** [High / Medium / Low]

**Uncertainties:**
[Any ambiguities, missing information, or edge cases that affect your answer]
[If the question lacks sufficient information for a definitive answer, state this explicitly]

IMPORTANT RULES:
- Do NOT guess if you are uncertain
- Do NOT go with what seems most popular — reason independently
- If the statement or question is ambiguous or lacks context, say "Cannot be determined" and explain why
- Your job is to be CORRECT, not to agree with others`;

function buildCritiquePrompt(
  originalQuestion: string,
  otherResponses: { provider: AIProvider; content: string; rqs: number }[]
): string {
  const formattedResponses = otherResponses
    .map((r, i) => `--- AI Response ${i + 1} (${r.provider.toUpperCase()}, Reasoning Score: ${r.rqs}/100) ---\n${r.content}`)
    .join('\n\n');

  return `You are a CRITICAL LOGIC REVIEWER in a multi-AI verification system.
Your job is to evaluate the QUALITY OF REASONING, not just whether you agree with the answer.

Original Question: "${originalQuestion}"

Below are responses from ${otherResponses.length} other AI systems:

${formattedResponses}

For EACH response, critically evaluate:
1. Are the premises correct and complete?
2. Does the reasoning logically lead to the conclusion?
3. Did the AI correctly handle ambiguity and uncertainty?
4. Is the confidence level appropriate given the reasoning?
5. Are there logical flaws, false assumptions, or missing considerations?

IMPORTANT: If a response says "Cannot be determined" or "insufficient information", 
evaluate whether that is LOGICALLY CORRECT given the question — it might be the best answer.

Vote AGREE only if you find the REASONING sound, not just because the answer matches yours.
Vote DISAGREE if the reasoning has logical flaws, even if the final answer happens to be popular.

Format your response EXACTLY as JSON (no markdown fences):
{
  "reviews": [
    {
      "provider": "<provider_name>",
      "vote": "agree|partial|disagree",
      "reasoningQuality": "strong|adequate|weak",
      "logicalFlaws": ["flaw1", "flaw2"],
      "factualErrors": ["error1"],
      "handledAmbiguityCorrectly": true,
      "explanation": "Your detailed evaluation"
    }
  ]
}`;
}

function buildRefinementPrompt(
  originalQuestion: string,
  yourOriginalAnswer: string,
  critiquesOfYou: AICritique[],
  yourRqs: number
): string {
  const critiqueText = critiquesOfYou
    .map(c => `- ${c.reviewerProvider.toUpperCase()} voted ${c.vote.toUpperCase()}: ${c.critiqueText}`)
    .join('\n');

  return `You are refining your answer based on peer logical review.

Original Question: "${originalQuestion}"

Your original answer (Reasoning Quality Score: ${yourRqs}/100):
${yourOriginalAnswer}

Peer reviews of your reasoning:
${critiqueText}

Instructions:
1. Carefully read each critique
2. If a critique correctly identifies a logical flaw in YOUR reasoning → REVISE
3. If a critique is simply disagreeing without valid logical grounds → DEFEND with stronger reasoning
4. If you said "Cannot be determined" and critics disagree, only revise if they give a LOGICAL reason why the question IS determinable
5. Do NOT revise just because you are in the minority — minority can be correct

Format:
**Decision:** [REVISED / DEFENDED]
**Why:** [Your explicit reasoning for revising or defending]
**Updated Answer:**
[Your refined or defended answer, using the full structured format]`;
}

function buildMetaAdjudicatorPrompt(
  originalQuestion: string,
  audits: ReasoningAudit[],
  responses: AIResponse[]
): string {
  const blocks = audits.map(a => {
    const resp = responses.find(r => r.provider === a.provider);
    return `=== ${a.provider.toUpperCase()} | Reasoning Quality Score: ${a.rqs}/100 ===
Flags: ${a.flags.join(', ') || 'none'}
Acknowledged ambiguity: ${a.uncertaintyFlag}
Detected paradox: ${a.paradoxFlag}
Conclusion: ${a.conclusion.substring(0, 300)}
---
Full Response:
${resp?.content?.substring(0, 600) || 'N/A'}
`;
  }).join('\n\n');

  const elevated = audits.filter(a => a.uncertaintyFlag || a.rqs > 70);
  const elevatedNames = elevated.map(a => a.provider).join(', ');

  return `You are the final reasoning judge in a multi-AI verification system.
Your job: select the MOST LOGICALLY CORRECT answer — NOT the majority answer.

ORIGINAL QUESTION: "${originalQuestion}"

AI RESPONSES WITH REASONING QUALITY SCORES:
${blocks}

ELEVATED FOR CONSIDERATION (high reasoning quality or correctly flagged ambiguity):
${elevatedNames || 'none'}

YOUR RULES:
1. DO NOT select an answer just because 3 out of 4 AIs gave it
2. SELECT the answer with the strongest logical reasoning chain
3. If a question cannot be answered from given information alone, "Cannot be determined" IS a valid correct answer
4. A minority answer with RQS > 70 should be preferred over a majority answer with RQS < 50
5. If you detect the question is ambiguous or lacks sufficient context, say so clearly

RESPOND IN THIS EXACT FORMAT:
WINNER: [openai|gemini|perplexity|openrouter]
IS_AMBIGUOUS: [YES|NO]
FINAL_ANSWER: [The complete best answer — copy or synthesize from the winner]
CONFIDENCE: [0-100]
REASONING: [2-3 sentences explaining WHY you chose this answer based on reasoning quality, not popularity]
DISSENT_NOTE: [Brief note on what the other AIs got wrong in their reasoning]`;
}

// ============================================================
// PHASE 1: Parallel Initial Responses
// ============================================================
async function runPhase1(userPrompt: string): Promise<AIResponse[]> {
  const callers = [
    () => callOpenAI(INITIAL_SYSTEM_PROMPT, userPrompt),
    () => callGemini(INITIAL_SYSTEM_PROMPT, userPrompt),
    () => callPerplexity(INITIAL_SYSTEM_PROMPT, userPrompt),
    () => callOpenRouter(INITIAL_SYSTEM_PROMPT, userPrompt),
  ];

  const results = await Promise.all(callers.map(async (caller) => {
    let result = await caller();
    if (result.status === 'error' || result.status === 'timeout') {
      for (let i = 0; i < MAX_RETRIES; i++) {
        await sleep(1000);
        result = await caller();
        if (result.status === 'success') break;
      }
    }
    if (result.status !== 'success' && result.provider !== 'openrouter') {
      const fallback = await callOpenRouter(INITIAL_SYSTEM_PROMPT, userPrompt, 'openai/gpt-4o-mini');
      return { ...fallback, provider: result.provider, status: 'fallback' as const };
    }
    return result;
  }));

  return results;
}

// ============================================================
// PHASE 2: Cross-Review with Reasoning Quality Awareness
// ============================================================
async function runPhase2(
  userPrompt: string,
  responses: AIResponse[],
  audits: ReasoningAudit[]
): Promise<AICritique[]> {
  const successfulResponses = responses.filter(r => r.content);

  const reviewTasks = successfulResponses.map(async (reviewer) => {
    const othersToReview = successfulResponses
      .filter(r => r.provider !== reviewer.provider)
      .map(r => ({
        provider: r.provider,
        content: r.content,
        rqs: audits.find(a => a.provider === r.provider)?.rqs ?? 50,
      }));

    if (othersToReview.length === 0) return [];

    const critiquePrompt = buildCritiquePrompt(userPrompt, othersToReview);

    let critiqueResponse: AIResponse;
    switch (reviewer.provider) {
      case 'openai':     critiqueResponse = await callOpenAI('', critiquePrompt); break;
      case 'gemini':     critiqueResponse = await callGemini('', critiquePrompt); break;
      case 'perplexity': critiqueResponse = await callPerplexity('', critiquePrompt); break;
      case 'openrouter': critiqueResponse = await callOpenRouter('', critiquePrompt); break;
    }

    if (!critiqueResponse!.content) return [];

    try {
      // Clean response — remove markdown fences if present
      const cleaned = critiqueResponse!.content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(cleaned);
      return parsed.reviews.map((review: any) => ({
        reviewerProvider: reviewer.provider,
        reviewedProvider: review.provider as AIProvider,
        vote: review.vote as VoteType,
        critiqueText: review.explanation || '',
        factualErrors: review.factualErrors || [],
        reasoningIssues: review.logicalFlaws || [],
        tokensUsed: critiqueResponse!.tokensInput + critiqueResponse!.tokensOutput,
        costUsd: critiqueResponse!.costUsd / othersToReview.length,
      })) as AICritique[];
    } catch {
      return othersToReview.map(reviewed => ({
        reviewerProvider: reviewer.provider,
        reviewedProvider: reviewed.provider,
        vote: extractVote(critiqueResponse!.content, reviewed.provider) as VoteType,
        critiqueText: critiqueResponse!.content.substring(0, 300),
        factualErrors: [],
        reasoningIssues: [],
        tokensUsed: critiqueResponse!.tokensInput + critiqueResponse!.tokensOutput,
        costUsd: critiqueResponse!.costUsd / othersToReview.length,
      }));
    }
  });

  const results = await Promise.all(reviewTasks);
  return results.flat();
}

// ============================================================
// PHASE 3: Refinement
// ============================================================
async function runPhase3(
  userPrompt: string,
  initialResponses: AIResponse[],
  critiques: AICritique[],
  audits: ReasoningAudit[]
): Promise<AIResponse[]> {
  const refinementTasks = initialResponses
    .filter(r => r.content)
    .map(async (response) => {
      const critiquesOfMe = critiques.filter(c =>
        c.reviewedProvider === response.provider && c.vote !== 'agree'
      );
      if (critiquesOfMe.length === 0) return response;

      const myRqs = audits.find(a => a.provider === response.provider)?.rqs ?? 50;
      const refinementPrompt = buildRefinementPrompt(
        userPrompt, response.content, critiquesOfMe, myRqs
      );

      let refined: AIResponse;
      switch (response.provider) {
        case 'openai':     refined = await callOpenAI('', refinementPrompt); break;
        case 'gemini':     refined = await callGemini('', refinementPrompt); break;
        case 'perplexity': refined = await callPerplexity('', refinementPrompt); break;
        case 'openrouter': refined = await callOpenRouter('', refinementPrompt); break;
      }

      return refined!.content ? refined! : response;
    });

  return Promise.all(refinementTasks);
}

// ============================================================
// META-ADJUDICATOR — Picks winner by reasoning quality
// This replaces majority voting entirely.
// ============================================================
async function runMetaAdjudicator(
  userPrompt: string,
  responses: AIResponse[],
  audits: ReasoningAudit[]
): Promise<{
  finalAnswer: string;
  confidenceScore: number;
  winner: AIProvider | 'synthesized';
  isAmbiguous: boolean;
  reasoning: string;
  dissentNote: string;
}> {
  const prompt = buildMetaAdjudicatorPrompt(userPrompt, audits, responses);

  // Use OpenAI at low temperature for deterministic judgment
  const raw = await callOpenAI(
    'You are a rigorous logic judge. You select answers based on reasoning quality, never popularity.',
    prompt,
  );

  if (!raw.content) {
    // Fallback: pick highest RQS response
    const best = audits.reduce((a, b) => a.rqs > b.rqs ? a : b);
    const bestResponse = responses.find(r => r.provider === best.provider);
    return {
      finalAnswer: bestResponse?.content || 'Unable to determine answer.',
      confidenceScore: best.rqs,
      winner: best.provider,
      isAmbiguous: best.uncertaintyFlag,
      reasoning: 'Selected by highest reasoning quality score.',
      dissentNote: '',
    };
  }

  const extract = (key: string) => {
    const m = raw.content.match(new RegExp(`${key}:\\s*([^\\n]+)`, 'i'));
    return m?.[1]?.trim() ?? '';
  };

  const extractMultiline = (key: string) => {
    const m = raw.content.match(new RegExp(`${key}:\\s*([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`, 'i'));
    return m?.[1]?.trim() ?? '';
  };

  const winnerRaw = extract('WINNER').toLowerCase();
  const providers: AIProvider[] = ['openai', 'gemini', 'perplexity', 'openrouter'];
  const winner = providers.find(p => winnerRaw.includes(p)) ?? audits.reduce((a, b) => a.rqs > b.rqs ? a : b).provider;

  const isAmbiguous = extract('IS_AMBIGUOUS').toUpperCase() === 'YES';
  const finalAnswer = extractMultiline('FINAL_ANSWER');
  const confidenceScore = Math.min(100, Math.max(0, parseInt(extract('CONFIDENCE')) || 60));
  const reasoning = extract('REASONING');
  const dissentNote = extract('DISSENT_NOTE');

  // If answer is empty, pull from winning provider's response
  const winnerResponse = responses.find(r => r.provider === winner);
  const answer = finalAnswer || winnerResponse?.content || 'Unable to synthesize answer.';

  return { finalAnswer: answer, confidenceScore, winner, isAmbiguous, reasoning, dissentNote };
}

// ============================================================
// CONSENSUS SCORING — Now based on RQS, not agreement count
// ============================================================
function computeConsensusScore(
  responses: AIResponse[],
  critiques: AICritique[],
  audits: ReasoningAudit[]
): {
  confidenceScore: number;
  confidenceLabel: ConfidenceLabel;
  agreementMatrix: AgreementMatrix;
} {
  const providers = responses.filter(r => r.content).map(r => r.provider);

  // Build agreement matrix (kept for display purposes)
  const matrix: AgreementMatrix = {};
  for (const reviewer of providers) {
    matrix[reviewer] = {};
    for (const reviewed of providers) {
      if (reviewer === reviewed) continue;
      const critique = critiques.find(
        c => c.reviewerProvider === reviewer && c.reviewedProvider === reviewed
      );
      matrix[reviewer][reviewed] = critique?.vote || 'partial';
    }
  }

  // Confidence score now based on average RQS of all responses
  // (high-quality reasoning = high confidence, regardless of agreement)
  const avgRqs = audits.length > 0
    ? audits.reduce((sum, a) => sum + a.rqs, 0) / audits.length
    : 50;

  const confidenceScore = Math.round(avgRqs);

  let confidenceLabel: ConfidenceLabel;
  if (confidenceScore >= 90)    confidenceLabel = 'unanimous';
  else if (confidenceScore >= 75) confidenceLabel = 'high';
  else if (confidenceScore >= 55) confidenceLabel = 'moderate';
  else                            confidenceLabel = 'low';

  return { confidenceScore, confidenceLabel, agreementMatrix: matrix };
}

// ============================================================
// MAIN PIPELINE
// ============================================================
export async function runConsensusPipeline(
  userPrompt: string,
  messageId: string
): Promise<ConsensusPipelineResult> {
  const pipelineStart = Date.now();
  const sanitizedPrompt = sanitizePrompt(userPrompt);

  // ── Phase 1: Parallel initial responses ─────────────────────
  console.log('[Consensus v2] Phase 1: Gathering initial responses...');
  const initialResponses = await runPhase1(sanitizedPrompt);

  const successCount = initialResponses.filter(r => r.content).length;
  if (successCount < 2) {
    throw new Error(`Insufficient AI responses: only ${successCount}/4 providers responded`);
  }

  // ── Compute RQS for each response (local, zero API calls) ───
  console.log('[Consensus v2] Scoring reasoning quality...');
  const initialAudits = initialResponses
    .filter(r => r.content)
    .map(r => computeRQS(r.content, r.provider));

  console.log('[Consensus v2] RQS scores:', initialAudits.map(a => `${a.provider}:${a.rqs}`).join(', '));

  // ── Phase 2: Cross-review with reasoning awareness ───────────
  console.log('[Consensus v2] Phase 2: Cross-review...');
  const critiques = await runPhase2(sanitizedPrompt, initialResponses, initialAudits);

  // ── Compute preliminary score ────────────────────────────────
  const { confidenceScore, confidenceLabel, agreementMatrix } = computeConsensusScore(
    initialResponses, critiques, initialAudits
  );

  // ── Phase 3: Refinement if needed ───────────────────────────
  let refinedResponses: AIResponse[] | undefined;
  let refinementApplied = false;
  let responsesToUse = initialResponses;
  let auditsToUse = initialAudits;

  if (confidenceScore < 75) {
    console.log(`[Consensus v2] Phase 3: Refinement (avg RQS: ${confidenceScore})...`);
    refinedResponses = await runPhase3(sanitizedPrompt, initialResponses, critiques, initialAudits);
    refinementApplied = true;
    responsesToUse = refinedResponses;
    auditsToUse = refinedResponses
      .filter(r => r.content)
      .map(r => computeRQS(r.content, r.provider));
    console.log('[Consensus v2] Post-refinement RQS:', auditsToUse.map(a => `${a.provider}:${a.rqs}`).join(', '));
  }

  // ── Meta-adjudication: pick winner by reasoning quality ──────
  console.log('[Consensus v2] Meta-adjudication: selecting best-reasoned answer...');
  const meta = await runMetaAdjudicator(sanitizedPrompt, responsesToUse, auditsToUse);

  console.log(`[Consensus v2] Winner: ${meta.winner} | Confidence: ${meta.confidenceScore} | Ambiguous: ${meta.isAmbiguous}`);

  // ── Totals ───────────────────────────────────────────────────
  const allResponses = [...initialResponses, ...(refinedResponses || [])];
  const totalTokens = allResponses.reduce((sum, r) => sum + r.tokensInput + r.tokensOutput, 0)
    + critiques.reduce((sum, c) => sum + c.tokensUsed, 0);
  const totalCostUsd = allResponses.reduce((sum, r) => sum + r.costUsd, 0)
    + critiques.reduce((sum, c) => sum + c.costUsd, 0);

  return {
    messageId,
    userPrompt: sanitizedPrompt,
    initialResponses,
    critiques,
    refinedResponses,
    consensus: {
      finalAnswer: meta.finalAnswer,
      confidenceScore: meta.confidenceScore,
      confidenceLabel: meta.isAmbiguous ? 'low' : confidenceLabel,
      agreementMatrix,
      refinementApplied,
      refinementRounds: refinementApplied ? 1 : 0,
      totalTokens,
      totalCostUsd,
      processingTimeMs: Date.now() - pipelineStart,
    },
  };
}

// ============================================================
// HELPERS
// ============================================================
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractVote(text: string, provider: string): VoteType {
  const lower = text.toLowerCase();
  if (lower.includes('disagree')) return 'disagree';
  if (lower.includes('partial'))  return 'partial';
  return 'agree';
}

function sanitizePrompt(prompt: string): string {
  return prompt
    .trim()
    .substring(0, 4000)
    .replace(/\bignore (all )?previous instructions?\b/gi, '[filtered]')
    .replace(/\bsystem prompt\b/gi, '[filtered]')
    .replace(/<\/?[^>]+(>|$)/g, '');
}