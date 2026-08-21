import type { SupabaseClient } from "@supabase/supabase-js";
import { randomSuffix, slugify } from "@/lib/slug";

type SubmissionPayload = Record<string, string | boolean>;
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";

export async function reviewPartnerSubmissionWithClient(
  supabase: SupabaseClient,
  input: { id: string; decision: "approve" | "reject"; note?: string; reviewedBy?: string | null },
): Promise<{ ok: boolean; error?: string; path?: string }> {
  const { data: row, error: readError } = await supabase
    .from("partner_submissions")
    .select("id,user_id,submission_type,status,title,payload")
    .eq("id", input.id)
    .in("status", ["submitted", "in_review"])
    .maybeSingle();
  if (readError || !row) return { ok: false, error: "검수 가능한 제안을 찾지 못했습니다." };

  if (input.decision === "reject") {
    const note = clean(input.note);
    if (!note) return { ok: false, error: "보완이 필요한 내용을 적어주세요." };
    const { error } = await supabase.from("partner_submissions").update({ status: "rejected", review_note: note, reviewed_at: new Date().toISOString(), reviewed_by: input.reviewedBy ?? null, updated_at: new Date().toISOString() }).eq("id", input.id);
    return error ? { ok: false, error: "반려 상태를 저장하지 못했습니다." } : { ok: true };
  }

  const payload = row.payload as SubmissionPayload;
  const name = clean(payload.name) || row.title;
  const slug = `${slugify(name) || row.submission_type}-${randomSuffix()}`;
  let path = "";
  let publishError: { message: string } | null = null;

  if (row.submission_type === "event") {
    path = `/events/${slug}`;
    ({ error: publishError } = await supabase.from("events").insert({ slug, name, host: clean(payload.host), starts_at: new Date(clean(payload.startsAt)).toISOString(), ends_at: clean(payload.endsAt) ? new Date(clean(payload.endsAt)).toISOString() : null, location: clean(payload.location) || (Boolean(payload.isOnline) ? "온라인" : ""), is_online: Boolean(payload.isOnline), fee: clean(payload.fee) || null, category: clean(payload.category) || "기타", audience: clean(payload.audience) || null, apply_url: clean(payload.applyUrl), cover_url: clean(payload.coverUrl) || null, status: "published" }));
  } else if (row.submission_type === "support") {
    path = `/support/${slug}`;
    ({ error: publishError } = await supabase.from("support_programs").insert({ slug, name, agency: clean(payload.agency), target: clean(payload.target), benefits: clean(payload.benefits), amount: clean(payload.amount) || null, open_at: clean(payload.openAt) || null, close_at: clean(payload.closeAt), region: clean(payload.region) || "전국", field: clean(payload.field) || null, apply_url: clean(payload.applyUrl), status: "published" }));
  } else {
    path = `/communities/${slug}`;
    ({ error: publishError } = await supabase.from("communities").insert({ manager_user_id: row.user_id, slug, name, logo_url: clean(payload.logoUrl) || null, intro: clean(payload.intro), field: clean(payload.field), website: clean(payload.website) || null, sns: clean(payload.instagram) ? { instagram: clean(payload.instagram) } : {}, status: "published" }));
  }
  if (publishError) return { ok: false, error: `공개 데이터 생성에 실패했습니다: ${publishError.message}` };

  const { error: updateError } = await supabase.from("partner_submissions").update({ status: "approved", review_note: clean(input.note) || null, reviewed_at: new Date().toISOString(), reviewed_by: input.reviewedBy ?? null, published_path: path, updated_at: new Date().toISOString() }).eq("id", input.id);
  if (updateError) return { ok: false, error: "콘텐츠는 공개됐지만 제안 상태 갱신에 실패했습니다." };
  return { ok: true, path };
}
