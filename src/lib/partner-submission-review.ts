import type { SupabaseClient } from "@supabase/supabase-js";
import { randomSuffix, slugify } from "@/lib/slug";
import { parseKstDateTimeInput } from "@/lib/datetime";

type SubmissionPayload = Record<string, string | boolean | string[]>;
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const parseDate = (value: unknown) => {
  const raw = clean(value);
  if (!raw) return null;
  return parseKstDateTimeInput(raw);
};
const isWebUrl = (value: string) => {
  if (!value) return false;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
};
const safeGalleryUrls = (value: unknown) => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === "string" && isWebUrl(item.trim())).map((item) => item.trim()).slice(0, 8)
  : [];
const validateEventPayload = (payload: SubmissionPayload) => {
  const startsAt = parseDate(payload.startsAt);
  const endsAt = parseDate(payload.endsAt);
  const deadline = parseDate(payload.deadline);
  if (!startsAt) return "행사 시작 일시가 올바르지 않습니다.";
  if (clean(payload.endsAt) && !endsAt) return "행사 종료 일시가 올바르지 않습니다.";
  if (endsAt && endsAt.getTime() < startsAt.getTime()) return "행사 종료 일시는 시작 일시 이후여야 합니다.";
  if (clean(payload.deadline) && !deadline) return "신청 마감 일시가 올바르지 않습니다.";
  if (deadline && deadline.getTime() > startsAt.getTime()) return "신청 마감은 행사 시작 이전이어야 합니다.";
  if (clean(payload.capacity)) {
    const capacity = Number(clean(payload.capacity));
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000) return "행사 정원 값이 올바르지 않습니다.";
  }
  return null;
};
const parseProgram = (value: string) => value.split("\n").map((line) => { const [time, title, speaker] = line.split("|").map((part) => part.trim()); return { time, title: title || time, speaker }; }).filter((item) => item.title).slice(0, 30);

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
    const eventValidationError = validateEventPayload(payload);
    if (eventValidationError) return { ok: false, error: eventValidationError };
    const startsAt = parseDate(payload.startsAt)!;
    const endsAt = parseDate(payload.endsAt);
    const deadline = parseDate(payload.deadline);
    path = `/events/${slug}`;
    ({ error: publishError } = await supabase.from("events").insert({ slug, name, host: clean(payload.host), starts_at: startsAt.toISOString(), ends_at: endsAt?.toISOString() ?? null, deadline: deadline?.toISOString() ?? null, location: clean(payload.location) || (Boolean(payload.isOnline) ? "온라인" : ""), is_online: Boolean(payload.isOnline), fee: clean(payload.fee) || null, is_paid: Boolean(payload.isPaid), payment_account: Boolean(payload.isPaid) ? clean(payload.paymentAccount) || null : null, payment_notice: Boolean(payload.isPaid) ? clean(payload.paymentNotice) || "입금 확인 후 주최자가 신청을 승인합니다." : null, category: clean(payload.category) || "기타", audience: clean(payload.audience) || null, description: clean(payload.description), gallery_urls: safeGalleryUrls(payload.galleryUrls), program: parseProgram(clean(payload.program)), apply_url: payload.registrationMode === "internal" ? null : clean(payload.applyUrl), registration_mode: payload.registrationMode === "internal" ? "internal" : "external", approval_mode: payload.isPaid ? "manual" : payload.approvalMode === "manual" ? "manual" : "instant", capacity: clean(payload.capacity) ? Number(clean(payload.capacity)) : null, waitlist_enabled: payload.waitlistEnabled !== false, cover_url: clean(payload.coverUrl) || null, submitted_by: row.user_id, is_featured: true, status: "published" }));
  } else if (row.submission_type === "support") {
    path = `/support/${slug}`;
    ({ error: publishError } = await supabase.from("support_programs").insert({ slug, name, agency: clean(payload.agency), target: clean(payload.target), benefits: clean(payload.benefits), amount: clean(payload.amount) || null, open_at: clean(payload.openAt) || null, close_at: clean(payload.closeAt), region: clean(payload.region) || "전국", field: clean(payload.field) || null, apply_url: clean(payload.applyUrl), status: "published" }));
  } else {
    path = `/communities/${slug}`;
    ({ error: publishError } = await supabase.from("communities").insert({ manager_user_id: row.user_id, slug, name, logo_url: clean(payload.logoUrl) || null, intro: clean(payload.intro), field: clean(payload.field), website: clean(payload.website) || null, sns: clean(payload.instagram) ? { instagram: clean(payload.instagram) } : {}, status: "published" }));
  }
  if (publishError) return { ok: false, error: `공개 데이터 생성에 실패했습니다: ${publishError.message}` };

  const { data: updatedSubmission, error: updateError } = await supabase.from("partner_submissions").update({ status: "approved", review_note: clean(input.note) || null, reviewed_at: new Date().toISOString(), reviewed_by: input.reviewedBy ?? null, published_path: path, updated_at: new Date().toISOString() }).eq("id", input.id).select("id").maybeSingle();
  if (updateError || !updatedSubmission) return { ok: false, error: "콘텐츠는 공개됐지만 제안 상태 갱신에 실패했습니다." };
  return { ok: true, path };
}
