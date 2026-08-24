"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface CommunityEditInput {
  name: string;
  logoUrl: string;
  field: string;
  intro: string;
  website: string;
  instagram: string;
}

type ActionResult = { ok: true; savedAt: number } | { ok: false; error: string };
const clean = (value: string, max: number) => value.trim().slice(0, max);

function webUrl(value: string) {
  if (!value) return true;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}

export async function updateManagedCommunity(slug: string, input: CommunityEditInput): Promise<ActionResult> {
  const access = await requireCommunityAccess(slug);
  if ("error" in access) return { ok: false, error: access.error };
  if (access.role === "editor") return { ok: false, error: "에디터는 연결 콘텐츠만 관리할 수 있습니다." };

  const payload = {
    name: clean(input.name, 100),
    logoUrl: clean(input.logoUrl, 500),
    field: clean(input.field, 60),
    intro: clean(input.intro, 180),
    website: clean(input.website, 500),
    instagram: clean(input.instagram.replace(/^@/, ""), 100),
  };
  if (payload.name.length < 2 || !payload.field || payload.intro.length < 5) return { ok: false, error: "이름, 분야, 한 줄 소개를 확인해주세요." };
  if (!payload.logoUrl || !webUrl(payload.logoUrl)) return { ok: false, error: "로고 이미지를 등록해주세요." };
  if (!webUrl(payload.website)) return { ok: false, error: "웹사이트 주소를 확인해주세요." };

  const { data: owned } = await access.admin
    .from("communities")
    .select("id,sns")
    .eq("slug", slug)
    .maybeSingle();
  if (!owned) return { ok: false, error: "이 커뮤니티를 수정할 권한이 없습니다." };

  const currentSns = owned.sns && typeof owned.sns === "object" ? owned.sns as Record<string, unknown> : {};
  const nextSns = { ...currentSns };
  if (payload.instagram) nextSns.instagram = payload.instagram;
  else delete nextSns.instagram;

  const { error } = await access.admin.from("communities").update({
    name: payload.name,
    logo_url: payload.logoUrl,
    field: payload.field,
    intro: payload.intro,
    website: payload.website || null,
    sns: nextSns,
  }).eq("id", owned.id);
  if (error) return { ok: false, error: `수정 내용을 저장하지 못했습니다: ${error.message}` };

  ["/", "/communities", `/communities/${slug}`, "/my", "/my/communities", `/my/communities/${slug}`, "/sitemap.xml"].forEach((path) => revalidatePath(path));
  return { ok: true, savedAt: Date.now() };
}

type CommunityAccess = {
  admin: NonNullable<ReturnType<typeof createAdminClient>>;
  userId: string;
  communityId: string;
  communityName: string;
  isOwner: boolean;
  role: "owner" | "manager" | "editor";
};

async function requireCommunityAccess(slug: string): Promise<CommunityAccess | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };
  const admin = createAdminClient();
  if (!admin) return { error: "커뮤니티 관리 도구를 준비하지 못했습니다." };

  const { data: community } = await admin.from("communities").select("id,name,manager_user_id").eq("slug", slug).maybeSingle();
  if (!community) return { error: "커뮤니티를 찾을 수 없습니다." };
  const isOwner = community.manager_user_id === user.id;
  let role: CommunityAccess["role"] = "owner";
  if (!isOwner) {
    const { data: manager } = await admin.from("community_managers").select("role").eq("community_id", community.id).eq("user_id", user.id).maybeSingle();
    if (!manager) return { error: "이 커뮤니티를 관리할 권한이 없습니다." };
    role = manager.role === "editor" ? "editor" : "manager";
  }
  return { admin, userId: user.id, communityId: community.id, communityName: community.name, isOwner, role };
}

function refreshCommunityOperations(slug: string) {
  ["/", "/communities", `/communities/${slug}`, "/my", "/my/communities", `/my/communities/${slug}`]
    .forEach((path) => revalidatePath(path));
}

