"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomSuffix, slugify } from "@/lib/slug";

export interface PublishingProfileInput {
  name: string;
  logoUrl: string;
  field: string;
  intro: string;
  description: string;
  website: string;
  instagram: string;
}
type ActionResult = { ok: true; path?: string; savedAt?: number } | { ok: false; error: string };

const clean = (value: string, max: number) => value.trim().slice(0, max);
function webUrl(value: string) {
  if (!value) return true;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}

async function authorizedInvitation(token: string) {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다." };
  const admin = createAdminClient();
  if (!admin) return { ok: false as const, error: "등록 서버 설정을 확인할 수 없습니다." };
  const { data: invitation } = await admin.from("publishing_invitations")
    .select("id,token,registration_type,invitee_email,user_id,notification_id,status,expires_at,entity_id")
    .eq("token", token).maybeSingle();
  if (!invitation) return { ok: false as const, error: "유효하지 않은 등록 초대입니다." };
  if (new Date(invitation.expires_at).getTime() < Date.now() || invitation.status === "expired") {
    await admin.from("publishing_invitations").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", invitation.id);
    return { ok: false as const, error: "등록 초대가 만료됐습니다. Featable에 문의해주세요." };
  }
  const emailMatches = Boolean(user.email && user.email.toLowerCase() === invitation.invitee_email.toLowerCase());
  if (invitation.user_id && invitation.user_id !== user.id) return { ok: false as const, error: "이 등록 초대를 사용할 권한이 없습니다." };
  if (!invitation.user_id && !emailMatches) return { ok: false as const, error: "문의에 사용한 이메일 계정으로 로그인해주세요." };
  if (!invitation.user_id) {
    await admin.from("publishing_invitations").update({ user_id: user.id, claimed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", invitation.id).is("user_id", null);
  }
  return { ok: true as const, admin, user, invitation };
}

function sanitized(input: PublishingProfileInput): PublishingProfileInput {
  return {
    name: clean(input.name, 100),
    logoUrl: clean(input.logoUrl, 500),
    field: clean(input.field, 60),
    intro: clean(input.intro, 180),
    description: clean(input.description, 2000),
    website: clean(input.website, 500),
    instagram: clean(input.instagram, 100),
  };
}

export async function savePublishingProfile(token: string, input: PublishingProfileInput): Promise<ActionResult> {
  const access = await authorizedInvitation(token);
  if (!access.ok) return access;
  if (access.invitation.status === "published") return { ok: false, error: "이미 공개가 완료된 등록입니다." };
  const payload = sanitized(input);
  const savedAt = Date.now();
  const { error } = await access.admin.from("publishing_invitations").update({
    draft_payload: payload,
    status: "editing",
    updated_at: new Date(savedAt).toISOString(),
  }).eq("id", access.invitation.id).eq("user_id", access.user.id).in("status", ["pending", "editing"]);
  return error ? { ok: false, error: "임시저장하지 못했습니다." } : { ok: true, savedAt };
}

export async function publishApprovedProfile(token: string, input: PublishingProfileInput): Promise<ActionResult> {
  const access = await authorizedInvitation(token);
  if (!access.ok) return access;
  if (access.invitation.status === "published") return { ok: false, error: "이미 공개가 완료된 등록입니다." };
  const payload = sanitized(input);
  if (payload.name.length < 2 || !payload.field || payload.intro.length < 5) return { ok: false, error: "이름, 분야, 한 줄 소개를 확인해주세요." };
  if (!payload.logoUrl || !webUrl(payload.logoUrl)) return { ok: false, error: "로고 이미지를 등록해주세요." };
  if (!webUrl(payload.website)) return { ok: false, error: "웹사이트 주소를 확인해주세요." };

  const slug = `${slugify(payload.name) || access.invitation.registration_type}-${randomSuffix()}`;
  let path: string;
  let entityId: string | null = null;
  if (access.invitation.registration_type === "partner") {
    path = "/partners";
    const { data, error } = await access.admin.from("partners").insert({
      owner_user_id: access.user.id,
      name: payload.name,
      logo_url: payload.logoUrl,
      href: payload.website || "/partners",
      intro: payload.intro,
      description: payload.description || payload.intro,
      field: payload.field,
      status: "published",
      is_featured: false,
    }).select("id").single();
    if (error || !data) return { ok: false, error: `파트너 프로필을 공개하지 못했습니다: ${error?.message || "저장 실패"}` };
    entityId = data.id;
  } else {
    path = `/communities/${slug}`;
    const { data, error } = await access.admin.from("communities").insert({
      manager_user_id: access.user.id,
      slug,
      name: payload.name,
      logo_url: payload.logoUrl,
      intro: payload.intro,
      field: payload.field,
      website: payload.website || null,
      sns: payload.instagram ? { instagram: payload.instagram.replace(/^@/, "") } : {},
      status: "published",
    }).select("id").single();
    if (error || !data) return { ok: false, error: `커뮤니티를 공개하지 못했습니다: ${error?.message || "저장 실패"}` };
    entityId = data.id;
  }

  const publishedAt = new Date().toISOString();
  await access.admin.from("publishing_invitations").update({
    draft_payload: payload,
    status: "published",
    entity_id: entityId,
    published_at: publishedAt,
    updated_at: publishedAt,
  }).eq("id", access.invitation.id).eq("user_id", access.user.id).in("status", ["pending", "editing"]);
  if (access.invitation.notification_id) {
    await access.admin.from("notifications").update({
      title: access.invitation.registration_type === "partner" ? "파트너 등록을 완료했어요" : "커뮤니티 등록을 완료했어요",
      message: `${payload.name} 공개가 완료됐습니다.`,
      href: path,
      read_at: publishedAt,
      resolved_at: publishedAt,
    }).eq("id", access.invitation.notification_id).eq("user_id", access.user.id);
  }
  ["/", "/partners", "/communities", "/sitemap.xml", "/my", "/admin/inquiries", path].forEach((item) => revalidatePath(item));
  return { ok: true, path };
}
