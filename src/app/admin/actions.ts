"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify, randomSuffix } from "@/lib/slug";

function revalidateCuration() {
  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/support");
  revalidatePath("/partners");
  revalidatePath("/admin");
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

export type AdminTable = "brands" | "products" | "events" | "support_programs" | "partners";

export async function setFeatured(
  table: AdminTable,
  id: string,
  value: boolean,
): Promise<{ error?: string }> {
  const supabase = await requireAdmin();
  if (!supabase) return { error: "관리자 권한이 없습니다." };

  const { error } = await supabase
    .from(table)
    .update({ is_featured: value })
    .eq("id", id);
  if (error) return { error: "변경에 실패했습니다." };

  revalidatePath("/");
  revalidatePath("/admin");
  return {};
}

export async function setStatus(
  table: AdminTable,
  id: string,
  status: "published" | "hidden",
): Promise<{ error?: string }> {
  const supabase = await requireAdmin();
  if (!supabase) return { error: "관리자 권한이 없습니다." };

  const { error } = await supabase.from(table).update({ status }).eq("id", id);
  if (error) return { error: "변경에 실패했습니다." };

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
  applyUrl: string;
  coverUrl?: string;
}

export async function createEvent(input: EventInput): Promise<{ error?: string }> {
  const supabase = await requireAdmin();
  if (!supabase) return { error: "관리자 권한이 없습니다." };
  if (!input.name.trim() || !input.startsAt || !input.applyUrl.trim()) {
    return { error: "행사명, 일시, 신청 링크는 필수입니다." };
  }

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
    apply_url: input.applyUrl.trim(),
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
    status: "published",
  });
  if (error) return { error: "파트너 등록에 실패했습니다." };

  revalidateCuration();
  return {};
}

export async function deleteCuration(
  table: "events" | "support_programs" | "partners",
  id: string,
): Promise<{ error?: string }> {
  const supabase = await requireAdmin();
  if (!supabase) return { error: "관리자 권한이 없습니다." };

  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return { error: "삭제에 실패했습니다." };

  revalidateCuration();
  return {};
}
