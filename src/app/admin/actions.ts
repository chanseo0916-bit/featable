"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify, randomSuffix } from "@/lib/slug";
import { conciseSeoDescription, seoTitle } from "@/lib/content-seo";
import { syncBizinfoSupportPrograms as runBizinfoSync } from "@/lib/bizinfo-sync";
import { queueInterviewCampaign } from "@/lib/interview-campaigns";

function revalidateCuration() {
  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/support");
  revalidatePath("/partners");
  revalidatePath("/admin");
  revalidatePath("/admin/brands");
  revalidatePath("/admin/products");
  revalidatePath("/admin/events");
  revalidatePath("/admin/support");
  revalidatePath("/admin/partners");
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.role === "admin" ? supabase : null;
}

export async function sendInterviewMarketingEmail(featureId: string): Promise<{ error?: string; message?: string }> {
  const supabase = await requireAdmin();
  if (!supabase) return { error: "관리자 권한이 없습니다." };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };
  const result = await queueInterviewCampaign(featureId, user.id);
  revalidatePath("/admin/stories");
  return result;
}

/** 관리자만 공개 Founder 번호를 조정할 수 있습니다. 번호는 비워서 해제할 수도 있습니다. */
export async function updateFounderNumber(userId: string, rawValue: string): Promise<{ error?: string }> {
  const supabase = await requireAdmin();
  if (!supabase) return { error: "관리자 권한이 없습니다." };
  const value = rawValue.trim() === "" ? null : Number(rawValue.trim());
  if (value !== null && (!Number.isInteger(value) || value < 1 || value > 999999)) {
    return { error: "고유 번호는 1~999999 사이의 정수로 입력해주세요." };
  }

  const { data: founder } = await supabase.from("founders").select("id").eq("user_id", userId).maybeSingle();
  if (!founder) return { error: "아직 프로필 카드를 만들지 않은 사용자입니다." };
  if (value !== null) {
    const { data: duplicate } = await supabase.from("founders").select("id").eq("founder_number", value).neq("id", founder.id).maybeSingle();
    if (duplicate) return { error: "이미 다른 사용자가 사용 중인 번호입니다." };
  }

  const { data: updated, error } = await supabase.from("founders").update({ founder_number: value }).eq("id", founder.id).select("id").maybeSingle();
  if (error || !updated) return { error: `고유 번호 저장에 실패했습니다${error ? `: ${error.message}` : ": 대상이 이미 변경되었거나 없습니다."}` };
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/founders");
  return {};
}

export async function syncBizinfoSupportPrograms(): Promise<{ error?: string; message?: string }> {
  const supabase = await requireAdmin();
  if (!supabase) return { error: "관리자 권한이 없습니다." };
  try {
    const result = await runBizinfoSync();
    revalidatePath("/");
    revalidatePath("/support");
    revalidatePath("/admin/support");
    return { message: `기업마당 ${result.fetched}건 확인 · 신규 ${result.inserted}건 · 갱신 ${result.updated}건 · 제외 ${result.skipped}건` };
  } catch (error) {
    console.error("[bizinfo] Admin synchronization failed.", error);
    return { error: error instanceof Error ? error.message : "기업마당 동기화에 실패했습니다." };
  }
}

export type AdminTable = "brands" | "products" | "events" | "support_programs" | "partners" | "features";
export type AdminEditableTable = AdminTable;
export type AdminEditPayload = Record<string, string | boolean>;

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isWebUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function publicPath(table: AdminTable, slug?: string | null) {
  if (!slug) return null;
  if (table === "support_programs") return `/support/${slug}`;
  if (table === "features") return `/stories/${slug}`;
  return `/${table}/${slug}`;
}

