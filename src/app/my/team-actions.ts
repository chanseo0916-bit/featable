"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";
import { ensurePublishingInvitationsForUser } from "@/lib/publishing-invitations";

export type InviteResult = { ok: true; url: string } | { ok: false; error: string };
export type TeamProfileResult = { ok: true } | { ok: false; error: string };
export type TeamManagementResult = { ok: true } | { ok: false; error: string };
export type BrandMemberRole = "editor" | "viewer";

export interface InviteCandidate {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  headline: string | null;
  memberType: string | null;
}

export interface SiteNotification {
  id: string;
  invitationId: string | null;
  type: "team_invite" | "system";
  title: string;
  message: string;
  href: string | null;
  data: { brand_name?: string; member_role?: BrandMemberRole; kind?: string; publishing_invitation_id?: string; registration_type?: "partner" | "community"; organization?: string; post_id?: string; comment_id?: string; event_id?: string; event_slug?: string; cohost_id?: string };
  readAt: string | null;
  actionStatus: "accepted" | "declined" | null;
  createdAt: string;
}

export interface TeamProfileInput {
  brandId: string;
  displayName: string;
  title: string;
  bio: string;
  avatarUrl: string;
  isPublic: boolean;
}

export async function createBrandInvitation(brandId: string, emailInput: string, memberRole: BrandMemberRole = "editor"): Promise<InviteResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const email = emailInput.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "초대할 이메일을 확인해주세요." };
  if (email === user.email?.toLowerCase()) return { ok: false, error: "본인 계정은 초대할 필요가 없어요." };

  if (memberRole !== "editor" && memberRole !== "viewer") return { ok: false, error: "초대 권한을 확인해주세요." };

  const { data, error } = await supabase
    .from("brand_invitations")
    .insert({ brand_id: brandId, email, member_role: memberRole, invited_by: user.id })
    .select("token")
    .single();

  if (error || !data) return { ok: false, error: "초대 링크를 만들지 못했습니다. 권한을 확인해주세요." };
  revalidatePath("/my");
  return { ok: true, url: `${SITE_URL}/invite/${data.token}` };
}

export async function searchInviteCandidates(brandId: string, query: string): Promise<{ ok: true; members: InviteCandidate[] } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (query.trim().length < 2) return { ok: true, members: [] };

  const { data, error } = await supabase.rpc("search_brand_invite_candidates", {
    p_brand_id: brandId,
    p_query: query.trim(),
  });
  if (error) return { ok: false, error: "멤버를 검색하지 못했습니다. 최신 SQL 적용 여부를 확인해주세요." };
  const members = ((data ?? []) as { user_id: string; display_name: string; avatar_url: string | null; headline: string | null; member_type: string | null }[]).map((member) => ({
    userId: member.user_id,
    displayName: member.display_name,
    avatarUrl: member.avatar_url,
    headline: member.headline,
    memberType: member.member_type,
  }));
  return { ok: true, members };
}

export async function createInAppBrandInvitation(brandId: string, inviteeUserId: string, memberRole: BrandMemberRole): Promise<TeamManagementResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const { error } = await supabase.rpc("create_in_app_brand_invitation", {
    p_brand_id: brandId,
    p_invitee_user_id: inviteeUserId,
    p_member_role: memberRole,
  });
  if (error) {
    const message = error.message.includes("already a team member") ? "이미 참여 중인 팀원입니다." : "사이트 초대를 보내지 못했습니다.";
    return { ok: false, error: message };
  }
  revalidatePath("/my");
  return { ok: true };
}

export async function getMyNotifications(): Promise<SiteNotification[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  await ensurePublishingInvitationsForUser(user.id, user.email);
  const { data, error } = await supabase
    .from("notifications")
    .select("id,invitation_id,type,title,message,href,data,read_at,action_status,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return [];
  return ((data ?? []) as { id: string; invitation_id: string | null; type: "team_invite" | "system"; title: string; message: string; href: string | null; data: SiteNotification["data"] | null; read_at: string | null; action_status: "accepted" | "declined" | null; created_at: string }[]).map((item) => ({
    id: item.id,
    invitationId: item.invitation_id,
    type: item.type,
    title: item.title,
    message: item.message,
    href: item.href,
    data: item.data ?? {},
    readAt: item.read_at,
    actionStatus: item.action_status,
    createdAt: item.created_at,
  }));
}

export async function markNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("mark_my_notifications_read");
}

