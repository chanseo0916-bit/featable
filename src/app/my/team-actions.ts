"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";

export type InviteResult = { ok: true; url: string } | { ok: false; error: string };
export type TeamProfileResult = { ok: true } | { ok: false; error: string };
export type TeamManagementResult = { ok: true } | { ok: false; error: string };
export type BrandMemberRole = "editor" | "viewer";

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