export async function updateAdminContent(
  table: AdminEditableTable,
  id: string,
  input: AdminEditPayload,
): Promise<{ error?: string }> {
  const supabase = await requireAdmin();
  if (!supabase) return { error: "관리자 권한이 없습니다." };
  if (!clean(input.name)) return { error: "이름은 필수입니다." };

  const { data: current } = table === "partners"
    ? { data: null }
    : await supabase.from(table).select("slug").eq("id", id).maybeSingle();
  let error: { message: string } | null = null;
  let changed = false;

  if (table === "brands") {
    const result = await supabase.from("brands").update({
      name: clean(input.name), tagline: clean(input.tagline), category: clean(input.category) || "기타",
      description: clean(input.description), website: clean(input.website) || null,
      logo_url: clean(input.logoUrl) || null, cover_url: clean(input.coverUrl) || null,
      problem: clean(input.problem) || null, audience: clean(input.audience) || null,
      updated_at: new Date().toISOString(),
    }).eq("id", id).select("id").maybeSingle();
    error = result.error;
    changed = Boolean(result.data);
  } else if (table === "products") {
    const result = await supabase.from("products").update({
      name: clean(input.name), tagline: clean(input.tagline), category: clean(input.category) || "기타",
      problem: clean(input.problem), solution: clean(input.solution), price: clean(input.price) || null,
      buy_url: clean(input.buyUrl) || null, official_url: clean(input.officialUrl) || null,
      hero_url: clean(input.heroUrl) || null,
      features: clean(input.features).split("\n").map((item) => item.trim()).filter(Boolean),
      updated_at: new Date().toISOString(),
    }).eq("id", id).select("id").maybeSingle();
    error = result.error;
    changed = Boolean(result.data);
  } else if (table === "events") {
    const startsAt = clean(input.startsAt);
    if (!startsAt || Number.isNaN(Date.parse(startsAt))) return { error: "행사 일시를 확인해주세요." };
    const registrationMode = clean(input.registrationMode) === "internal" ? "internal" : "external";
    if (registrationMode === "external" && !isWebUrl(clean(input.applyUrl))) return { error: "외부 신청 URL을 확인해주세요." };
    const capacity = clean(input.capacity) ? Number(clean(input.capacity)) : null;
    if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) return { error: "정원은 1명 이상으로 입력해주세요." };
    const result = await supabase.from("events").update({
      name: clean(input.name), host: clean(input.host), starts_at: new Date(startsAt).toISOString(),
      location: clean(input.location), is_online: Boolean(input.isOnline), fee: clean(input.fee) || null,
      category: clean(input.category) || "기타", audience: clean(input.audience) || null,
      apply_url: registrationMode === "internal" ? null : clean(input.applyUrl),
      registration_mode: registrationMode,
      approval_mode: clean(input.approvalMode) === "manual" ? "manual" : "instant",
      capacity,
      waitlist_enabled: Boolean(input.waitlistEnabled),
      cover_url: clean(input.coverUrl) || null,
    }).eq("id", id).select("id").maybeSingle();
    error = result.error;
    changed = Boolean(result.data);
  } else if (table === "support_programs") {
    if (!clean(input.closeAt)) return { error: "마감일은 필수입니다." };
    const result = await supabase.from("support_programs").update({
      name: clean(input.name), agency: clean(input.agency), target: clean(input.target),
      benefits: clean(input.benefits), amount: clean(input.amount) || null,
      open_at: clean(input.openAt) || null, close_at: clean(input.closeAt),
      region: clean(input.region) || "전국", field: clean(input.field) || null,
      apply_url: clean(input.applyUrl),
    }).eq("id", id).select("id").maybeSingle();
    error = result.error;
    changed = Boolean(result.data);
  } else {
    const result = await supabase.from("partners").update({
      name: clean(input.name), logo_url: clean(input.logoUrl), href: clean(input.href),
      intro: clean(input.intro), field: clean(input.field) || null,
      description: clean(input.description) || null,
    }).eq("id", id).select("id").maybeSingle();
    error = result.error;
    changed = Boolean(result.data);
  }
  if (error || !changed) return { error: `수정에 실패했습니다: ${error?.message ?? "대상이 이미 변경되었거나 없습니다."}` };

  revalidateCuration();
  const target = publicPath(table, current?.slug);
  if (target) revalidatePath(target);
  return {};
}

export async function deleteAdminContent(
  table: AdminEditableTable,
  id: string,
): Promise<{ error?: string }> {
  const supabase = await requireAdmin();
  if (!supabase) return { error: "관리자 권한이 없습니다." };
  const { data: deleted, error } = await supabase.from(table).delete().eq("id", id).select("id").maybeSingle();
  if (error || !deleted) return { error: `삭제에 실패했거나 대상이 이미 없습니다${error ? `: ${error.message}` : "."}` };
  revalidateCuration();
  return {};
}