export async function respondToInAppInvitation(invitationId: string, accept: boolean): Promise<{ ok: true; brandSlug: string | null } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const { data, error } = await supabase.rpc("respond_to_brand_invitation", {
    p_invitation_id: invitationId,
    p_accept: accept,
  });
  if (error) return { ok: false, error: "초대가 만료되었거나 이미 처리되었습니다." };
  revalidatePath("/my");
  return { ok: true, brandSlug: typeof data === "string" ? data : null };
}

export async function respondToEventCohostInvitation(cohostId: string, accept: boolean): Promise<{ ok: true; eventSlug: string | null } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const { data, error } = await supabase.rpc("respond_to_event_cohost_invitation", {
    p_cohost_id: cohostId,
    p_accept: accept,
  });
  if (error) return { ok: false, error: "초대가 이미 처리됐거나 취소됐습니다." };
  const eventSlug = typeof data === "string" ? data : null;
  revalidatePath("/my/events");
  if (eventSlug) revalidatePath(`/my/events/${eventSlug}`);
  return { ok: true, eventSlug };
}

export async function acceptBrandInvitation(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/invite/${encodeURIComponent(token)}`);

  const { error } = await supabase.rpc("accept_brand_invitation", { p_token: token });
  if (error) redirect(`/invite/${encodeURIComponent(token)}?error=invalid`);

  revalidatePath("/my");
  redirect("/my?joined=1");
}

export async function updateTeamProfile(input: TeamProfileInput): Promise<TeamProfileResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const displayName = input.displayName.trim();
  const title = input.title.trim();
  if (!input.brandId || !displayName || !title) {
    return { ok: false, error: "이름과 팀 내 역할을 입력해주세요." };
  }

  const { data, error } = await supabase.rpc("update_my_brand_team_profile", {
    p_brand_id: input.brandId,
    p_display_name: displayName,
    p_title: title,
    p_bio: input.bio,
    p_avatar_url: input.avatarUrl,
    p_is_public: input.isPublic,
  });

  if (error || data !== true) return { ok: false, error: "팀 프로필을 저장하지 못했습니다. 최신 SQL 적용 여부를 확인해주세요." };
  revalidatePath("/my");
  revalidatePath(`/my/team/${input.brandId}`);
  return { ok: true };
}

export async function updateBrandMemberRole(brandId: string, memberUserId: string, role: BrandMemberRole): Promise<TeamManagementResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (role !== "editor" && role !== "viewer") return { ok: false, error: "올바르지 않은 권한입니다." };

  const { data, error } = await supabase
    .from("brand_members")
    .update({ member_role: role })
    .eq("brand_id", brandId)
    .eq("user_id", memberUserId)
    .select("user_id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "권한을 변경하지 못했습니다." };
  revalidatePath("/my");
  return { ok: true };
}

export async function removeBrandMember(brandId: string, memberUserId: string): Promise<TeamManagementResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data, error } = await supabase
    .from("brand_members")
    .delete()
    .eq("brand_id", brandId)
    .eq("user_id", memberUserId)
    .select("user_id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "팀원을 내보내지 못했습니다." };
  revalidatePath("/my");
  return { ok: true };
}

export async function moveBrandMember(brandId: string, memberUserId: string, direction: "up" | "down"): Promise<TeamManagementResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: rows, error: readError } = await supabase
    .from("brand_members")
    .select("user_id,sort_order,joined_at")
    .eq("brand_id", brandId)
    .order("sort_order", { ascending: true })
    .order("joined_at", { ascending: true });
  if (readError || !rows) return { ok: false, error: "팀 순서를 불러오지 못했습니다." };

  const index = rows.findIndex((row) => row.user_id === memberUserId);
  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || nextIndex < 0 || nextIndex >= rows.length) return { ok: true };
  const reordered = [...rows];
  [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];

  const results = await Promise.all(reordered.map((row, order) => supabase
    .from("brand_members")
    .update({ sort_order: (order + 1) * 10 })
    .eq("brand_id", brandId)
    .eq("user_id", row.user_id)));
  if (results.some((result) => result.error)) return { ok: false, error: "팀 순서를 변경하지 못했습니다." };
  revalidatePath("/my");
  return { ok: true };
}

export async function cancelBrandInvitation(invitationId: string): Promise<TeamManagementResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data, error } = await supabase
    .from("brand_invitations")
    .delete()
    .eq("id", invitationId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "초대를 취소하지 못했습니다." };
  revalidatePath("/my");
  return { ok: true };
}
