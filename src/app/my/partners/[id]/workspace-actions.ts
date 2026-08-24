"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";

export type PartnerMemberRole = "manager" | "editor" | "viewer";
type Result = { ok: true; message: string; url?: string } | { ok: false; error: string };

async function ownerAccess(partnerId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();
  if (!user || !admin) return null;
  const { data: partner } = await admin.from("partners").select("id,name,owner_user_id").eq("id", partnerId).maybeSingle();
  if (!partner || partner.owner_user_id !== user.id) return null;
  return { admin, user, partner };
}

function refresh(partnerId: string) {
  ["/my", "/my/partners", `/my/partners/${partnerId}`, "/my/communities", "/my/jobs"].forEach((path) => revalidatePath(path));
}

export async function invitePartnerMember(partnerId: string, emailInput: string, role: PartnerMemberRole): Promise<Result> {
  const access = await ownerAccess(partnerId);
  if (!access) return { ok: false, error: "회사 대표만 팀원을 초대할 수 있습니다." };
  const email = emailInput.trim().toLowerCase().slice(0, 254);
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "초대할 이메일을 확인해주세요." };
  if (!(["manager", "editor", "viewer"] as string[]).includes(role)) return { ok: false, error: "팀원 권한을 확인해주세요." };
  if (email === access.user.email?.toLowerCase()) return { ok: false, error: "본인 계정은 이미 회사 대표입니다." };
  const { data: profile } = await access.admin.from("profiles").select("id,email").ilike("email", email).maybeSingle();
  if (profile) {
    const { data: member } = await access.admin.from("partner_members").select("user_id").eq("partner_id", partnerId).eq("user_id", profile.id).maybeSingle();
    if (member) return { ok: false, error: "이미 회사 팀에 참여 중인 계정입니다." };
  }
  await access.admin.from("partner_invitations").delete().eq("partner_id", partnerId).ilike("invitee_email", email).eq("status", "pending");
  const { data: invitation, error } = await access.admin.from("partner_invitations").insert({ partner_id: partnerId, invitee_user_id: profile?.id ?? null, invitee_email: email, member_role: role, invited_by: access.user.id }).select("id,token").single();
  if (error || !invitation) return { ok: false, error: "팀 초대를 만들지 못했습니다." };
  const url = `${SITE_URL}/invite/partner/${invitation.token}`;
  if (profile) await access.admin.from("notifications").insert({ user_id: profile.id, actor_id: access.user.id, type: "system", title: `${access.partner.name} 팀 초대`, message: "회사 워크스페이스와 소속 커뮤니티를 함께 관리하도록 초대받았습니다.", href: `/invite/partner/${invitation.token}`, data: { kind: "partner_team_invite", partner_id: partnerId, partner_name: access.partner.name, role } });
  refresh(partnerId);
  return { ok: true, message: profile ? "사이트 알림과 초대 링크를 만들었습니다." : "가입 후 사용할 수 있는 초대 링크를 만들었습니다.", url };
}

export async function cancelPartnerInvitation(partnerId: string, invitationId: string): Promise<Result> {
  const access = await ownerAccess(partnerId);
  if (!access) return { ok: false, error: "회사 대표만 초대를 취소할 수 있습니다." };
  await access.admin.from("partner_invitations").delete().eq("id", invitationId).eq("partner_id", partnerId).eq("status", "pending");
  refresh(partnerId);
  return { ok: true, message: "초대를 취소했습니다." };
}

export async function updatePartnerMemberRole(partnerId: string, userId: string, role: PartnerMemberRole): Promise<Result> {
  const access = await ownerAccess(partnerId);
  if (!access) return { ok: false, error: "회사 대표만 권한을 변경할 수 있습니다." };
  if (!(["manager", "editor", "viewer"] as string[]).includes(role)) return { ok: false, error: "팀원 권한을 확인해주세요." };
  const { error } = await access.admin.from("partner_members").update({ member_role: role }).eq("partner_id", partnerId).eq("user_id", userId);
  if (error) return { ok: false, error: "팀원 권한을 변경하지 못했습니다." };
  refresh(partnerId);
  return { ok: true, message: "팀원 권한을 변경했습니다." };
}

export async function removePartnerMember(partnerId: string, userId: string): Promise<Result> {
  const access = await ownerAccess(partnerId);
  if (!access) return { ok: false, error: "회사 대표만 팀원을 내보낼 수 있습니다." };
  const { error } = await access.admin.from("partner_members").delete().eq("partner_id", partnerId).eq("user_id", userId);
  if (error) return { ok: false, error: "팀원을 내보내지 못했습니다." };
  refresh(partnerId);
  return { ok: true, message: "팀원을 회사 팀에서 내보냈습니다." };
}

export async function linkPartnerCommunity(partnerId: string, communityId: string): Promise<Result> {
  const access = await ownerAccess(partnerId);
  if (!access) return { ok: false, error: "회사 대표만 커뮤니티를 연결할 수 있습니다." };
  const { data: community } = await access.admin.from("communities").select("id").eq("id", communityId).eq("manager_user_id", access.user.id).maybeSingle();
  if (!community) return { ok: false, error: "내가 대표 운영자인 커뮤니티만 회사에 연결할 수 있습니다." };
  const { error } = await access.admin.from("communities").update({ partner_id: partnerId }).eq("id", community.id);
  if (error) return { ok: false, error: "커뮤니티를 회사에 연결하지 못했습니다." };
  refresh(partnerId);
  return { ok: true, message: "커뮤니티를 회사 워크스페이스에 연결했습니다." };
}

export async function unlinkPartnerCommunity(partnerId: string, communityId: string): Promise<Result> {
  const access = await ownerAccess(partnerId);
  if (!access) return { ok: false, error: "회사 대표만 커뮤니티 연결을 해제할 수 있습니다." };
  const { error } = await access.admin.from("communities").update({ partner_id: null }).eq("id", communityId).eq("partner_id", partnerId);
  if (error) return { ok: false, error: "커뮤니티 연결을 해제하지 못했습니다." };
  refresh(partnerId);
  return { ok: true, message: "커뮤니티 연결을 해제했습니다." };
}