export async function addCommunityFounder(slug: string, founderId: string): Promise<ActionResult> {
  const access = await requireCommunityAccess(slug);
  if ("error" in access) return { ok: false, error: access.error };
  const { data: founder } = await access.admin.from("founders").select("id").eq("id", founderId).maybeSingle();
  if (!founder) return { ok: false, error: "Founder를 찾을 수 없습니다." };
  const { error } = await access.admin.from("community_founders").upsert({ community_id: access.communityId, founder_id: founderId }, { onConflict: "community_id,founder_id" });
  if (error) return { ok: false, error: `Founder를 연결하지 못했습니다: ${error.message}` };
  refreshCommunityOperations(slug);
  return { ok: true, savedAt: Date.now() };
}

export async function removeCommunityFounder(slug: string, founderId: string): Promise<ActionResult> {
  const access = await requireCommunityAccess(slug);
  if ("error" in access) return { ok: false, error: access.error };
  const { error } = await access.admin.from("community_founders").delete().eq("community_id", access.communityId).eq("founder_id", founderId);
  if (error) return { ok: false, error: "Founder 연결을 해제하지 못했습니다." };
  refreshCommunityOperations(slug);
  return { ok: true, savedAt: Date.now() };
}

async function canUseBrand(admin: NonNullable<ReturnType<typeof createAdminClient>>, userId: string, brandId: string) {
  const [{ data: founder }, { data: membership }] = await Promise.all([
    admin.from("founders").select("id").eq("user_id", userId).maybeSingle(),
    admin.from("brand_members").select("brand_id").eq("brand_id", brandId).eq("user_id", userId).maybeSingle(),
  ]);
  if (membership) return true;
  if (!founder) return false;
  const { data: brand } = await admin.from("brands").select("id").eq("id", brandId).eq("founder_id", founder.id).maybeSingle();
  return Boolean(brand);
}

export async function linkCommunityBrand(slug: string, brandId: string): Promise<ActionResult> {
  const access = await requireCommunityAccess(slug);
  if ("error" in access) return { ok: false, error: access.error };
  if (!await canUseBrand(access.admin, access.userId, brandId)) return { ok: false, error: "내가 소유하거나 참여 중인 브랜드만 연결할 수 있습니다." };
  const { error } = await access.admin.from("community_brands").upsert({ community_id: access.communityId, brand_id: brandId }, { onConflict: "community_id,brand_id" });
  if (error) return { ok: false, error: `브랜드를 연결하지 못했습니다: ${error.message}` };
  refreshCommunityOperations(slug);
  return { ok: true, savedAt: Date.now() };
}

export async function unlinkCommunityBrand(slug: string, brandId: string): Promise<ActionResult> {
  const access = await requireCommunityAccess(slug);
  if ("error" in access) return { ok: false, error: access.error };
  const { error } = await access.admin.from("community_brands").delete().eq("community_id", access.communityId).eq("brand_id", brandId);
  if (error) return { ok: false, error: "브랜드 연결을 해제하지 못했습니다." };
  refreshCommunityOperations(slug);
  return { ok: true, savedAt: Date.now() };
}

async function canUseEvent(admin: NonNullable<ReturnType<typeof createAdminClient>>, userId: string, eventId: string) {
  const [{ data: event }, { data: cohost }] = await Promise.all([
    admin.from("events").select("id,submitted_by").eq("id", eventId).maybeSingle(),
    admin.from("event_cohosts").select("id").eq("event_id", eventId).eq("user_id", userId).maybeSingle(),
  ]);
  return Boolean(event && (event.submitted_by === userId || cohost));
}

export async function linkCommunityEvent(slug: string, eventId: string): Promise<ActionResult> {
  const access = await requireCommunityAccess(slug);
  if ("error" in access) return { ok: false, error: access.error };
  if (!await canUseEvent(access.admin, access.userId, eventId)) return { ok: false, error: "내가 주최하거나 공동 주최하는 행사만 연결할 수 있습니다." };
  const { error } = await access.admin.from("events").update({ community_id: access.communityId }).eq("id", eventId);
  if (error) return { ok: false, error: `행사를 연결하지 못했습니다: ${error.message}` };
  refreshCommunityOperations(slug);
  return { ok: true, savedAt: Date.now() };
}

