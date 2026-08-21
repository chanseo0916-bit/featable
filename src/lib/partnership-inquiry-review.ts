import type { SupabaseClient } from "@supabase/supabase-js";

export async function reviewPartnershipInquiryWithClient(
  supabase: SupabaseClient,
  input: { id: string; decision: "approve" | "reject"; note?: string; reviewedBy?: string | null },
) {
  const note = input.note?.trim() || null;
  if (input.decision === "reject" && !note) return { ok: false as const, error: "보완·반려 사유를 입력해주세요." };
  const { data, error } = await supabase.from("partnership_inquiries").update({ status: input.decision === "approve" ? "approved" : "rejected", review_note: note, reviewed_at: new Date().toISOString(), reviewed_by: input.reviewedBy ?? null, updated_at: new Date().toISOString() }).eq("id", input.id).in("status", ["new", "reviewing"]).select("id,organization").maybeSingle();
  if (error || !data) return { ok: false as const, error: "처리 가능한 문의를 찾지 못했습니다." };
  return { ok: true as const, organization: data.organization };
}