export async function setFeatured(
  table: AdminTable,
  id: string,
  value: boolean,
): Promise<{ error?: string }> {
  const supabase = await requireAdmin();
  if (!supabase) return { error: "관리자 권한이 없습니다." };

  const { data: updated, error } = await supabase
    .from(table)
    .update({ is_featured: value })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !updated) return { error: "변경에 실패했거나 대상이 없습니다." };

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/admin/${table}`);
  return {};
}

export async function setStatus(
  table: AdminTable,
  id: string,
  status: "published" | "hidden",
): Promise<{ error?: string }> {
  const supabase = await requireAdmin();
  if (!supabase) return { error: "관리자 권한이 없습니다." };

  const { data: updated, error } = await supabase.from(table).update({ status }).eq("id", id).select("id").maybeSingle();
  if (error || !updated) return { error: "변경에 실패했거나 대상이 없습니다." };

  revalidateCuration();
  return {};
}

export interface EventInput {
  name: string;
  host: string;
  startsAt: string; // datetime-local
  location: string;
  isOnline: boolean;
  fee?: string;
  category: string;
  audience?: string;
  applyUrl?: string;
  coverUrl?: string;
  registrationMode: "external" | "internal";
  approvalMode: "instant" | "manual";
  capacity?: string;
  waitlistEnabled: boolean;
}

export async function createEvent(input: EventInput): Promise<{ error?: string }> {
  const supabase = await requireAdmin();
  if (!supabase) return { error: "관리자 권한이 없습니다." };
  if (!input.name.trim() || !input.startsAt) {
    return { error: "행사명과 일시는 필수입니다." };
  }
  if (Number.isNaN(Date.parse(input.startsAt))) return { error: "행사 일시를 확인해주세요." };
  if (input.registrationMode === "external" && !isWebUrl(input.applyUrl?.trim() ?? "")) return { error: "외부 신청 URL을 확인해주세요." };
  const capacity = input.capacity?.trim() ? Number(input.capacity) : null;
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) return { error: "정원은 1명 이상으로 입력해주세요." };

  const slug = `${slugify(input.name) || "event"}-${randomSuffix()}`;
  const { error } = await supabase.from("events").insert({
    slug,
    name: input.name.trim(),
    host: input.host.trim(),
    starts_at: new Date(input.startsAt).toISOString(),
    location: input.location.trim() || (input.isOnline ? "온라인" : ""),
    is_online: input.isOnline,
    fee: input.fee?.trim() || null,
    category: input.category,
    audience: input.audience?.trim() || null,
    apply_url: input.registrationMode === "internal" ? null : input.applyUrl?.trim(),
    registration_mode: input.registrationMode,
    approval_mode: input.approvalMode,
    capacity,
    waitlist_enabled: input.waitlistEnabled,
    cover_url: input.coverUrl?.trim() || null,
    status: "published",
  });
  if (error) return { error: "행사 등록에 실패했습니다." };

  revalidateCuration();
  return {};
}

export interface SupportInput {
  name: string;
  agency: string;
  target: string;
  benefits: string;
  amount?: string;
  openAt?: string; // date
  closeAt: string; // date
  region: string;
  field?: string;
  applyUrl: string;
}

export async function createSupportProgram(
  input: SupportInput,
): Promise<{ error?: string }> {
  const supabase = await requireAdmin();
  if (!supabase) return { error: "관리자 권한이 없습니다." };
  if (!input.name.trim() || !input.closeAt || !input.applyUrl.trim()) {
    return { error: "사업명, 마감일, 공고 링크는 필수입니다." };
  }

  const slug = `${slugify(input.name) || "support"}-${randomSuffix()}`;
  const { error } = await supabase.from("support_programs").insert({
    slug,
    name: input.name.trim(),
    agency: input.agency.trim(),
    target: input.target.trim(),
    benefits: input.benefits.trim(),
    amount: input.amount?.trim() || null,
    open_at: input.openAt || null,
    close_at: input.closeAt,
    region: input.region.trim() || "전국",
    field: input.field?.trim() || null,
    apply_url: input.applyUrl.trim(),
    status: "published",
  });
  if (error) return { error: "지원사업 등록에 실패했습니다." };

  revalidateCuration();
  return {};
}

export interface PartnerInput {
  name: string;
  logoUrl: string;
  href: string;
  intro: string;
  field?: string;
  description?: string;
  /** Featured Partner = VIP 노출, false = Basic */
  isFeatured?: boolean;
}

export async function createPartner(input: PartnerInput): Promise<{ error?: string }> {
  const supabase = await requireAdmin();
  if (!supabase) return { error: "관리자 권한이 없습니다." };
  if (!input.name.trim() || !input.href.trim() || !input.intro.trim()) {
    return { error: "파트너명, 링크, 한 줄 소개는 필수입니다." };
  }

  const { error } = await supabase.from("partners").insert({
    name: input.name.trim(),
    logo_url: input.logoUrl.trim() || `https://picsum.photos/seed/partner-${slugify(input.name) || randomSuffix()}/160/160`,
    href: input.href.trim(),
    intro: input.intro.trim(),
    field: input.field?.trim() || null,
    description: input.description?.trim() || null,
    is_featured: Boolean(input.isFeatured),
    status: "published",
  });
  if (error) return { error: `파트너 등록에 실패했습니다: ${error.message}` };

  revalidateCuration();
  return {};
}