export async function unlinkCommunityEvent(slug: string, eventId: string): Promise<ActionResult> {
  const access = await requireCommunityAccess(slug);
  if ("error" in access) return { ok: false, error: access.error };
  const { data: event } = await access.admin.from("events").select("community_id").eq("id", eventId).maybeSingle();
  if (event?.community_id !== access.communityId) return { ok: false, error: "이 커뮤니티에 연결된 행사가 아닙니다." };
  const { error } = await access.admin.from("events").update({ community_id: null }).eq("id", eventId);
  if (error) return { ok: false, error: "행사 연결을 해제하지 못했습니다." };
  refreshCommunityOperations(slug);
  return { ok: true, savedAt: Date.now() };
}

export async function addCommunityManager(slug: string, emailInput: string, role: "manager" | "editor"): Promise<ActionResult> {
  const access = await requireCommunityAccess(slug);
  if ("error" in access) return { ok: false, error: access.error };
  if (!access.isOwner) return { ok: false, error: "대표 운영자만 공동 운영자를 추가할 수 있습니다." };
  const email = clean(emailInput.toLowerCase(), 254);
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Featable 가입 이메일을 확인해주세요." };
  const { data: profile } = await access.admin.from("profiles").select("id,email,full_name").ilike("email", email).maybeSingle();
  if (!profile) return { ok: false, error: "해당 이메일로 가입한 Featable 계정을 찾지 못했습니다." };
  if (profile.id === access.userId) return { ok: false, error: "대표 운영자는 이미 모든 권한을 가지고 있습니다." };
  const { error } = await access.admin.from("community_managers").upsert({ community_id: access.communityId, user_id: profile.id, role, added_by: access.userId }, { onConflict: "community_id,user_id" });
  if (error) return { ok: false, error: "공동 운영자를 추가하지 못했습니다. migration-39 적용 여부를 확인해주세요." };
  await access.admin.from("notifications").insert({
    user_id: profile.id,
    actor_id: access.userId,
    type: "system",
    title: `${access.communityName} 운영팀에 초대됐어요`,
    message: role === "manager" ? "커뮤니티 정보와 연결 콘텐츠를 함께 관리할 수 있습니다." : "커뮤니티 연결 콘텐츠를 함께 관리할 수 있습니다.",
    href: `/my/communities/${slug}`,
    data: { kind: "community_manager", community_id: access.communityId, community_slug: slug, role },
  });
  refreshCommunityOperations(slug);
  return { ok: true, savedAt: Date.now() };
}

export async function removeCommunityManager(slug: string, userId: string): Promise<ActionResult> {
  const access = await requireCommunityAccess(slug);
  if ("error" in access) return { ok: false, error: access.error };
  if (!access.isOwner) return { ok: false, error: "대표 운영자만 공동 운영자를 삭제할 수 있습니다." };
  const { error } = await access.admin.from("community_managers").delete().eq("community_id", access.communityId).eq("user_id", userId);
  if (error) return { ok: false, error: "공동 운영자를 삭제하지 못했습니다." };
  refreshCommunityOperations(slug);
  return { ok: true, savedAt: Date.now() };
}

export async function updateCommunityManagerRole(slug: string, userId: string, role: "manager" | "editor"): Promise<ActionResult> {
  const access = await requireCommunityAccess(slug);
  if ("error" in access) return { ok: false, error: access.error };
  if (!access.isOwner) return { ok: false, error: "대표 운영자만 권한을 변경할 수 있습니다." };
  const { error } = await access.admin.from("community_managers").update({ role }).eq("community_id", access.communityId).eq("user_id", userId);
  if (error) return { ok: false, error: "공동 운영자 권한을 변경하지 못했습니다." };
  refreshCommunityOperations(slug);
  return { ok: true, savedAt: Date.now() };
}
