"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";

export type InviteResult = { ok: true; url: string } | { ok: false; error: string };
export type TeamProfileResult = { ok: true } | { ok: false; error: string };

export interface TeamProfileInput {
  brandId: string;
  displayName: string;
  title: string;
  bio: string;
  avatarUrl: string;
  isPublic: boolean;
}

export async function createBrandInvitation(brandId: string, emailInput: string): Promise<InviteResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const email = emailInput.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "초대할 이메일을 확인해주세요." };
  if (email === user.email?.toLowerCase()) return { ok: false, error: "본인 계정은 초대할 필요가 없어요." };

  const { data, error } = await supabase
    .from("brand_invitations")
    .insert({ brand_id: brandId, email, member_role: "editor", invited_by: user.id })
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