export async function deleteCuration(
  table: "events" | "support_programs" | "partners",
  id: string,
): Promise<{ error?: string }> {
  const supabase = await requireAdmin();
  if (!supabase) return { error: "관리자 권한이 없습니다." };

  const { data: deleted, error } = await supabase.from(table).delete().eq("id", id).select("id").maybeSingle();
  if (error || !deleted) return { error: "삭제에 실패했거나 대상이 이미 없습니다." };

  revalidateCuration();
  return {};
}

// ── 스토리(피처) — 언론 기사식 에디토리얼 발행 ──────────────────

export interface StoryInput {
  title: string;
  kind: string;
  excerpt: string;
  coverUrl?: string;
  brandId?: string;
  founderId?: string;
  hookIntro?: string;
  hookLabel?: string;
  body: import("@/lib/types").StoryBlock[];
  publish: boolean;
}

function revalidateStories(slug?: string) {
  revalidatePath("/");
  revalidatePath("/stories");
  revalidatePath("/admin/stories");
  if (slug) revalidatePath(`/stories/${slug}`);
}

async function founderIdForBrand(
  supabase: NonNullable<Awaited<ReturnType<typeof requireAdmin>>>,
  brandId?: string,
): Promise<string | null> {
  if (!brandId) return null;
  const { data } = await supabase.from("brands").select("founder_id").eq("id", brandId).maybeSingle();
  return data?.founder_id ?? null;
}

export async function createStory(input: StoryInput): Promise<{ error?: string; slug?: string }> {
  const supabase = await requireAdmin();
  if (!supabase) return { error: "관리자 권한이 없습니다." };
  if (!input.title.trim() || !input.excerpt.trim()) {
    return { error: "제목과 요약은 필수입니다." };
  }

  const slug = `${slugify(input.title) || "story"}-${randomSuffix()}`;
  const { error } = await supabase.from("features").insert({
    slug,
    title: input.title.trim(),
    kind: input.kind,
    excerpt: input.excerpt.trim(),
    cover_url: input.coverUrl?.trim() || null,
    body: input.body,
    brand_id: input.brandId || null,
    founder_id: input.founderId || await founderIdForBrand(supabase, input.brandId),
    hook_intro: input.hookIntro?.trim() || null,
    hook_label: input.hookLabel?.trim() || null,
    status: input.publish ? "published" : "draft",
    published_at: input.publish ? new Date().toISOString() : null,
    seo_title: seoTitle(undefined, input.title.trim()),
    seo_description: conciseSeoDescription(input.excerpt),
    primary_keyword: input.title.trim(),
    og_image_url: input.coverUrl?.trim() || null,
    is_indexable: input.publish,
  });
  if (error) return { error: `스토리 저장에 실패했습니다: ${error.message}` };

  revalidateStories(slug);
  return { slug };
}

export async function updateStory(id: string, input: StoryInput): Promise<{ error?: string; slug?: string }> {
  const supabase = await requireAdmin();
  if (!supabase) return { error: "관리자 권한이 없습니다." };
  if (!input.title.trim() || !input.excerpt.trim()) {
    return { error: "제목과 요약은 필수입니다." };
  }

  const { data: current } = await supabase.from("features").select("slug,published_at").eq("id", id).maybeSingle();
  if (!current) return { error: "스토리를 찾을 수 없습니다." };

  const { data: updated, error } = await supabase.from("features").update({
    title: input.title.trim(),
    kind: input.kind,
    excerpt: input.excerpt.trim(),
    cover_url: input.coverUrl?.trim() || null,
    body: input.body,
    brand_id: input.brandId || null,
    founder_id: input.founderId || await founderIdForBrand(supabase, input.brandId),
    hook_intro: input.hookIntro?.trim() || null,
    hook_label: input.hookLabel?.trim() || null,
    status: input.publish ? "published" : "draft",
    published_at: input.publish ? (current.published_at ?? new Date().toISOString()) : current.published_at,
    seo_title: seoTitle(undefined, input.title.trim()),
    seo_description: conciseSeoDescription(input.excerpt),
    primary_keyword: input.title.trim(),
    og_image_url: input.coverUrl?.trim() || null,
    is_indexable: input.publish,
    updated_at: new Date().toISOString(),
  }).eq("id", id).select("id").maybeSingle();
  if (error || !updated) return { error: `스토리 수정에 실패했습니다: ${error?.message ?? "대상이 이미 변경되었거나 없습니다."}` };

  revalidateStories(current.slug);
  return { slug: current.slug };
}
