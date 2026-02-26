import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { createSupabaseServiceClient } from "@/lib/db/supabase";
import { runConsensusPipeline } from "@/lib/ai/consensus-engine";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { prompt, conversationId } = body;
    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
      return NextResponse.json({ success: false, error: "Invalid prompt" }, { status: 400 });
    }

    const service = createSupabaseServiceClient();
    const { data: profile } = await service.from("profiles").select("plan, daily_limit, total_queries, total_tokens_used, total_cost_usd").eq("id", user.id).single();

    const rateLimit = await checkRateLimit(user.id, profile?.plan || "free");
    if (!rateLimit.allowed) {
      return NextResponse.json({ success: false, error: `Daily limit of ${rateLimit.limit} queries reached.` }, { status: 429 });
    }

    let convId = conversationId;
    if (!convId) {
      const title = prompt.substring(0, 60) + (prompt.length > 60 ? "..." : "");
      const { data: newConv } = await service.from("conversations").insert({ user_id: user.id, title }).select().single();
      convId = newConv?.id;
    }

    const messageId = uuidv4();
    await service.from("messages").insert({ id: messageId, conversation_id: convId, user_id: user.id, role: "user", content: prompt.trim() });

    const result = await runConsensusPipeline(prompt.trim(), messageId);

    await service.from("ai_responses").insert(
      result.initialResponses.map(r => ({
        message_id: messageId, provider: r.provider, model: r.model,
        content: r.content || "", tokens_input: r.tokensInput, tokens_output: r.tokensOutput,
        cost_usd: r.costUsd, latency_ms: r.latencyMs, status: r.status, error_message: r.error || "",
      }))
    );

    if (result.critiques.length > 0) {
      await service.from("ai_critiques").insert(
        result.critiques.map(c => ({
          message_id: messageId, reviewer_provider: c.reviewerProvider, reviewed_provider: c.reviewedProvider,
          vote: c.vote, critique_text: c.critiqueText, factual_errors: c.factualErrors,
          reasoning_issues: c.reasoningIssues, tokens_used: c.tokensUsed, cost_usd: c.costUsd,
        }))
      );
    }

    await service.from("consensus_results").insert({
      message_id: messageId, final_answer: result.consensus.finalAnswer,
      confidence_score: result.consensus.confidenceScore, confidence_label: result.consensus.confidenceLabel,
      agreement_matrix: result.consensus.agreementMatrix, refinement_applied: result.consensus.refinementApplied,
      refinement_rounds: result.consensus.refinementRounds, total_tokens: result.consensus.totalTokens,
      total_cost_usd: result.consensus.totalCostUsd, processing_time_ms: result.consensus.processingTimeMs,
    });

    await service.from("messages").insert({ conversation_id: convId, user_id: user.id, role: "assistant", content: result.consensus.finalAnswer });

    await service.from("usage_tracking").insert(
      result.initialResponses.map(r => ({
        user_id: user.id, message_id: messageId, provider: r.provider,
        tokens_input: r.tokensInput, tokens_output: r.tokensOutput,
        cost_usd: r.costUsd, date: new Date().toISOString().split("T")[0],
      }))
    );

    await service.from("profiles").update({
      total_queries: (profile?.total_queries || 0) + 1,
      total_tokens_used: (profile?.total_tokens_used || 0) + result.consensus.totalTokens,
      total_cost_usd: (profile?.total_cost_usd || 0) + result.consensus.totalCostUsd,
    }).eq("id", user.id);

    return NextResponse.json({ success: true, data: { ...result, conversationId: convId, rateLimit: { remaining: rateLimit.remaining - 1, limit: rateLimit.limit } } });

  } catch (error: any) {
    console.error("[Consensus API] Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}