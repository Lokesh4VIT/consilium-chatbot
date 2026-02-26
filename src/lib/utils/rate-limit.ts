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
